const Product = require("../models/product");
const Category = require("../models/category");
const Review = require("../models/review");
const Order = require("../models/order");
const { sendSuccess, sendError } = require("../utils/responseHelper");
const { schemaValidator } = require("../utils/validator");
const {
  buildAggregatePagination,
  escapeRegex,
  generateUniqueSlug,
} = require("../utils/helper");
const {
  createProductSchema,
  updateProductSchema,
} = require("../validators/productValidator");

const emptyPagination = (page, limit) => ({
  page,
  limit,
  totalCount: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
});

// Computed pricing fields added inside aggregation (mirror the model virtuals)
const PRICING_FIELDS = {
  effectivePrice: { $ifNull: ["$salePrice", "$price"] },
  onSale: {
    $and: [{ $ne: ["$salePrice", null] }, { $lt: ["$salePrice", "$price"] }],
  },
  discountPercentage: {
    $cond: [
      { $and: [{ $ne: ["$salePrice", null] }, { $lt: ["$salePrice", "$price"] }] },
      {
        $round: [
          {
            $multiply: [
              { $divide: [{ $subtract: ["$price", "$salePrice"] }, "$price"] },
              100,
            ],
          },
          0,
        ],
      },
      0,
    ],
  },
  inStock: { $gt: ["$stock", 0] },
  usesSizeStock: {
    $and: [
      { $isArray: "$sizes" },
      { $gt: [{ $size: "$sizes" }, 0] },
      { $eq: [{ $type: { $arrayElemAt: ["$sizes", 0] } }, "object"] },
    ],
  },
  availableStock: {
    $cond: {
      if: {
        $and: [
          { $isArray: "$sizes" },
          { $gt: [{ $size: "$sizes" }, 0] },
          { $eq: [{ $type: { $arrayElemAt: ["$sizes", 0] } }, "object"] },
        ],
      },
      then: {
        $reduce: {
          input: "$sizes",
          initialValue: 0,
          in: { $add: ["$$value", { $ifNull: ["$$this.stock", 0] }] },
        },
      },
      else: "$stock",
    },
  },
};

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { effectivePrice: 1 },
  price_desc: { effectivePrice: -1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  best_selling: { salesCount: -1, createdAt: -1 },
};

// Public: rich product listing with filtering, sorting, pagination
const listProducts = async (req, res) => {
  try {
    const { page, limit, skip } = buildAggregatePagination(req);
    const {
      category,
      size,
      minPrice,
      maxPrice,
      availability,
      sale,
      search,
      sort = "newest",
    } = req.query;

    const match = { isActive: true };

    if (category) {
      const cat = await Category.findOne({ slug: category }).select("_id");
      if (!cat) {
        return sendSuccess(
          res,
          { products: [], pagination: emptyPagination(page, limit) },
          "Products fetched"
        );
      }
      match.category = cat._id;
    }

    if (size) {
      const sizes = String(size)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (sizes.length) match.sizes = { $in: sizes };
    }

    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegex(String(search).trim()), "i");
      match.$or = [
        { name: rx },
        { shortDescription: rx },
        { description: rx },
        { sku: rx },
      ];
    }

    const postMatch = {};
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (minPrice !== undefined && minPrice !== "" && !Number.isNaN(min)) {
      postMatch.effectivePrice = { ...(postMatch.effectivePrice || {}), $gte: min };
    }
    if (maxPrice !== undefined && maxPrice !== "" && !Number.isNaN(max)) {
      postMatch.effectivePrice = { ...(postMatch.effectivePrice || {}), $lte: max };
    }
    if (availability === "in-stock") postMatch.inStock = true;
    if (availability === "out-of-stock") postMatch.inStock = false;
    if (sale === "true") postMatch.onSale = true;

    const sortStage = SORT_MAP[sort] || SORT_MAP.newest;

    const pipeline = [{ $match: match }, { $addFields: PRICING_FIELDS }];
    if (Object.keys(postMatch).length) pipeline.push({ $match: postMatch });
    pipeline.push(
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $sort: sortStage },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          metadata: [{ $count: "total" }],
        },
      }
    );

    const results = await Product.aggregate(pipeline);
    const { data, pagination } = buildAggregatePagination(req, results);
    return sendSuccess(res, { products: data, pagination }, "Products fetched");
  } catch (err) {
    console.error("List products error:", err);
    return sendError(res, "Failed to fetch products", 500);
  }
};

