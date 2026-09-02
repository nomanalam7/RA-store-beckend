const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    headline: {
      type: String,
      required: true,
      trim: true,
    },
    subtext: {
      type: String,
      default: "",
    },
    ctaText: {
      type: String,
      default: "Shop Now",
    },
    ctaLink: {
      type: String,
      default: "/collection",
    },
    image: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Sort by order by default
bannerSchema.pre("find", function () {
  this.sort({ order: 1, createdAt: -1 });
});

module.exports = mongoose.model("Banner", bannerSchema);
