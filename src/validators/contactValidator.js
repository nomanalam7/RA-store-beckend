const Joi = require("joi");

const createContactSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().allow("").max(20),
  message: Joi.string().trim().min(5).max(2000).required(),
});

const subscribeSchema = Joi.object({
  email: Joi.string().email().required(),
});

module.exports = { createContactSchema, subscribeSchema };
