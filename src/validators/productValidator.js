const Joi = require("joi");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/, "object id");

// Size stock object schema
const sizeStockSchema = Joi.object({
  size: Joi.string().trim().required(),
  stock: Joi.number().integer().min(0).default(0),
});

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(140).required(),
  slug: Joi.string().trim().lowercase().allow(""),
  description: Joi.string().allow(""),
  shortDescription: Joi.string().allow(""),
  category: objectId.required(),
  price: Joi.number().min(0).required(),
  salePrice: Joi.number().min(0).allow(null),
  // Admin-only cost price for profit calculation
  costPrice: Joi.number().min(0).allow(null).default(0),
  images: Joi.array().items(Joi.string()).default([]),
  // Support both legacy String[] and new sizeStock object[]
  sizes: Joi.array().items(Joi.alternatives().try(Joi.string().trim(), sizeStockSchema)).default([]),
  stock: Joi.number().integer().min(0).default(0),
  sku: Joi.string().allow(""),
  material: Joi.string().allow(""),
  isFeatured: Joi.boolean(),
  isActive: Joi.boolean(),
}).custom((value, helpers) => {
  if (value.salePrice != null && value.salePrice >= value.price) {
    return helpers.message("salePrice must be lower than price");
  }
  // If sizeStock format used, validate sum matches stock or update stock
  if (Array.isArray(value.sizes) && value.sizes.length > 0 && typeof value.sizes[0] === "object") {
    const totalStock = value.sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
    if (value.stock === 0 || value.stock !== totalStock) {
      // Auto-calculate stock from sizeStock for convenience
      value.stock = totalStock;
    }
  }
  return value;
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(140),
  slug: Joi.string().trim().lowercase().allow(""),
  description: Joi.string().allow(""),
  shortDescription: Joi.string().allow(""),
  category: objectId,
  price: Joi.number().min(0),
  salePrice: Joi.number().min(0).allow(null),
  costPrice: Joi.number().min(0).allow(null),
  images: Joi.array().items(Joi.string()),
  sizes: Joi.array().items(Joi.alternatives().try(Joi.string().trim(), sizeStockSchema)),
  stock: Joi.number().integer().min(0),
  sku: Joi.string().allow(""),
  material: Joi.string().allow(""),
  isFeatured: Joi.boolean(),
  isActive: Joi.boolean(),
}).min(1).custom((value, helpers) => {
  // Cross-validate price/salePrice if both present
  if (value.salePrice != null && value.price != null && value.salePrice >= value.price) {
    return helpers.message("salePrice must be lower than price");
  }
  // If sizeStock format used, auto-calculate stock
  if (Array.isArray(value.sizes) && value.sizes.length > 0 && typeof value.sizes[0] === "object") {
    const totalStock = value.sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
    if (value.stock === undefined || value.stock === 0 || value.stock !== totalStock) {
      value.stock = totalStock;
    }
  }
  return value;
});

module.exports = { createProductSchema, updateProductSchema };