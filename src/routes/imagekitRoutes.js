const express = require("express");
const { getImageKitAuth, deleteImagekitImage } = require("../controllers/imagekitController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// Public: Get auth params for client-side uploads (token-based, short-lived)
router.get("/auth", authenticate, getImageKitAuth);

// Admin-only: Delete image from ImageKit
router.delete("/file/:fileId", authenticate, authorizeAdmin, deleteImagekitImage);

module.exports = router;
