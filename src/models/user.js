const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false, minlength: 6 },
    phone: { type: String, trim: true, default: "" },
    // "admin" for dashboard users, "customer" reserved for future storefront accounts
    role: { type: String, enum: ["admin", "customer"], default: "customer" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password whenever it is set/changed
userSchema.pre("save", async function hashPasswordHook(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
