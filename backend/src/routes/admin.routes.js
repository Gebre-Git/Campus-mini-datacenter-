const express = require('express');
const prisma = require('../config/db');
const { authMiddleware } = require('../middleware/auth.middleware');
const { adminMiddleware } = require('../middleware/admin.middleware');

const router = express.Router();

// All admin routes require auth + admin
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/files — all files metadata across all users
router.get('/files', async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: {
        user: {
          select: { username: true },
        },
      },
    });

    const serialized = files.map((f) => ({
      id: f.id,
      filename: f.filename,
      sizeBytes: f.sizeBytes.toString(),
      uploadedAt: f.uploadedAt,
      userId: f.userId,
      username: f.user.username,
    }));

    return res.json(serialized);
  } catch (err) {
    console.error('[admin/files]', err);
    return res.status(500).json({ error: 'Failed to retrieve files' });
  }
});

// GET /api/admin/users — all users with quota info
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        isAdmin: true,
        quotaBytes: true,
        usedBytes: true,
        createdAt: true,
        _count: { select: { files: true } },
      },
    });

    const serialized = users.map((u) => ({
      id: u.id,
      username: u.username,
      isAdmin: u.isAdmin,
      quotaBytes: u.quotaBytes.toString(),
      usedBytes: u.usedBytes.toString(),
      createdAt: u.createdAt,
      fileCount: u._count.files,
    }));

    return res.json(serialized);
  } catch (err) {
    console.error('[admin/users]', err);
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// GET /api/admin/allowed-emails
router.get('/allowed-emails', async (req, res) => {
  try {
    const emails = await prisma.allowedEmail.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(emails);
  } catch (err) {
    console.error('[admin/allowed-emails/get]', err);
    return res.status(500).json({ error: 'Failed to retrieve allowed emails' });
  }
});

// POST /api/admin/allowed-emails
router.post('/allowed-emails', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    const sanitizedEmail = email.trim().toLowerCase();
    
    // Check if already in the allowed list
    const existingAllowed = await prisma.allowedEmail.findUnique({
      where: { email: sanitizedEmail },
    });
    if (existingAllowed) {
      return res.status(400).json({ error: 'Email is already in the allowed list' });
    }

    // Generate random 5-digit code
    const code = Math.floor(10000 + Math.random() * 90000).toString();

    const created = await prisma.allowedEmail.create({
      data: {
        email: sanitizedEmail,
        code,
      },
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error('[admin/allowed-emails/post]', err);
    return res.status(500).json({ error: 'Failed to add allowed email' });
  }
});

// DELETE /api/admin/allowed-emails/:id
router.delete('/allowed-emails/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.allowedEmail.delete({
      where: { id },
    });
    return res.json({ message: 'Email removed from allowed list' });
  } catch (err) {
    console.error('[admin/allowed-emails/delete]', err);
    return res.status(500).json({ error: 'Failed to remove allowed email' });
  }
});

module.exports = router;
