import express from 'express';
import passport from 'passport';
import { register, login } from '../controllers/auth.js';
import ensureAuthenticated from '../middleware/oauth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['opend', 'profile', 'email'],
    prompt: 'select_account',
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/google/failure',
  }),
  (req, res) => {
    if (process.env.CLIENT_URL) {
      return res.redirect(`${process.env.CLIENT_URL}/api-docs`);
    }
    return res.json({
      message: 'Login successful',
      user: {
        id: req.user._id,
        email: req.user.email,
        displayName: req.user.displayName,
      },
    });
  }
);

router.get('/google/failure', (req, res) => {
  res.status(401).json({ message: 'Google authentication failed' });
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err2) => {
      if (err2) return next(err2);
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

router.get('/me', ensureAuthenticated, (req, res) => {
  res.json({
    id: req.user._id,
    email: req.user.email,
    displayName: req.user.displayName,
    preferredCurrency: req.user.preferredCurrency,
  });
});

export default router;