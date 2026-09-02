const express = require("express");
const { uploadImages, uploadController } = require("../controllers/uploadController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// Admin-only image upload (max 10 files, field: "images")
router.post(
  "/",
  authenticate,
  authorizeAdmin,
  uploadImages("images", 10),
  uploadController
);

module.exports = router;
