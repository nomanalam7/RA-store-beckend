const Joi = require("joi");

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  slug: Joi.string().trim().lowercase().allow(""),
  description: Joi.string().allow(""),
  image: Joi.string().allow(""),
  isFeatured: Joi.boolean(),
  isActive: Joi.boolean(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(80),
  slug: Joi.string().trim().lowercase().allow(""),
  description: Joi.string().allow(""),
  image: Joi.string().allow(""),
  isFeatured: Joi.boolean(),
  isActive: Joi.boolean(),
}).min(1);

module.exports = { createCategorySchema, updateCategorySchema };
