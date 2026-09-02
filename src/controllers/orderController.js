const Order = require("../models/order");
const Product = require("../models/product");
const { sendSuccess, sendError } = require("../utils/responseHelper");
const { schemaValidator } = require("../utils/validator");
const { buildAggregatePagination, generateOrderNumber } = require("../utils/helper");
const { getOrCreateSettings } = require("./settingController");
const {
  createOrderSchema,
  updateOrderStatusSchema,
} = require("../validators/orderValidator");

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
      if (product.stock < item.quantity) {
        return sendError(
          res,
          `Insufficient stock for "${product.name}" (available: ${product.stock})`,
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

    const orderNumber = generateOrderNumber();
    const order = await Order.create({
      orderNumber,
      customer: value.customer,
      items: orderItems,
      subtotal,
      deliveryCharges,
      total,
      paymentMethod: value.paymentMethod || "cod",
    });

    // Decrement stock + increment salesCount
    await Promise.all(
      value.items.map((item) => {
        const product = productMap.get(String(item.product));
        return Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity, salesCount: item.quantity },
        });
      })
    );

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

// Admin: update order status — restores stock on cancel (once)
const updateOrderStatus = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, updateOrderStatusSchema);
    if (error) return sendError(res, error, 400);

    const order = await Order.findById(req.params.id);
    if (!order) return sendError(res, "Order not found", 404);

    const oldStatus = order.status;
    order.status = value.status;

    // Restore stock once when an order is first moved to cancelled
    if (
      value.status === "cancelled" &&
      oldStatus !== "cancelled" &&
      !order.stockRestored
    ) {
      await Promise.all(
        order.items.map((item) =>
          Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity, salesCount: -item.quantity },
          })
        )
      );
      order.stockRestored = true;
    }

    await order.save();
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
  updateOrderStatus,
};
