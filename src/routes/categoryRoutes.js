const express = require("express");
const {
  listCategories,
  getCategoryBySlug,
  adminListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// Public
router.get("/", listCategories);
router.get("/:slug", getCategoryBySlug);

// Admin
router.get("/admin/all", authenticate, authorizeAdmin, adminListCategories);
router.post("/", authenticate, authorizeAdmin, createCategory);
router.put("/:id", authenticate, authorizeAdmin, updateCategory);
router.delete("/:id", authenticate, authorizeAdmin, deleteCategory);

module.exports = router;
