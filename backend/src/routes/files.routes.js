const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const prisma = require('../config/db');
const { encryptBuffer, decryptBuffer } = require('../services/encryption.service');
const { checkQuota } = require('../services/quota.service');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Multer: store file in memory so we can encrypt before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max per upload
});

// Resolve storage directory relative to backend root
const STORAGE_DIR = path.resolve(__dirname, '../../storage');

function getUserStorageDir(userId) {
  return path.join(STORAGE_DIR, userId);
}

// Ensure a user's storage directory exists
function ensureUserDir(userId) {
  const dir = getUserStorageDir(userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// GET /api/files — list current user's files
router.get('/', authMiddleware, async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      where: { userId: req.user.userId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        filename: true,
        sizeBytes: true,
        uploadedAt: true,
      },
    });

    // Serialize BigInt to string for JSON
    const serialized = files.map((f) => ({
      ...f,
      sizeBytes: f.sizeBytes.toString(),
    }));

    return res.json(serialized);
  } catch (err) {
    console.error('[files/list]', err);
    return res.status(500).json({ error: 'Failed to retrieve file list' });
  }
});

// GET /api/user/me — current user info + quota
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { username: true, isAdmin: true, quotaBytes: true, usedBytes: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      username: user.username,
      isAdmin: user.isAdmin,
      quotaBytes: user.quotaBytes.toString(),
      usedBytes: user.usedBytes.toString(),
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('[user/me]', err);
    return res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// POST /api/files/upload — upload + encrypt a file
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { userId } = req.user;
    const fileSize = req.file.size;

    // 1. Quota check
    const quotaCheck = await checkQuota(userId, fileSize);
    if (!quotaCheck.allowed) {
      return res.status(413).json({ error: quotaCheck.message });
    }

    // 2. Generate unique file ID
    const fileId = uuidv4();

    // 3. Encrypt file buffer
    const encryptedBuffer = encryptBuffer(req.file.buffer, req.encryptionKey);

    // 4. Write encrypted blob to disk
    const userDir = ensureUserDir(userId);
    const storagePath = path.join(userDir, fileId);
    fs.writeFileSync(storagePath, encryptedBuffer);

    // 5. Create DB record
    const fileRecord = await prisma.file.create({
      data: {
        id: fileId,
        filename: req.file.originalname,
        sizeBytes: BigInt(fileSize),
        storagePath,
        userId,
      },
    });

    // 6. Update usedBytes
    await prisma.user.update({
      where: { id: userId },
      data: { usedBytes: { increment: BigInt(fileSize) } },
    });

    return res.status(201).json({
      id: fileRecord.id,
      filename: fileRecord.filename,
      sizeBytes: fileRecord.sizeBytes.toString(),
      uploadedAt: fileRecord.uploadedAt,
    });
  } catch (err) {
    console.error('[files/upload]', err);
    return res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// GET /api/files/:id — download + decrypt a file
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const file = await prisma.file.findUnique({
      where: { id: req.params.id },
    });

    if (!file || file.userId !== req.user.userId) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read encrypted blob
    if (!fs.existsSync(file.storagePath)) {
      return res.status(404).json({ error: 'File data not found on disk' });
    }

    const encryptedData = fs.readFileSync(file.storagePath);

    // Decrypt
    let decryptedBuffer;
    try {
      decryptedBuffer = decryptBuffer(encryptedData, req.encryptionKey);
    } catch (decryptErr) {
      console.error('[files/download] Decryption failed:', decryptErr.message);
      return res.status(500).json({ error: 'Decryption failed — your session key may be invalid' });
    }

    // Determine MIME type
    const mimeType = mime.lookup(file.filename) || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    res.setHeader('Content-Length', decryptedBuffer.length);

    return res.send(decryptedBuffer);
  } catch (err) {
    console.error('[files/download]', err);
    return res.status(500).json({ error: 'Download failed' });
  }
});

// DELETE /api/files/:id — delete file
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const file = await prisma.file.findUnique({
      where: { id: req.params.id },
    });

    if (!file || file.userId !== req.user.userId) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete blob from disk
    if (fs.existsSync(file.storagePath)) {
      fs.unlinkSync(file.storagePath);
    }

    // Delete DB record
    await prisma.file.delete({ where: { id: req.params.id } });

    // Decrement usedBytes
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { usedBytes: { decrement: file.sizeBytes } },
    });

    return res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('[files/delete]', err);
    return res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
