// lib/totp_helper.js
const base32 = require('hi-base32');
const { totp } = require('otplib');

// totp options required: SHA1, 6 digits, step 30 (default in otplib is already step=30 & digits=6)
totp.options = { digits: 6, step: 30, algorithm: 'SHA1' };

/**
 * Convert 64-char hex seed to base32 for TOTP libraries.
 */
function hexToBase32(hexSeed) {
  const buf = Buffer.from(hexSeed, 'hex');
  // hi-base32 encodes with padding; strip "=" padding for otplib
  return base32.encode(buf).replace(/=+$/, '');
}

/**
 * Generate current TOTP code and seconds remaining
 */
function generateTotp(hexSeed) {
  const secret = hexToBase32(hexSeed);
  const code = totp.generate(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const validFor = 30 - (epoch % 30);
  return { code, validFor };
}

/**
 * Verify TOTP with ±window periods (default window=1 -> ±30s)
 */
function verifyTotp(hexSeed, code, window = 1) {
  const secret = hexToBase32(hexSeed);
  // otplib totp.check supports a window param as third argument (some versions accept options)
  // We'll implement a small loop for compatibility:
  const epoch = Math.floor(Date.now() / 1000);
  for (let w = -window; w <= window; w++) {
    const t = Math.floor((epoch + w * 30) / 30) * 30 * 1000;
    // totp.generateAt not always present — use totp.generate with time param if available.
    // otplib v12 supports totp.generate(secret, { epoch })
    const generated = totp.generate(secret, { epoch: (Math.floor((epoch + w * 30)) * 1000) });
    if (generated === code) return true;
  }
  return false;
}

module.exports = { hexToBase32, generateTotp, verifyTotp };