// Public: single product by slug + related products (same category)
const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    }).populate("category");
    if (!product) return sendError(res, "Product not found", 404);

    const related = await Product.find({
      category: product.category?._id || product.category,
      _id: { $ne: product._id },
      isActive: true,
    })
      .populate("category")
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(8);

    return sendSuccess(res, { product, related }, "Product fetched");
  } catch (err) {
    console.error("Get product error:", err);
    return sendError(res, "Failed to fetch product", 500);
  }
};

const getLimit = (req, fallback = 8) =>
  Math.min(Math.max(parseInt(req.query.limit, 10) || fallback, 1), 50);

// Public: latest active products
const getNewArrivals = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate("category")
      .sort({ createdAt: -1 })
      .limit(getLimit(req));
    return sendSuccess(res, { products }, "New arrivals fetched");
  } catch (err) {
    console.error("New arrivals error:", err);
    return sendError(res, "Failed to fetch new arrivals", 500);
  }
};

// Public: best sellers by units sold
const getTopSelling = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate("category")
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(getLimit(req));
    return sendSuccess(res, { products }, "Top selling fetched");
  } catch (err) {
    console.error("Top selling error:", err);
    return sendError(res, "Failed to fetch top selling products", 500);
  }
};

// Public: featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .populate("category")
      .sort({ createdAt: -1 })
      .limit(getLimit(req));
    return sendSuccess(res, { products }, "Featured products fetched");
  } catch (err) {
    console.error("Featured products error:", err);
    return sendError(res, "Failed to fetch featured products", 500);
  }
};

// Admin: full product list with search / category / status filters
const adminListProducts = async (req, res) => {
  try {
    const { page, limit, skip } = buildAggregatePagination(req);
    const { search, category, status } = req.query;

    const filter = {};
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (category) filter.category = category;
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegex(String(search).trim()), "i");
      filter.$or = [{ name: rx }, { sku: rx }];
    }

    const [products, totalCount] = await Promise.all([
      Product.find(filter)
        .select("+costPrice")
        .populate("category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    return sendSuccess(
      res,
      {
        products,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Products fetched"
    );
  } catch (err) {
    console.error("Admin list products error:", err);
    return sendError(res, "Failed to fetch products", 500);
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .select("+costPrice")
      .populate("category");
    if (!product) return sendError(res, "Product not found", 404);
    return sendSuccess(res, { product }, "Product fetched");
  } catch (err) {
    console.error("Get product by id error:", err);
    return sendError(res, "Failed to fetch product", 500);
  }
};

const createProduct = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, createProductSchema);
    if (error) return sendError(res, error, 400);

    const category = await Category.findById(value.category);
    if (!category) return sendError(res, "Selected category does not exist", 400);

    value.slug = await generateUniqueSlug(Product, value.slug || value.name);
    const created = await Product.create(value);
    const product = await Product.findById(created._id)
      .select("+costPrice")
      .populate("category");
    return sendSuccess(res, { product }, "Product created", 201);
  } catch (err) {
    console.error("Create product error:", err);
    return sendError(res, "Failed to create product", 500);
  }
};

