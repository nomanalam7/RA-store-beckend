const mongoose = require("mongoose");

// Price snapshot at purchase time — never re-read live product prices for placed orders
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    slug: { type: String, default: "" },
    image: { type: String, default: "" },
    size: { type: String, default: "" },
    price: { type: Number, required: true }, // original price snapshot
    salePrice: { type: Number, default: null }, // sale price snapshot (if any)
    unitPrice: { type: Number, required: true }, // price actually charged per unit
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true }, // unitPrice * quantity
  },
  { _id: false }
);

// Status history entry — tracks every status change for timeline display
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: "" },
    changedBy: {
      type: String,
      enum: ["customer", "admin", "system"],
      default: "admin",
    },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, default: "" },
      city: { type: String, required: true },
      address: { type: String, required: true },
      notes: { type: String, default: "" },
    },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryCharges: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["cod"], default: "cod" },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    // Status change history for order tracking timeline
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    // Delivery estimate snapshot at order time
    deliveryEstimate: {
      min: { type: Number, default: 3 },
      max: { type: Number, default: 7 },
    },
    // Guards against restoring stock twice when an order is cancelled
    stockRestored: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);