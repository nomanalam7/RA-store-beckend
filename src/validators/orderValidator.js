const Joi = require("joi");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/, "object id");

const createOrderSchema = Joi.object({
  customer: Joi.object({
    fullName: Joi.string().trim().min(2).max(120).required(),
    phone: Joi.string().trim().min(6).max(20).required(),
    email: Joi.string().email().allow(""),
    city: Joi.string().trim().min(2).max(80).required(),
    address: Joi.string().trim().min(5).max(400).required(),
    notes: Joi.string().allow("").max(1000),
  }).required(),
  items: Joi.array()
    .items(
      Joi.object({
        product: objectId.required(),
        size: Joi.string().allow("").default(""),
        quantity: Joi.number().integer().min(1).max(99).required(),
      })
    )
    .min(1)
    .required(),
  paymentMethod: Joi.string().valid("cod").default("cod"),
});

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...ORDER_STATUSES)
    .required(),
});

module.exports = { createOrderSchema, updateOrderStatusSchema, ORDER_STATUSES };
