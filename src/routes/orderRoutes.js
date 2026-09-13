const express = require("express");
const {
  createOrder,
  listOrders,
  getOrderById,
  getOrderByNumber,
  lookupOrder,
  updateOrderStatus,
} = require("../controllers/orderController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// Public
router.post("/", createOrder);
router.get("/number/:orderNumber", getOrderByNumber);
router.post("/lookup", lookupOrder);

// Admin
router.get("/", authenticate, authorizeAdmin, listOrders);
router.get("/:id", authenticate, authorizeAdmin, getOrderById);
router.patch("/:id/status", authenticate, authorizeAdmin, updateOrderStatus);

module.exports = router;
