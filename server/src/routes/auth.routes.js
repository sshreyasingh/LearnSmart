const express = require('express');
const { passport } = require('../config/passport');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
} = require('../validators/auth.validator');
const { env } = require('../config/env');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

if (env.GOOGLE_CLIENT_ID) {
  router.get(
    '/google',
    passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${env.CLIENT_URL}/login?error=oauth_denied`,
    }),
    authController.oAuthCallback
  );
}

if (env.GITHUB_CLIENT_ID) {
  router.get(
    '/github',
    passport.authenticate('github', { session: false, scope: ['user:email', 'read:user'] })
  );

  router.get(
    '/github/callback',
    passport.authenticate('github', {
      session: false,
      failureRedirect: `${env.CLIENT_URL}/login?error=oauth_denied`,
    }),
    authController.oAuthCallback
  );
}

module.exports = router;
