const Category = require("../models/category");
const Product = require("../models/product");
const { sendSuccess, sendError } = require("../utils/responseHelper");
const { schemaValidator } = require("../utils/validator");
const { generateUniqueSlug } = require("../utils/helper");
const {
  createCategorySchema,
  updateCategorySchema,
} = require("../validators/categoryValidator");

// Public: active categories only
const listCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    return sendSuccess(res, { categories }, "Categories fetched");
  } catch (err) {
    console.error("List categories error:", err);
    return sendError(res, "Failed to fetch categories", 500);
  }
};

// Public: single active category by slug
const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
      isActive: true,
    });
    if (!category) return sendError(res, "Category not found", 404);
    return sendSuccess(res, { category }, "Category fetched");
  } catch (err) {
    console.error("Get category error:", err);
    return sendError(res, "Failed to fetch category", 500);
  }
};

// Admin: all categories
const adminListCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    return sendSuccess(res, { categories }, "Categories fetched");
  } catch (err) {
    console.error("Admin list categories error:", err);
    return sendError(res, "Failed to fetch categories", 500);
  }
};

const createCategory = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, createCategorySchema);
    if (error) return sendError(res, error, 400);

    value.slug = await generateUniqueSlug(Category, value.slug || value.name);
    const category = await Category.create(value);
    return sendSuccess(res, { category }, "Category created", 201);
  } catch (err) {
    if (err.code === 11000) return sendError(res, "Category name already exists", 409);
    console.error("Create category error:", err);
    return sendError(res, "Failed to create category", 500);
  }
};

const updateCategory = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, updateCategorySchema);
    if (error) return sendError(res, error, 400);

    const category = await Category.findById(req.params.id);
    if (!category) return sendError(res, "Category not found", 404);

    if (value.slug || value.name) {
      value.slug = await generateUniqueSlug(
        Category,
        value.slug || value.name,
        category._id
      );
    }

    Object.assign(category, value);
    await category.save();
    return sendSuccess(res, { category }, "Category updated");
  } catch (err) {
    if (err.code === 11000) return sendError(res, "Category name already exists", 409);
    console.error("Update category error:", err);
    return sendError(res, "Failed to update category", 500);
  }
};

const deleteCategory = async (req, res) => {
  try {
    const productCount = await Product.countDocuments({ category: req.params.id });
    if (productCount > 0) {
      return sendError(
        res,
        `Cannot delete: ${productCount} product(s) belong to this category`,
        409
      );
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return sendError(res, "Category not found", 404);
    return sendSuccess(res, {}, "Category deleted");
  } catch (err) {
    console.error("Delete category error:", err);
    return sendError(res, "Failed to delete category", 500);
  }
};

module.exports = {
  listCategories,
  getCategoryBySlug,
  adminListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
