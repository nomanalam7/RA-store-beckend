const Joi = require("joi");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/, "object id");

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(140).required(),
  slug: Joi.string().trim().lowercase().allow(""),
  description: Joi.string().allow(""),
  shortDescription: Joi.string().allow(""),
  category: objectId.required(),
  price: Joi.number().min(0).required(),
  salePrice: Joi.number().min(0).allow(null),
  images: Joi.array().items(Joi.string()).default([]),
  sizes: Joi.array().items(Joi.string().trim()).default([]),
  stock: Joi.number().integer().min(0).default(0),
  sku: Joi.string().allow(""),
  material: Joi.string().allow(""),
  isFeatured: Joi.boolean(),
  isActive: Joi.boolean(),
}).custom((value, helpers) => {
  if (value.salePrice != null && value.salePrice >= value.price) {
    return helpers.message("salePrice must be lower than price");
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
  images: Joi.array().items(Joi.string()),
  sizes: Joi.array().items(Joi.string().trim()),
  stock: Joi.number().integer().min(0),
  sku: Joi.string().allow(""),
  material: Joi.string().allow(""),
  isFeatured: Joi.boolean(),
  isActive: Joi.boolean(),
}).min(1);

module.exports = { createProductSchema, updateProductSchema };
