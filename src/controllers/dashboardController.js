const Order = require("../models/order");
const Product = require("../models/product");
const { sendSuccess, sendError } = require("../utils/responseHelper");
const { buildAggregatePagination } = require("../utils/helper");

// Admin: headline stats + recent orders + top products
const getStats = async (req, res) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      totalProducts,
      revenueAgg,
      customersAgg,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Product.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.aggregate([
        { $group: { _id: "$customer.phone" } },
        { $count: "count" },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(8),
      Product.find({ salesCount: { $gt: 0 } })
        .populate("category")
        .sort({ salesCount: -1 })
        .limit(5),
    ]);

    const stats = {
      totalOrders,
      pendingOrders,
      totalProducts,
      totalRevenue: revenueAgg[0]?.total || 0,
      totalCustomers: customersAgg[0]?.count || 0,
    };

    return sendSuccess(
      res,
      { stats, recentOrders, topProducts },
      "Dashboard stats fetched"
    );
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return sendError(res, "Failed to fetch dashboard stats", 500);
  }
};

// Admin: derived customer list from COD orders (grouped by phone)
const getCustomers = async (req, res) => {
  try {
    const { page, limit, skip } = buildAggregatePagination(req);
    const results = await Order.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$customer.phone",
          name: { $first: "$customer.fullName" },
          email: { $first: "$customer.email" },
          city: { $first: "$customer.city" },
          orders: { $sum: 1 },
          totalSpent: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$total"] },
          },
          lastOrderAt: { $max: "$createdAt" },
        },
      },
      { $sort: { totalSpent: -1, lastOrderAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          metadata: [{ $count: "total" }],
        },
      },
    ]);

    const { data, pagination } = buildAggregatePagination(req, results);
    const customers = data.map((c) => ({
      phone: c._id,
      name: c.name,
      email: c.email,
      city: c.city,
      orders: c.orders,
      totalSpent: c.totalSpent,
      lastOrderAt: c.lastOrderAt,
    }));

    return sendSuccess(res, { customers, pagination }, "Customers fetched");
  } catch (err) {
    console.error("Get customers error:", err);
    return sendError(res, "Failed to fetch customers", 500);
  }
};

module.exports = { getStats, getCustomers };
