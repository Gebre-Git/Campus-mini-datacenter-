const prisma = require('../config/db');

/**
 * Check if a user has enough quota to store a file of the given size.
 * Returns { allowed: boolean, message: string }
 */
async function checkQuota(userId, additionalBytes) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { quotaBytes: true, usedBytes: true },
  });

  if (!user) {
    return { allowed: false, message: 'User not found' };
  }

  const newUsed = BigInt(user.usedBytes) + BigInt(additionalBytes);
  if (newUsed > BigInt(user.quotaBytes)) {
    return {
      allowed: false,
      message: `Storage quota exceeded. Used: ${formatBytes(user.usedBytes)}, Quota: ${formatBytes(user.quotaBytes)}`,
    };
  }

  return { allowed: true, message: 'OK' };
}

function formatBytes(bytes) {
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

module.exports = { checkQuota, formatBytes };
