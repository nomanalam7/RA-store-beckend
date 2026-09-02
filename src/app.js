require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./core/database");
const routes = require("./routes/routes");

const app = express();
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve uploaded images statically
app.use("/uploads", express.static(require("path").join(__dirname, "..", "uploads")));

// Serve uploaded product/category images
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.get("/api/test", (req, res) => {
  res.send({ message: "API is working!" });
});

app.use("/api", routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`${err.message} - ${req.method} ${req.originalUrl}`);

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request payload too large. Try splitting the import into smaller batches.",
    });
  }

  res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
});

module.exports = app;