// scripts/generate_2fa_test.js
const fs = require('fs');
const base32 = require('hi-base32');
const { totp } = require('otplib');

// Read seed (hex)
const hex = fs.readFileSync('./data/seed.txt', 'utf8').trim();

// Convert hex → bytes → base32 (no padding)
const seedBytes = Buffer.from(hex, 'hex');
const base32Seed = base32.encode(seedBytes).replace(/=+$/, '');

// Configure TOTP (algorithm must be lowercase)
totp.options = { digits: 6, step: 30, algorithm: 'sha1' };

// Generate code
const code = totp.generate(base32Seed);

console.log("Base32 Secret:", base32Seed);
console.log("TOTP Code:", code);
