const express = require("express");
const { login, getProfile, createAdmin } = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();
router.post("/create-admin", createAdmin);

router.post("/login", login);
router.get("/profile", authenticate, authorizeAdmin, getProfile);
module.exports = router;
    