const express = require("express");
const { subscribe, listSubscribers } = require("../controllers/subscriberController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.post("/", subscribe);
router.get("/", authenticate, authorizeAdmin, listSubscribers);

module.exports = router;
