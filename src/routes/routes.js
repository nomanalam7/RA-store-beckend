const express = require("express");
const authRoutes = require("./authRoutes");
const categoryRoutes = require("./categoryRoutes");
const productRoutes = require("./productRoutes");
const orderRoutes = require("./orderRoutes");
const contactRoutes = require("./contactRoutes");
const subscriberRoutes = require("./subscriberRoutes");
const settingRoutes = require("./settingRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const uploadRoutes = require("./uploadRoutes");
const imagekitRoutes = require("./imagekitRoutes");
const bannerRoutes = require("./bannerRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/contact", contactRoutes);
router.use("/subscribers", subscriberRoutes);
router.use("/settings", settingRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/upload", uploadRoutes);
router.use("/imagekit", imagekitRoutes);
router.use("/banners", bannerRoutes);

module.exports = router;
