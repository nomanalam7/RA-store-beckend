const Order = require("../models/order");
const Product = require("../models/product");
const User = require("../models/user");
const { sendSuccess, sendError } = require("../utils/responseHelper");
const { schemaValidator } = require("../utils/validator");
const { buildAggregatePagination, generateOrderNumber } = require("../utils/helper");
const { getOrCreateSettings } = require("./settingController");
const {
  createOrderSchema,
  updateOrderStatusSchema,
} = require("../validators/orderValidator");
const EmailService = require("../utils/emailService");

// Helper to format currency
const fmt = (n) => (Number(n) || 0).toLocaleString();

// Public: place a COD order — validates stock, snapshots prices, decrements stock, increments salesCount
const createOrder = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, createOrderSchema);
    if (error) return sendError(res, error, 400);

    // Fetch products with stock check
    const productIds = value.items.map((it) => it.product);
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      return sendError(res, "One or more products not found", 404);
    }

    const productMap = new Map(products.map((p) => [String(p._id), p]));
    const orderItems = [];
    let subtotal = 0;

    // Build items with price snapshot + validate stock
    for (const item of value.items) {
      const product = productMap.get(String(item.product));
      if (!product.isActive) {
        return sendError(res, `Product "${product.name}" is not available`, 400);
      }

      // Check stock - support both sizeStock and legacy global stock
      let availableStock;
      if (product.usesSizeStock && item.size) {
        availableStock = product.getSizeStock(item.size);
      } else {
        availableStock = product.stock;
      }

      if (availableStock < item.quantity) {
        return sendError(
          res,
          `Insufficient stock for "${product.name}" (available: ${availableStock})`,
          400
        );
      }

      const unitPrice = product.salePrice ?? product.price;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0] || "",
        size: item.size || "",
        price: product.price,
        salePrice: product.salePrice,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
      });
    }

    const settings = await getOrCreateSettings();
    const { deliveryCharge = 0, freeShippingThreshold = 0 } = settings.shipping;
    // Apply free shipping when enabled and the subtotal meets the threshold
    const deliveryCharges =
      freeShippingThreshold > 0 && subtotal >= freeShippingThreshold
        ? 0
        : deliveryCharge || 0;
    const total = subtotal + deliveryCharges;

    // Get delivery estimate from settings
    const deliveryEstimate = settings.deliveryEstimate || { minDays: 3, maxDays: 7 };

    const orderNumber = generateOrderNumber();
    const order = await Order.create({
      orderNumber,
      customer: value.customer,
      items: orderItems,
      subtotal,
      deliveryCharges,
      total,
      paymentMethod: value.paymentMethod || "cod",
      // Initialize status history
      statusHistory: [{ status: "pending", note: "Order placed", changedBy: "customer" }],
      // Snapshot delivery estimate at order time
      deliveryEstimate: {
        min: deliveryEstimate.minDays || 3,
        max: deliveryEstimate.maxDays || 7,
      },
    });

    // Decrement stock + increment salesCount (supports sizeStock)
    await Promise.all(
      value.items.map((item) => {
        const product = productMap.get(String(item.product));
        if (product.usesSizeStock && item.size) {
          return product.decrementSizeStock(item.size, item.quantity);
        } else {
          return Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity, salesCount: item.quantity },
          });
        }
      })
    );

    // Send admin notification email
    try {
      const adminSettings = await getOrCreateSettings();
      if (adminSettings.general?.contactEmail) {
        const emailService = new EmailService(adminSettings.general.contactEmail);
        await emailService.sendEmail(`New Order #${orderNumber}`, {
          template: "new-order-admin",
          data: {
            orderNumber,
            customer: value.customer,
            itemsCount: orderItems.length,
            total,
            settings: adminSettings,
          },
        });
      }
    } catch (emailErr) {
      console.error("Failed to send admin order notification:", emailErr);
    }

    // Send customer confirmation email
    try {
      if (value.customer.email) {
        const emailService = new EmailService(value.customer.email);
        await emailService.sendEmail(`Order Confirmed #${orderNumber}`, {
          template: "order-confirmation",
          data: {
            order: {
              orderNumber,
              subtotal,
              discount: 0,
              deliveryCharges,
              total,
              deliveryEstimate: { min: deliveryEstimate.minDays || 3, max: deliveryEstimate.maxDays || 7 },
              createdAt: new Date(),
              items: orderItems,
            },
            customer: value.customer,
            settings,
          },
        });
      }
    } catch (emailErr) {
      console.error("Failed to send customer order confirmation:", emailErr);
    }

    return sendSuccess(res, { order }, "Order placed successfully", 201);
  } catch (err) {
    console.error("Create order error:", err);
    return sendError(res, "Failed to place order", 500);
  }
};

