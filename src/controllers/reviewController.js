const Review = require("../models/review");
const Product = require("../models/product");
const Order = require("../models/order");
const User = require("../models/user");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { sendSuccess, sendError } = require("../utils/responseHelper");
const { schemaValidator } = require("../utils/validator");
const { buildAggregatePagination } = require("../utils/helper");
const { createReviewSchema, updateReviewSchema } = require("../validators/reviewValidator");
const EmailService = require("../utils/emailService");
const { getOrCreateSettings } = require("./settingController");
const ImageKit = require("imagekit");

// Server-side ImageKit client — review photos posted via multer get pushed
// straight to ImageKit as buffers (works on serverless, no local disk).
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// Public: submit a review (customer) — verified purchase check
const createReview = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, createReviewSchema);
    if (error) return sendError(res, error, 400);

    // Check if product exists and is active
    const product = await Product.findById(value.product);
    if (!product) return sendError(res, "Product not found", 404);
    if (!product.isActive) return sendError(res, "Product is not available", 400);

    // Resolve the reviewer: authenticated user, or upsert a guest user by email
    let userId = req.user?._id;
    let reviewerEmail = req.user?.email;
    if (!userId) {
      const guest = await User.findOneAndUpdate(
        { email: value.email },
        {
          $setOnInsert: {
            name: value.name,
            email: value.email,
            phone: value.phone || "",
            // Random unguessable password — this guest account can never be logged into
            password: crypto.randomBytes(24).toString("hex"),
            isActive: true,
          },
        },
        { upsert: true, new: true }
      );
      userId = guest._id;
      reviewerEmail = guest.email;

      // Guest users that were JUST created (i.e. this foundOneAndUpdate inserted)
      // mean the name came from this request — keep it in sync for display.
      await User.updateOne({ _id: guest._id }, { $set: { name: value.name } });
    }

    // Check if this reviewer already reviewed the product
    const existing = await Review.findOne({ product: value.product, user: userId });
    if (existing) return sendError(res, "You have already reviewed this product", 400);

    // Check verified purchase: reviewer has a non-cancelled order with this product
    const verifiedOrder = await Order.findOne({
      "customer.email": reviewerEmail,
      "items.product": value.product,
      status: { $ne: "cancelled" },
    });
    const isVerifiedPurchase = !!verifiedOrder;

    // Check restricted words from settings
    const settings = await getOrCreateSettings();
    const restrictedWords = settings.restrictedWords || [];
    const reviewText = `${value.title} ${value.comment}`.toLowerCase();
    const hasRestrictedWord = restrictedWords.some((word) =>
      reviewText.includes(word.toLowerCase())
    );

    // Upload any customer photo attachments to ImageKit (multer memory buffers)
    let images = [];
    if (req.files && req.files.length) {
      const results = await Promise.all(
        req.files.map((file) =>
          imagekit.upload({
            file: file.buffer,
            fileName: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "-").slice(0, 60)}`,
            folder: "/ra-store/reviews",
          })
        )
      );
      images = results.map((r) => r.url);
    }

    const review = await Review.create({
      product: value.product,
      user: userId,
      rating: value.rating,
      title: value.title || "",
      comment: value.comment,
      images,
      isVerifiedPurchase,
      isApproved: !hasRestrictedWord, // auto-approve if no restricted words
    });

    // Populate user for response
    await review.populate("user", "name email");

    // Send email notification to admin if review is created
    try {
      const adminSettings = await getOrCreateSettings();
      if (adminSettings.general?.contactEmail) {
        const emailService = new EmailService(adminSettings.general.contactEmail);
        await emailService.sendEmail(`New Review on ${product.name}`, {
          template: "new-review-admin",
          data: {
            productName: product.name,
            rating: value.rating,
            title: value.title || "",
            comment: value.comment,
            isVerified: isVerifiedPurchase,
            autoApproved: !hasRestrictedWord,
            settings: adminSettings,
          },
        });
      }
    } catch (emailErr) {
      console.error("Failed to send review notification email:", emailErr);
    }

    return sendSuccess(res, { review }, "Review submitted successfully", 201);
  } catch (err) {
    console.error("Create review error:", err);
    return sendError(res, "Failed to submit review", 500);
  }
};

// Public: get approved reviews for a product with pagination
const getProductReviews = async (req, res) => {
  try {
    const { page, limit, skip } = buildAggregatePagination(req);
    const { productId } = req.params;

    const filter = { product: productId, isApproved: true };

    // Aggregate $match needs an explicit ObjectId cast — Mongoose only casts
    // automatically for find/count, not for raw pipeline stages (which is why
    // average/distribution came back as 0 while the reviews list was fine).
    const productObjectId =
      mongoose.isValidObjectId(productId) ? new mongoose.Types.ObjectId(productId) : productId;

    const [reviews, totalCount] = await Promise.all([
      Review.find(filter)
        .populate("user", "name")
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    // Get rating distribution
    const distribution = await Review.aggregate([
      { $match: { product: productObjectId, isApproved: true } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    const ratingStats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    distribution.forEach((d) => {
      ratingStats[d._id] = d.count;
    });

    const totalReviews = await Review.countDocuments({ product: productId, isApproved: true });
    const avgResult = await Review.aggregate([
      { $match: { product: productObjectId, isApproved: true } },
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]);
    const averageRating = avgResult[0] ? Math.round(avgResult[0].avg * 10) / 10 : 0;

    const totalPages = Math.ceil(totalCount / limit);
    return sendSuccess(
      res,
      {
        reviews,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        ratingSummary: {
          average: averageRating,
          total: totalReviews,
          distribution: ratingStats,
        },
      },
      "Reviews fetched"
    );
  } catch (err) {
    console.error("Get product reviews error:", err);
    return sendError(res, "Failed to fetch reviews", 500);
  }
};

// Admin: list all reviews with filters
const adminListReviews = async (req, res) => {
  try {
    const { page, limit, skip } = buildAggregatePagination(req);
    const { status, product, rating, search } = req.query;

    const filter = {};
    if (status === "pending" || status === "rejected") filter.isApproved = false;
    if (status === "approved") filter.isApproved = true;
    if (status === "featured") filter.isFeatured = true;
    if (product) filter.product = product;
    if (rating) filter.rating = parseInt(rating, 10);
    if (search && String(search).trim()) {
      const rx = new RegExp(search.trim(), "i");
      filter.$or = [{ title: rx }, { comment: rx }];
    }

    const [reviews, totalCount] = await Promise.all([
      Review.find(filter)
        .populate("product", "name slug")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    return sendSuccess(
      res,
      {
        reviews,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Reviews fetched"
    );
  } catch (err) {
    console.error("Admin list reviews error:", err);
    return sendError(res, "Failed to fetch reviews", 500);
  }
};

// Admin: get single review
const adminGetReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("product", "name slug sku images")
      .populate("user", "name email");
    if (!review) return sendError(res, "Review not found", 404);
    return sendSuccess(res, { review }, "Review fetched");
  } catch (err) {
    console.error("Admin get review error:", err);
    return sendError(res, "Failed to fetch review", 500);
  }
};

// Admin: update review (approve, feature, respond)
const adminUpdateReview = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, updateReviewSchema);
    if (error) return sendError(res, error, 400);

    const review = await Review.findById(req.params.id);
    if (!review) return sendError(res, "Review not found", 404);

    const wasApproved = review.isApproved;

    // Handle approval
    if (value.isApproved !== undefined && value.isApproved !== review.isApproved) {
      review.isApproved = value.isApproved;
    }

    // Handle featuring
    if (value.isFeatured !== undefined) {
      review.isFeatured = value.isFeatured;
    }

    // Handle admin response (empty string clears it)
    if (value.adminResponse !== undefined) {
      review.adminResponse = value.adminResponse
        ? {
            text: value.adminResponse,
            respondedAt: new Date(),
            respondedBy: req.user._id,
          }
        : { text: "" };
    }

    await review.save();
    await review.populate("user", "name email").populate("product", "name slug");

    // If newly approved, notify customer
    if (value.isApproved === true && !wasApproved) {
      try {
        const emailService = new EmailService(review.user.email);
        await emailService.sendEmail(`Your review has been approved`, {
          template: "review-approved",
          data: {
            customerName: review.user.name,
            productName: review.product.name,
            productSlug: review.product.slug,
            settings: await getOrCreateSettings(),
          },
        });
      } catch (emailErr) {
        console.error("Failed to send approval email:", emailErr);
      }
    }

    return sendSuccess(res, { review }, "Review updated");
  } catch (err) {
    console.error("Admin update review error:", err);
    return sendError(res, "Failed to update review", 500);
  }
};

// Admin: delete review
const adminDeleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return sendError(res, "Review not found", 404);
    return sendSuccess(res, null, "Review deleted");
  } catch (err) {
    console.error("Admin delete review error:", err);
    return sendError(res, "Failed to delete review", 500);
  }
};

module.exports = {
  createReview,
  getProductReviews,
  adminListReviews,
  adminGetReview,
  adminUpdateReview,
  adminDeleteReview,
};