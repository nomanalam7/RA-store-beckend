const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/responseHelper");
const User = require("../models/user");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return sendError(res, "Authorization header is missing", 401);
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

    if (!token) {
      return sendError(res, "Token is missing", 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return sendError(res, "Token has expired", 401);
      } else if (error.name === "JsonWebTokenError") {
        return sendError(res, "Invalid token", 401);
      }
      return sendError(res, "Token verification failed", 401);
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return sendError(res, "User not found", 404);
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return sendError(res, "Authentication failed", 500);
  }
};

// Like authenticate, but allows anonymous requests through.
// Sets req.user / req.userId only when a valid token is supplied.
const authenticateOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    req.user = null;
    req.userId = null;

    if (!authHeader) return next();

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (!token) return next();

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return next(); // invalid/expired token — treat as anonymous
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return next();

    req.user = user;
    req.userId = user._id;
    return next();
  } catch (error) {
    console.error("Optional authentication error:", error);
    return next();
  }
};

module.exports = { authenticate, authenticateOptional };