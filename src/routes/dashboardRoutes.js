const express = require("express");
const { getStats, getCustomers } = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/stats", authenticate, authorizeAdmin, getStats);
router.get("/customers", authenticate, authorizeAdmin, getCustomers);

module.exports = router;