// Admin: list orders with optional status/date filters
const listOrders = async (req, res) => {
  try {
    const { page, limit, skip } = buildAggregatePagination(req);
    const { status, startDate, endDate } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [orders, totalCount] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    return sendSuccess(
      res,
      {
        orders,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Orders fetched"
    );
  } catch (err) {
    console.error("List orders error:", err);
    return sendError(res, "Failed to fetch orders", 500);
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return sendError(res, "Order not found", 404);
    return sendSuccess(res, { order }, "Order fetched");
  } catch (err) {
    console.error("Get order error:", err);
    return sendError(res, "Failed to fetch order", 500);
  }
};

// Public: customer order lookup by orderNumber
const getOrderByNumber = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) return sendError(res, "Order not found", 404);
    return sendSuccess(res, { order }, "Order fetched");
  } catch (err) {
    console.error("Get order by number error:", err);
    return sendError(res, "Failed to fetch order", 500);
  }
};

// Public: order lookup by order number only (for tracking page).
// An order number is unique + non-sequential, so it is the only credential
// a customer needs to view status — no phone prompt required.
const lookupOrder = async (req, res) => {
  try {
    const { orderNumber } = req.body;
    if (!orderNumber || !orderNumber.trim()) {
      return sendError(res, "Order number is required", 400);
    }
    const order = await Order.findOne({ orderNumber: orderNumber.trim() });
    if (!order) return sendError(res, "Order not found", 404);
    return sendSuccess(res, { order }, "Order fetched");
  } catch (err) {
    console.error("Lookup order error:", err);
    return sendError(res, "Failed to fetch order", 500);
  }
};

// Admin: update order status — restores stock on cancel (once), tracks history, sends email
const updateOrderStatus = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, updateOrderStatusSchema);
    if (error) return sendError(res, error, 400);

    const order = await Order.findById(req.params.id);
    if (!order) return sendError(res, "Order not found", 404);

    const oldStatus = order.status;
    const newStatus = value.status;

    // Prevent invalid transitions (optional but helpful)
    const validTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "cancelled"],
      delivered: [],
      cancelled: [],
    };

    if (validTransitions[oldStatus] && !validTransitions[oldStatus].includes(newStatus)) {
      return sendError(res, `Cannot change status from ${oldStatus} to ${newStatus}`, 400);
    }

    order.status = newStatus;

    // Add to status history
    order.statusHistory.push({
      status: newStatus,
      note: value.note || `Status changed from ${oldStatus} to ${newStatus}`,
      changedBy: "admin",
    });

    // Restore stock once when an order is first moved to cancelled
    if (
      newStatus === "cancelled" &&
      oldStatus !== "cancelled" &&
      !order.stockRestored
    ) {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          if (product.usesSizeStock && item.size) {
            await product.incrementSizeStock(item.size, item.quantity);
          } else {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { stock: item.quantity, salesCount: -item.quantity },
            });
          }
        }
      }
      order.stockRestored = true;
    }

    await order.save();

    // Send customer status change email
    try {
      if (order.customer.email) {
        const emailSettings = await getOrCreateSettings();
        const emailService = new EmailService(order.customer.email);
        const statusLabel = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
        await emailService.sendEmail(`Order #${order.orderNumber} Status Update: ${statusLabel}`, {
          template: "order-status-update",
          data: {
            order: {
              orderNumber: order.orderNumber,
              status: newStatus,
              total: order.total,
              deliveryEstimate: order.deliveryEstimate,
            },
            customer: order.customer,
            note: value.note || "",
            statusLabel,
            settings: emailSettings,
          },
        });

        // When an order is delivered, send a separate review-request email so
        // the customer has a direct "Write a Review" CTA per item.
        if (newStatus === "delivered") {
          const reviewEmailService = new EmailService(order.customer.email);
          await reviewEmailService.sendEmail(
            `How was your order #${order.orderNumber}? Share your review!`,
            {
              template: "review-request",
              data: {
                order: { orderNumber: order.orderNumber },
                customer: order.customer,
                items: order.items,
                settings: emailSettings,
              },
            }
          );
        }
      }
    } catch (emailErr) {
      console.error("Failed to send status change email:", emailErr);
    }

    return sendSuccess(res, { order }, "Order status updated");
  } catch (err) {
    console.error("Update order status error:", err);
    return sendError(res, "Failed to update order status", 500);
  }
};

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  getOrderByNumber,
  lookupOrder,
  updateOrderStatus,
};