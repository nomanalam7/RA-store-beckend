const multer = require("multer");
const { sendError } = require("../utils/responseHelper");

// Use memoryStorage so uploads work on serverless (Vercel/Lambda) where the
// filesystem is read-only.  Files land in req.files[].buffer as Buffers.
const storage = multer.memoryStorage();

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
  return cb(new Error("Only image files (jpg, png, webp, avif, gif) are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

// Wrap multer so its errors become clean JSON responses instead of 500s.
const uploadImages = (field = "images", max = 10) => (req, res, next) => {
  upload.array(field, max)(req, res, (err) => {
    if (err) return sendError(res, err.message || "File upload failed", 400);
    return next();
  });
};

module.exports = { upload, uploadImages };
