// Creates (or updates) the initial admin user from env credentials.
// Usage:  yarn seed:admin   (or)  npm run seed:admin
// Set RESET_ADMIN_PASSWORD=true to overwrite an existing admin's password.
process.env.TZ = "Asia/Riyadh";
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../core/database");
const User = require("../models/user");

const run = async () => {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || "admin@rastore.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";
  const name = process.env.ADMIN_NAME || "RA Store Admin";

  let admin = await User.findOne({ email });

  if (admin) {
    admin.role = "admin";
    admin.isActive = true;
    if (process.env.RESET_ADMIN_PASSWORD === "true") {
      admin.password = password; // hashed by the pre-save hook
      await admin.save();
      console.log(`✔ Admin password reset for ${email}`);
    } else {
      await admin.save();
      console.log(`✔ Admin already exists: ${email}`);
    }
  } else {
    admin = await User.create({ name, email, password, role: "admin", isActive: true });
    console.log(`✔ Admin created: ${email}`);
  }

  console.log("  Login with these credentials in the admin panel.");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
