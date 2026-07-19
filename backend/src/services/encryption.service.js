const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a buffer using AES-256-GCM.
 * Output format: [16 bytes IV][16 bytes auth tag][ciphertext]
 */
function encryptBuffer(buffer, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Prepend IV + authTag to ciphertext
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt a buffer using AES-256-GCM.
 * Input format: [16 bytes IV][16 bytes auth tag][ciphertext]
 */
function decryptBuffer(encryptedData, key) {
  const iv = encryptedData.subarray(0, IV_LENGTH);
  const authTag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Derive a 32-byte AES-256 key from password + username using scrypt.
 * username acts as the salt. Deterministic — same inputs = same key.
 */
function deriveKey(password, username) {
  return crypto.scryptSync(password, username, 32);
}

module.exports = { encryptBuffer, decryptBuffer, deriveKey };
