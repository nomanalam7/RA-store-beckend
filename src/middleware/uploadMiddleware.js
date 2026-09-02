const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sendError } = require("../utils/responseHelper");

// Local disk storage. Kept isolated so it can be swapped for S3/Cloudinary later
// without touching controllers — they only ever consume `req.files` + the URL path.
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()
      .slice(0, 40);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base || "img"}-${unique}${ext}`);
  },
});

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

// Public URL path for a stored file (frontends prefix this with the API origin)
const toPublicPath = (filename) => `/uploads/${filename}`;

module.exports = { upload, uploadImages, toPublicPath, UPLOAD_DIR };
