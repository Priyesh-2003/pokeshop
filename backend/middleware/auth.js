// backend/middleware/auth.js
// No-op authentication middleware – all routes are public.

module.exports = (req, res, next) => {
  // Simply proceed to the next handler without authentication.
  next();
};
