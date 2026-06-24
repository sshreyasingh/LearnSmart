const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      errorCode: err.errorCode,
      message: err.message,
    });
  }

  if (err.name === 'ValidationError' && err.errors) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      status: 'error',
      errorCode: 'VALIDATION_ERROR',
      message: messages.join('. '),
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      errorCode: 'INVALID_ID',
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      status: 'error',
      errorCode: 'DUPLICATE_FIELD',
      message: `Duplicate ${field}. This ${field} already exists.`,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      errorCode: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired',
    });
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    status: 'error',
    errorCode: 'INTERNAL_ERROR',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
