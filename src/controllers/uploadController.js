const ImageKit = require("imagekit");
const { uploadImages } = require("../middleware/uploadMiddleware");
const { sendSuccess, sendError } = require("../utils/responseHelper");

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Server-side upload handler.  Receives files from multer (memoryStorage),
 * pushes each buffer to ImageKit, and returns the public URLs.  Works on
 * serverless (Vercel/Lambda) because it never touches local disk.
 */
const uploadController = async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) return sendError(res, "No files provided", 400);

    const results = await Promise.all(
      files.map((f) =>
        imagekit.upload({
          file: f.buffer,
          fileName: `${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9.]/g, "-").slice(0, 60)}`,
          folder: "/ra-store",
        })
      )
    );

    const urls = results.map((r) => r.url);
    return sendSuccess(res, { urls }, "Files uploaded", 201);
  } catch (err) {
    console.error("Upload to ImageKit failed:", err);
    return sendError(res, err.message || "Upload failed", 500);
  }
};

module.exports = { uploadImages, uploadController };
