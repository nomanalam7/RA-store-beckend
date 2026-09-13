const Banner = require("../models/banner");
const { sendSuccess, sendError } = require("../utils/responseHelper");

// Get all banners (admin — includes inactive)
const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
    return sendSuccess(res, { banners });
  } catch (err) {
    return sendError(res, err.message);
  }
};

// Get active banners (public — for website carousel)
const getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ active: true }).sort({ order: 1 });
    return sendSuccess(res, { banners });
  } catch (err) {
    return sendError(res, err.message);
  }
};

// Create banner (admin)
const createBanner = async (req, res) => {
  try {
    const {
      headline,
      subtext,
      ctaText,
      ctaLink,
      image,
      desktopImage,
      mobileImage,
      active,
      order,
    } = req.body;
    if (!headline) return sendError(res, "Headline is required", 400);

    const banner = await Banner.create({
      headline,
      subtext: subtext || "",
      ctaText: ctaText || "Shop Now",
      ctaLink: ctaLink || "/collections",
      image: image || "",
      desktopImage: desktopImage || "",
      mobileImage: mobileImage || "",
      active: active !== false,
      order: order || 0,
    });

    return sendSuccess(res, { banner }, "Banner created", 201);
  } catch (err) {
    return sendError(res, err.message);
  }
};

// Update banner (admin)
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.updatedAt;

    const banner = await Banner.findByIdAndUpdate(id, updates, { new: true });
    if (!banner) return sendError(res, "Banner not found", 404);

    return sendSuccess(res, { banner }, "Banner updated");
  } catch (err) {
    return sendError(res, err.message);
  }
};

// Delete banner (admin)
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) return sendError(res, "Banner not found", 404);

    return sendSuccess(res, null, "Banner deleted");
  } catch (err) {
    return sendError(res, err.message);
  }
};

// Reorder banners (admin)
const reorderBanners = async (req, res) => {
  try {
    const { orders } = req.body; // [{ id, order }]
    if (!Array.isArray(orders)) return sendError(res, "Invalid orders data", 400);

    await Promise.all(
      orders.map(({ id, order }) =>
        Banner.findByIdAndUpdate(id, { order })
      )
    );

    return sendSuccess(res, null, "Banners reordered");
  } catch (err) {
    return sendError(res, err.message);
  }
};

module.exports = {
  getAllBanners,
  getActiveBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
};
