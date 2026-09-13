const Joi = require("joi");

const str = Joi.string().allow("");

const updateSettingsSchema = Joi.object({
  general: Joi.object({
    storeName: str,
    logo: str,
    favicon: str,
    contactEmail: str,
    phone: str,
    address: str,
  }),
  social: Joi.object({
    instagram: str,
    facebook: str,
    tiktok: str,
    whatsapp: str,
  }),
  shipping: Joi.object({
    deliveryCharge: Joi.number().min(0),
    freeShippingThreshold: Joi.number().min(0),
  }),
  about: Joi.object({
    heading: str,
    description: str,
    story: str,
    mission: str,
    vision: str,
    images: Joi.array().items(Joi.string()),
  }),
  home: Joi.object({
    hero: Joi.object({
      headline: str,
      subtext: str,
      primaryCtaText: str,
      primaryCtaLink: str,
      secondaryCtaText: str,
      secondaryCtaLink: str,
      image: str,
      desktopImage: str,
      mobileImage: str,
    }),
    promo: Joi.object({
      active: Joi.boolean(),
      title: str,
      subtitle: str,
      highlight: str,
      ctaText: str,
      ctaLink: str,
      image: str,
    }),
    aboutPreview: Joi.object({
      title: str,
      text: str,
      image: str,
    }),
  }),
  whatsapp: Joi.object({
    enabled: Joi.boolean(),
    number: str,
    message: str,
    position: Joi.string().valid("bottom-right", "bottom-left"),
    showOnMobile: Joi.boolean(),
    showOnDesktop: Joi.boolean(),
  }),
  deliveryEstimate: Joi.object({
    enabled: Joi.boolean(),
    minDays: Joi.number().integer().min(1).default(3),
    maxDays: Joi.number().integer().min(1).default(7),
  }),
  restrictedWords: Joi.array().items(Joi.string()),
  footer: Joi.object({
    description: str,
    copyright: str,
  }),
}).min(1);

module.exports = { updateSettingsSchema };