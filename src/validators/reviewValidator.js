const Joi = require("joi");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/, "object id");

const createReviewSchema = Joi.object({
  product: objectId.required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().trim().max(100).allow(""),
  comment: Joi.string().trim().min(10).max(2000).required(),
  // Guest submissions (no auth token): name + email identify the reviewer
  name: Joi.string().trim().min(2).max(100),
  email: Joi.string().email().lowercase().trim(),
  phone: Joi.string().trim().allow("").max(30),
}).custom((value, helpers) => {
  // If no authenticated user, a name + email are required
  const isGuest = value.name !== undefined || value.email !== undefined;
  if (isGuest && (!value.name || !value.email)) {
    return helpers.error("any.custom", {
      message: "Name and email are required for guest reviews",
    });
  }
  return value;
}, "guest review requirement");

const updateReviewSchema = Joi.object({
  isApproved: Joi.boolean(),
  isFeatured: Joi.boolean(),
  adminResponse: Joi.string().trim().max(2000).allow(""),
}).min(1);

module.exports = { createReviewSchema, updateReviewSchema };