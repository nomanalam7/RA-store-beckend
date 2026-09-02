const { sendSuccess } = require("../utils/responseHelper");
const { uploadImages, toPublicPath } = require("../middleware/uploadMiddleware");

// Returns public URLs for successfully uploaded files
const uploadController = (req, res) => {
  const urls = (req.files || []).map((f) => toPublicPath(f.filename));
  return sendSuccess(res, { urls }, "Files uploaded", 201);
};

module.exports = { uploadImages, uploadController };
