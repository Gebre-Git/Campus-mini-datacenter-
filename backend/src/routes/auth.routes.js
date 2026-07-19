const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { deriveKey } = require('../services/encryption.service');
const { sessionKeys } = require('../middleware/auth.middleware');

const router = express.Router();
const SALT_ROUNDS = 10;

// GET or POST /api/check-email
const handleCheckEmail = async (req, res) => {
  try {
    const email = req.body?.email || req.query?.email;
    const code = req.body?.code || req.query?.code;

    // Check user count for bootstrap bypass
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      return res.json({ allowed: true, bootstrap: true });
    }

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 5-digit verification code are required' });
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedCode = code.trim();

    // Check if in allowed list
    const allowed = await prisma.allowedEmail.findUnique({
      where: { email: sanitizedEmail },
    });
    if (!allowed) {
      return res.status(400).json({ error: 'Email is not in the allowed list. Please contact the administrator.' });
    }

    // Check if code matches
    if (allowed.code !== sanitizedCode) {
      return res.status(400).json({ error: 'Invalid verification code. Please check with your administrator.' });
    }

    // Check if already registered
    const registered = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });
    if (registered) {
      return res.status(400).json({ error: 'An account has already been registered with this email' });
    }

    return res.json({ allowed: true });
  } catch (err) {
    console.error('[check-email]', err);
    return res.status(500).json({ error: 'Server error checking email and code' });
  }
};

router.get('/check-email', handleCheckEmail);
router.post('/check-email', handleCheckEmail);

// POST /api/register
router.post('/register', async (req, res) => {
  try {
    const { email, code, username, password } = req.body;

    const userCount = await prisma.user.count();

    if (userCount > 0) {
      if (!email || !code || !username || !password) {
        return res.status(400).json({ error: 'Email, verification code, username, and password are required' });
      }
    } else {
      if (!email || !username || !password) {
        return res.status(400).json({ error: 'Email, username, and password are required' });
      }
    }

    if (username.length < 3 || username.length > 32) {
      return res.status(400).json({ error: 'Username must be 3–32 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Unless 0 users exist (bootstrap), enforce allowed email and code check
    if (userCount > 0) {
      const sanitizedCode = code.trim();
      const allowed = await prisma.allowedEmail.findUnique({
        where: { email: sanitizedEmail },
      });
      if (!allowed) {
        return res.status(400).json({ error: 'Email is not in the allowed list' });
      }

      if (allowed.code !== sanitizedCode) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Check if already registered
      const existingEmail = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
      });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email is already registered' });
      }
    }

    // Check if username is taken
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.create({
      data: {
        email: sanitizedEmail,
        username,
        passwordHash,
      },
    });

    return res.status(201).json({ message: 'Account created successfully. You can now log in.' });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Derive encryption key and store in memory, keyed by this JWT
    const encryptionKey = deriveKey(password, username);
    sessionKeys.set(token, encryptionKey);

    return res.json({
      token,
      username: user.username,
      isAdmin: user.isAdmin,
      quotaBytes: user.quotaBytes.toString(),
      usedBytes: user.usedBytes.toString(),
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/logout (optional — cleans up session key)
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    sessionKeys.delete(token);
  }
  return res.json({ message: 'Logged out' });
});

module.exports = router;
