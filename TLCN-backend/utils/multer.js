const multer = require("multer");
const path = require("path");

// Multer config
module.exports = multer({
  storage: multer.diskStorage({}),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedExtensions.includes(ext) ||
      !allowedMimeTypes.includes(file.mimetype)
    ) {
      cb(
        new Error("Chỉ hỗ trợ ảnh định dạng JPG, JPEG, PNG hoặc WEBP"),
        false
      );
      return;
    }

    cb(null, true);
  },
});