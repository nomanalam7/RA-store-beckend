const mongoose = require("mongoose");

// Single-document CMS store for all admin-managed site content.
const settingSchema = new mongoose.Schema(
  {
    // Marks the singleton row so getSettings() can upsert reliably
    key: { type: String, default: "site", unique: true },

    general: {
      storeName: { type: String, default: "RA STORE" },
      logo: { type: String, default: "" },
      favicon: { type: String, default: "" },
      contactEmail: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
    },

    social: {
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
    },

    shipping: {
      deliveryCharge: { type: Number, default: 200 },
      freeShippingThreshold: { type: Number, default: 0 }, // 0 = disabled
    },

    about: {
      heading: { type: String, default: "About RA STORE" },
      description: { type: String, default: "" },
      story: { type: String, default: "" },
      mission: { type: String, default: "" },
      vision: { type: String, default: "" },
      images: { type: [String], default: [] },
    },

    home: {
      hero: {
        headline: { type: String, default: "Wear The Statement" },
        subtext: { type: String, default: "" },
        primaryCtaText: { type: String, default: "Shop Now" },
        primaryCtaLink: { type: String, default: "/collection" },
        secondaryCtaText: { type: String, default: "Explore Collection" },
        secondaryCtaLink: { type: String, default: "/collection" },
        image: { type: String, default: "" },
      },
      promo: {
        active: { type: Boolean, default: false },
        title: { type: String, default: "" },
        subtitle: { type: String, default: "" },
        highlight: { type: String, default: "" }, // e.g. "Up To 40% Off"
        ctaText: { type: String, default: "Shop Sale" },
        ctaLink: { type: String, default: "/collection?sale=true" },
        image: { type: String, default: "" },
      },
      aboutPreview: {
        title: { type: String, default: "Our Story" },
        text: { type: String, default: "" },
        image: { type: String, default: "" },
      },
    },

    footer: {
      description: { type: String, default: "" },
      copyright: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
