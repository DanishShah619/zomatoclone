import multer from "multer";
const storage = multer.memoryStorage();
const ALLOWED_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);
const uploadFile = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
            cb(new Error("Only jpeg, png and webp images are allowed"));
            return;
        }
        cb(null, true);
    },
}).single("file");
export default uploadFile;
