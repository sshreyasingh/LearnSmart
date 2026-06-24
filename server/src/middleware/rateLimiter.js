const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    errorCode: 'RATE_LIMITED',
    message: 'Too many requests, please try again later',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    errorCode: 'RATE_LIMITED',
    message: 'Too many authentication attempts, please try again later',
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id || req.ip,
  message: {
    status: 'error',
    errorCode: 'RATE_LIMITED',
    message: 'Upload limit reached. You can upload 5 projects per hour',
  },
});

module.exports = { generalLimiter, authLimiter, uploadLimiter };
