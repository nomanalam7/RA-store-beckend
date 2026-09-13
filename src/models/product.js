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
    // Admin-only cost price for profit calculation — never exposed to customers
    costPrice: { type: Number, default: 0, min: 0, select: false },
    images: { type: [String], default: [] },
    // Legacy: array of size strings (backward compatibility)
    // New: array of objects { size: String, stock: Number }
    sizes: { type: [], default: [] },
    // Global stock (legacy) — kept for backward compatibility
    // When sizeStock is used, this is the sum of all size stocks
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

// Profit per unit (admin only — costPrice is select: false)
productSchema.virtual("profit").get(function profit() {
  if (this.costPrice == null) return 0;
  return this.effectivePrice - this.costPrice;
});

productSchema.virtual("profitMargin").get(function profitMargin() {
  if (!this.effectivePrice || this.costPrice == null) return 0;
  return Math.round((this.profit / this.effectivePrice) * 100);
});

// Check if using new sizeStock format (objects with size+stock) vs legacy String[]
productSchema.virtual("usesSizeStock").get(function usesSizeStock() {
  return Array.isArray(this.sizes) && this.sizes.length > 0 && typeof this.sizes[0] === "object";
});

// Total available stock across all sizes (for new format) or global stock (legacy)
productSchema.virtual("availableStock").get(function availableStock() {
  if (this.usesSizeStock) {
    return this.sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
  }
  return this.stock;
});

// In stock if any size has stock (new) or global stock > 0 (legacy)
productSchema.virtual("inStock").get(function inStock() {
  if (this.usesSizeStock) {
    return this.sizes.some((s) => (s.stock || 0) > 0);
  }
  return this.stock > 0;
});

// Get stock for a specific size
productSchema.methods.getSizeStock = function getSizeStock(size) {
  if (!this.usesSizeStock) return this.stock;
  const sizeObj = this.sizes.find((s) => s.size === size);
  return sizeObj ? sizeObj.stock : 0;
};

// Decrement stock for a specific size
productSchema.methods.decrementSizeStock = function decrementSizeStock(size, quantity) {
  if (!this.usesSizeStock) {
    this.stock = Math.max(0, this.stock - quantity);
    return this.save();
  }
  const sizeObj = this.sizes.find((s) => s.size === size);
  if (sizeObj) {
    sizeObj.stock = Math.max(0, sizeObj.stock - quantity);
    // Also update global stock for backward compatibility
    this.stock = this.sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
    return this.save();
  }
  return Promise.reject(new Error(`Size ${size} not found`));
};

// Increment stock for a specific size (for cancellations/returns)
productSchema.methods.incrementSizeStock = function incrementSizeStock(size, quantity) {
  if (!this.usesSizeStock) {
    this.stock += quantity;
    return this.save();
  }
  const sizeObj = this.sizes.find((s) => s.size === size);
  if (sizeObj) {
    sizeObj.stock += quantity;
    // Also update global stock for backward compatibility
    this.stock = this.sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
    return this.save();
  }
  return Promise.reject(new Error(`Size ${size} not found`));
};

productSchema.pre("validate", function ensureSlug(next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

// Text index for keyword search across name / description / sku
productSchema.index({ name: "text", description: "text", sku: "text" });

module.exports = mongoose.model("Product", productSchema);