const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

// Ensures a valid 32-byte key from environment variable
const getKey = () => {
  const secret = process.env.OTP_ENCRYPTION_KEY || 'default_repairpass_dev_otp_secret_key_32_bytes!';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts a plain 6-digit OTP string.
 * Returns formatted string: 'ivHex:encryptedHex'
 */
const encryptOtp = (plainOtp) => {
  if (!plainOtp) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(String(plainOtp), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts the stored encrypted string back into the original 6-digit OTP.
 */
const decryptOtp = (encryptedString) => {
  if (!encryptedString || !encryptedString.includes(':')) return null;
  const [ivHex, encryptedData] = encryptedString.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

module.exports = {
  encryptOtp,
  decryptOtp
};
