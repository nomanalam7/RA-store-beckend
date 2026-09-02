const express = require("express");
const {
  getAllBanners,
  getActiveBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
} = require("../controllers/bannerController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// Public: Get active banners for website carousel
router.get("/active", getActiveBanners);

// Admin: Get all banners (including inactive)
router.get("/", authenticate, authorizeAdmin, getAllBanners);

// Admin: Create banner
router.post("/", authenticate, authorizeAdmin, createBanner);

// Admin: Update banner
router.put("/:id", authenticate, authorizeAdmin, updateBanner);

// Admin: Delete banner
router.delete("/:id", authenticate, authorizeAdmin, deleteBanner);

// Admin: Reorder banners
router.patch("/reorder", authenticate, authorizeAdmin, reorderBanners);

module.exports = router;
