const { sendError } = require("../utils/responseHelper");

// Must run AFTER `authenticate` (which sets req.user). Restricts a route to admins.
const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return sendError(res, "Admin access required", 403);
  }
  return next();
};

module.exports = { authorizeAdmin };
