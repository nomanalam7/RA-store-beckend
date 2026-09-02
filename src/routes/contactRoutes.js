const express = require("express");
const {
  createContact,
  listContacts,
  markContactRead,
  deleteContact,
} = require("../controllers/contactController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// Public
router.post("/", createContact);

// Admin
router.get("/", authenticate, authorizeAdmin, listContacts);
router.patch("/:id/read", authenticate, authorizeAdmin, markContactRead);
router.delete("/:id", authenticate, authorizeAdmin, deleteContact);

module.exports = router;
