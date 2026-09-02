const User = require("../models/user");
const { sendSuccess, sendError } = require("../utils/responseHelper");
const { schemaValidator } = require("../utils/validator");
const { generateToken } = require("../utils/jwtHelper");
const { loginSchema, adminSchema } = require("../validators/authValidator");

const login = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, loginSchema);
    if (error) return sendError(res, error, 400);

    const user = await User.findOne({ email: value.email }).select("+password");
    if (!user) return sendError(res, "Invalid email or password", 401);
    if (!user.isActive) return sendError(res, "Account is disabled", 403);
    if (user.role !== "admin") {
      return sendError(res, "You are not authorized to access the admin panel", 403);
    }

    const match = await user.comparePassword(value.password);
    if (!match) return sendError(res, "Invalid email or password", 401);

    const token = generateToken({ userId: user._id });
    const safeUser = user.toObject();
    delete safeUser.password;

    return sendSuccess(res, { token, user: safeUser }, "Login successful");
  } catch (err) {
    console.error("Login error:", err);
    return sendError(res, "Login failed", 500);
  }
};

const createAdmin = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, adminSchema);
    if (error) return sendError(res, error, 400);
  } catch (err) {
    console.error("Create admin error:", err);
    return sendError(res, "Create admin failed", 500);
  }
};

const getProfile = async (req, res) => sendSuccess(res, { user: req.user }, "Profile fetched");

module.exports = { login, getProfile, createAdmin };
