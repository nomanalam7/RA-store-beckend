const express = require("express");
const { getSettings, updateSettings } = require("../controllers/settingController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", getSettings);
router.put("/", authenticate, authorizeAdmin, updateSettings);

module.exports = router;
