// backend/middleware/auth.js
// JWT authentication middleware for protecting routes.
// Verifies the token supplied in the `Authorization` header and attaches
// the decoded user payload to `req.user`. If verification fails, it returns
// a 401/403 response.

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // Expect the header format: "Bearer <token>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Token is invalid or expired
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // Attach user info to the request object for downstream handlers
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
