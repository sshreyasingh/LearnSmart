const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { env } = require('../config/env');
const AppError = require('../utils/AppError');

const MAX_SIZE_BYTES = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024;

const ALLOWED_MIMES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
  'application/octet-stream',
];

const ALLOWED_EXTENSIONS = ['.zip'];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeValid = ALLOWED_MIMES.includes(file.mimetype);
  const extValid = ALLOWED_EXTENSIONS.includes(ext);

  if (!mimeValid && !extValid) {
    return cb(new AppError('Only .zip files are accepted', 400, 'INVALID_FILE_TYPE'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_BYTES,
    files: 1,
  },
});

const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError(`File exceeds ${env.UPLOAD_MAX_SIZE_MB}MB limit`, 413, 'FILE_TOO_LARGE')
          );
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new AppError('Only one file can be uploaded at a time', 400, 'TOO_MANY_FILES'));
        }
        return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
      }

      if (err instanceof AppError) {
        return next(err);
      }

      return next(new AppError('File upload failed', 500, 'UPLOAD_ERROR'));
    }

    if (!req.file) {
      return next(new AppError('A ZIP file is required', 400, 'FILE_REQUIRED'));
    }

    req.file.uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.zip`;
    next();
  });
};

module.exports = { handleUpload };
