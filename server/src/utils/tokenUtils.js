const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateTokenFamily = () => {
  return crypto.randomBytes(16).toString('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  generateTokenFamily,
};
