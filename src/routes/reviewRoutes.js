const express = require("express");
const {
  createReview,
  getProductReviews,
  adminListReviews,
  adminGetReview,
  adminUpdateReview,
  adminDeleteReview,
} = require("../controllers/reviewController");
const { authenticate, authenticateOptional } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// Public: submit a review (auth optional — guests pass name + email)
router.post("/", authenticateOptional, createReview);

// Public: get approved reviews for a product
router.get("/product/:productId", getProductReviews);

// Admin: list all reviews with filters
router.get("/admin/all", authenticate, authorizeAdmin, adminListReviews);

// Admin: get single review
router.get("/admin/:id", authenticate, authorizeAdmin, adminGetReview);

// Admin: update review (approve, feature, respond)
router.patch("/admin/:id", authenticate, authorizeAdmin, adminUpdateReview);

// Admin: delete review
router.delete("/admin/:id", authenticate, authorizeAdmin, adminDeleteReview);

module.exports = router;