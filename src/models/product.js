const mongoose = require("mongoose");
const { slugify } = require("../utils/helper");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    price: { type: Number, required: true, min: 0 },
    // Optional discounted price; when set below `price` the product is "on sale"
    salePrice: { type: Number, default: null, min: 0 },
    images: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, trim: true, default: "" },
    material: { type: String, default: "" },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    // Maintained on order placement; powers "best selling" sort + dashboard
    salesCount: { type: Number, default: 0, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Derived pricing — never stored, always computed from price/salePrice
productSchema.virtual("onSale").get(function onSale() {
  return this.salePrice != null && this.salePrice < this.price;
});

productSchema.virtual("effectivePrice").get(function effectivePrice() {
  return this.onSale ? this.salePrice : this.price;
});

productSchema.virtual("discountPercentage").get(function discountPercentage() {
  if (!this.onSale || !this.price) return 0;
  return Math.round(((this.price - this.salePrice) / this.price) * 100);
});

productSchema.virtual("inStock").get(function inStock() {
  return this.stock > 0;
});

productSchema.pre("validate", function ensureSlug(next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

// Text index for keyword search across name / description / sku
productSchema.index({ name: "text", description: "text", sku: "text" });

module.exports = mongoose.model("Product", productSchema);