const updateProduct = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, updateProductSchema);
    if (error) return sendError(res, error, 400);

    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, "Product not found", 404);

    if (value.category) {
      const category = await Category.findById(value.category);
      if (!category) return sendError(res, "Selected category does not exist", 400);
    }

    // Cross-validate price/salePrice even when only one of them is sent
    const nextPrice = value.price ?? product.price;
    const nextSale =
      value.salePrice !== undefined ? value.salePrice : product.salePrice;
    if (nextSale != null && nextSale >= nextPrice) {
      return sendError(res, "salePrice must be lower than price", 400);
    }

    if (value.slug || value.name) {
      value.slug = await generateUniqueSlug(
        Product,
        value.slug || value.name,
        product._id
      );
    }

    Object.assign(product, value);
    await product.save();
    const updated = await Product.findById(product._id)
      .select("+costPrice")
      .populate("category");
    return sendSuccess(res, { product: updated }, "Product updated");
  } catch (err) {
    console.error("Update product error:", err);
    return sendError(res, "Failed to update product", 500);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return sendError(res, "Product not found", 404);
    return sendSuccess(res, {}, "Product deleted");
  } catch (err) {
    console.error("Delete product error:", err);
    return sendError(res, "Failed to delete product", 500);
  }
};

// Admin: Product analytics / detail view
const getProductAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).select("+costPrice").populate("category");
    if (!product) return sendError(res, "Product not found", 404);

    // Get order data for this product
    const orderItems = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.product": product._id, status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.lineTotal" },
          totalCost: { $sum: { $multiply: ["$items.quantity", product.costPrice || 0] } },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: "$items.lineTotal" },
        },
      },
    ]);

    const stats = orderItems[0] || {
      totalQuantity: 0,
      totalRevenue: 0,
      totalCost: 0,
      orderCount: 0,
      avgOrderValue: 0,
    };

    const profit = stats.totalRevenue - stats.totalCost;
    const profitMargin = stats.totalRevenue > 0 ? (profit / stats.totalRevenue) * 100 : 0;

    // Get reviews summary
    const reviewsSummary = await Review.aggregate([
      { $match: { product: product._id, isApproved: true } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          avgRating: { $avg: "$rating" },
          ratingDist: { $push: "$rating" },
        },
      },
    ]);

    const reviewStats = reviewsSummary[0] || { totalReviews: 0, avgRating: 0, ratingDist: [] };
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewStats.ratingDist.forEach((r) => {
      if (ratingDistribution[r] !== undefined) ratingDistribution[r]++;
    });

    // Stock per size
    const stockPerSize = product.usesSizeStock
      ? product.sizes.map((s) => ({ size: s.size, stock: s.stock }))
      : product.sizes.map((s) => ({ size: s, stock: product.stock }));

    // Recent orders for this product
    const recentOrders = await Order.find({ "items.product": product._id, status: { $ne: "cancelled" } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("orderNumber customer.fullName items status createdAt total");

    return sendSuccess(
      res,
      {
        product: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          salePrice: product.salePrice,
          costPrice: product.costPrice,
          effectivePrice: product.effectivePrice,
          stock: product.stock,
          availableStock: product.availableStock,
          usesSizeStock: product.usesSizeStock,
          sizes: product.sizes,
          stockPerSize,
          salesCount: product.salesCount,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          category: product.category,
        },
        analytics: {
          totalQuantitySold: stats.totalQuantity,
          totalRevenue: stats.totalRevenue,
          totalCost: stats.totalCost,
          profit,
          profitMargin: Math.round(profitMargin * 100) / 100,
          orderCount: stats.orderCount,
          avgOrderValue: Math.round(stats.avgOrderValue || 0),
          reviews: {
            total: reviewStats.totalReviews,
            averageRating: reviewStats.avgRating ? Math.round(reviewStats.avgRating * 10) / 10 : 0,
            distribution: ratingDistribution,
          },
          recentOrders,
        },
      },
      "Product analytics fetched"
    );
  } catch (err) {
    console.error("Product analytics error:", err);
    return sendError(res, "Failed to fetch product analytics", 500);
  }
};

module.exports = {
  listProducts,
  getProductBySlug,
  getNewArrivals,
  getTopSelling,
  getFeaturedProducts,
  adminListProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductAnalytics,
};