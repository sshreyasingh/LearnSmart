const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  generateTokenFamily,
} = require('../utils/tokenUtils');
const AppError = require('../utils/AppError');

const register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
  }

  const user = await User.create({
    name,
    email,
    password,
    authProviders: [{ provider: 'local', providerId: email }],
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const family = generateTokenFamily();

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken,
    family,
  };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const family = generateTokenFamily();

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken,
    family,
  };
};

const refreshTokens = async (incomingToken) => {
  const tokenHash = hashToken(incomingToken);

  const storedToken = await RefreshToken.findOne({ tokenHash, expiresAt: { $gt: new Date() } });

  if (!storedToken) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH');
  }

  const user = await User.findById(storedToken.userId);
  if (!user) {
    throw new AppError('User not found', 401, 'UNAUTHORIZED');
  }

  await RefreshToken.deleteMany({ userId: user._id, family: storedToken.family });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const family = generateTokenFamily();

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    accessToken,
    refreshToken,
    family,
  };
};

const revokeAllTokens = async (userId) => {
  await RefreshToken.deleteMany({ userId });
};

const generateTokensForUser = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const family = generateTokenFamily();

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken,
  };
};

const processOAuthCallback = async (oauthUser) => {
  const { profile, accessToken: oauthAccessToken, provider } = oauthUser;

  const user = await User.createFromOAuth(profile, provider, oauthAccessToken);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const family = generateTokenFamily();

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken,
  };
};

module.exports = {
  register,
  login,
  refreshTokens,
  revokeAllTokens,
  generateTokensForUser,
  processOAuthCallback,
};
