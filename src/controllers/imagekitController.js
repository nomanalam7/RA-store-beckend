const ImageKit = require("imagekit");
const { sendSuccess, sendError } = require("../utils/responseHelper");

// Initialize ImageKit with server-side private key (NEVER exposed to frontend)
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Get ImageKit authentication parameters for client-side uploads.
 * The private key stays server-side — we only return the signed auth params.
 */
const getImageKitAuth = (req, res) => {
  try {
    const { token, expire, signature } = imagekit.getAuthenticationParameters();
    return sendSuccess(res, {
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      token,
      expire,
      signature,
    });
  } catch (err) {
    console.error("ImageKit auth error:", err);
    return sendError(res, "Failed to generate upload credentials", 500);
  }
};

/**
 * Delete an image from ImageKit by file ID.
 * Used when removing product/category/banner images.
 */
const deleteImagekitImage = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId) return sendError(res, "File ID is required", 400);

    await imagekit.deleteFile(fileId);
    return sendSuccess(res, null, "Image deleted from ImageKit");
  } catch (err) {
    console.error("ImageKit delete error:", err);
    return sendError(res, "Failed to delete image", 500);
  }
};

module.exports = { getImageKitAuth, deleteImagekitImage };
