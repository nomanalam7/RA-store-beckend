const express = require("express");
const {
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
} = require("../controllers/productController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// Public
router.get("/", listProducts);
router.get("/new-arrivals", getNewArrivals);
router.get("/top-selling", getTopSelling);
router.get("/featured", getFeaturedProducts);
router.get("/slug/:slug", getProductBySlug);

// Admin
router.get("/admin/all", authenticate, authorizeAdmin, adminListProducts);
router.get("/:id", authenticate, authorizeAdmin, getProductById);
router.post("/", authenticate, authorizeAdmin, createProduct);
router.put("/:id", authenticate, authorizeAdmin, updateProduct);
router.delete("/:id", authenticate, authorizeAdmin, deleteProduct);

module.exports = router;
