import express from "express";
import cloudinary from "cloudinary";

const router = express.Router();
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const parseDataUrl = (value: unknown) => {
  if (typeof value !== "string") return null;

  const match = value.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const encoded = match[2];

  if (!mimeType || !encoded) return null;

  const sizeInBytes = Buffer.byteLength(encoded, "base64");

  return {
    mimeType,
    encoded,
    sizeInBytes,
  };
};

router.post("/upload", async (req, res) => {
  try {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const { buffer } = req.body;
    const file = parseDataUrl(buffer);

    if (!file) {
      return res.status(400).json({
        message: "Valid image data is required",
      });
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimeType)) {
      return res.status(400).json({
        message: "Only jpeg, png and webp images are allowed",
      });
    }

    if (file.sizeInBytes > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        message: "Image must be 5MB or smaller",
      });
    }

    const cloud = await cloudinary.v2.uploader.upload(buffer, {
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    });

    res.json({
      url: cloud.secure_url,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
});

export default router;
