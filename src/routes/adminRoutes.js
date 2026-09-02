const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");
const { uploadImages } = require("../middleware/uploadMiddleware");

const category = require("../controllers/categoryController");
const product = require("../controllers/productController");
const order = require("../controllers/orderController");
const setting = require("../controllers/settingController");
const contact = require("../controllers/contactController");
const subscriber = require("../controllers/subscriberController");
const dashboard = require("../controllers/dashboardController");
const upload = require("../controllers/uploadController");

const router = express.Router();

// Every admin route requires a valid admin JWT
router.use(authenticate, authorizeAdmin);

// Dashboard
router.get("/dashboard", dashboard.getStats);
router.get("/customers", dashboard.getCustomers);

// Categories
router.get("/categories", category.adminListCategories);
router.post("/categories", category.createCategory);
router.put("/categories/:id", category.updateCategory);
router.delete("/categories/:id", category.deleteCategory);

// Products
router.get("/products", product.adminListProducts);
router.get("/products/:id", product.getProductById);
router.post("/products", product.createProduct);
router.put("/products/:id", product.updateProduct);
router.delete("/products/:id", product.deleteProduct);

// Orders
router.get("/orders", order.adminListOrders);
router.get("/orders/:id", order.getOrderById);
router.patch("/orders/:id/status", order.updateOrderStatus);

// Settings (CMS)
router.put("/settings", setting.updateSettings);

// Contact messages
router.get("/contacts", contact.listContacts);
router.patch("/contacts/:id/read", contact.markContactRead);
router.delete("/contacts/:id", contact.deleteContact);

// Newsletter subscribers
router.get("/subscribers", subscriber.listSubscribers);

// Image upload
router.post("/upload", uploadImages("images", 10), upload.uploadFiles);

module.exports = router;
