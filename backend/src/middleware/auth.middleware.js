const jwt = require('jsonwebtoken');

// In-memory map: JWT token string → derived encryption key (Buffer)
// Lost on server restart — users must log in again (by design)
const sessionKeys = new Map();

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  // Verify JWT signature and expiry
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      sessionKeys.delete(token);
      return res.status(401).json({ error: 'Token expired, please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Look up the session encryption key
  const encryptionKey = sessionKeys.get(token);
  if (!encryptionKey) {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }

  req.user = {
    userId: decoded.userId,
    username: decoded.username,
    isAdmin: decoded.isAdmin,
  };
  req.encryptionKey = encryptionKey;
  req.token = token;

  next();
}

module.exports = { authMiddleware, sessionKeys };
