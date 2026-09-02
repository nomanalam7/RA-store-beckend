const User = require("./src/models/user");
require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const exists = await User.findOne({ email: "admin@rastore.com" });
    if (exists) {
      console.log("⚠️  Admin already exists");
    } else {
      await User.create({
        name: "Admin",
        email: "admin@rastore.com",
        password: "admin123",
        role: "admin",
        isActive: true,
      });
      console.log("✅ Admin created:");
      console.log("   Email: admin@rastore.com");
      console.log("   Password: admin123");
    }
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
