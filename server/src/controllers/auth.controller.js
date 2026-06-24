const authService = require('../services/auth.service');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    res.status(200).json({
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const result = await authService.refreshTokens(req.body.refreshToken);

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.revokeAllTokens(req.user._id);

    res.status(200).json({
      status: 'success',
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { user: req.user.toSafeObject() },
  });
};

const oAuthCallback = async (req, res, next) => {
  try {
    const { CLIENT_URL } = require('../config/env').env;

    if (req.query.error) {
      return res.redirect(`${CLIENT_URL}/login?error=oauth_denied`);
    }

    const result = await authService.generateTokensForUser(req.user);

    res.redirect(
      `${CLIENT_URL}/oauth/callback?access=${result.accessToken}&refresh=${result.refreshToken}`
    );
  } catch (error) {
    const { CLIENT_URL } = require('../config/env').env;
    res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  oAuthCallback,
};
