// server.js
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const base32 = require('hi-base32');
const { totp } = require('otplib');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

const DATA_DIR = path.join(__dirname, 'data');
const SEED_FILE = path.join(DATA_DIR, 'seed.txt');

// TOTP config (sha1, 6 digits, 30s)
totp.options = { digits: 6, step: 30, algorithm: 'sha1' };

// Helper: convert hex seed (from seed.txt) -> base32 (no padding)
function getBase32SeedFromHex(hex) {
  const seedBytes = Buffer.from(hex.trim(), 'hex');
  return base32.encode(seedBytes).replace(/=+$/, '');
}

// Endpoint: decrypt-seed
// Expect JSON { "encrypted_seed": "<base64 single line>" }
// Decrypts using student_private.pem (must be committed and present)
app.post('/decrypt-seed', async (req, res) => {
  try {
    // Defensive: get the raw incoming value
    let enc = req.body && req.body.encrypted_seed;

    // If client accidentally wrapped the string in an object (some helpers do)
    // Accept shapes: "base64string", { value: "base64string" }, { encrypted_seed: "..." }
    if (!enc && req.body && typeof req.body === 'object') {
      if (req.body.value) enc = req.body.value;
      else if (req.body.encrypted_seed) enc = req.body.encrypted_seed;
    }

    console.log('Received encrypted_seed type:', typeof enc);

    if (!enc || (typeof enc !== 'string' && !Buffer.isBuffer(enc))) {
      console.error('decrypt error: encrypted_seed missing or wrong type:', typeof enc);
      return res.status(400).json({ error: 'encrypted_seed missing or invalid' });
    }

    // If the client somehow sent a JSON stringified object, convert to string:
    if (typeof enc === 'object' && enc.toString) enc = enc.toString();

    // Remove accidental newlines or spaces introduced by editors:
    enc = enc.replace(/\r?\n/g, '').trim();

    // Convert base64 -> Buffer
    const ciphertext = Buffer.from(enc, 'base64');

    // Sanity check: for a 4096-bit RSA ciphertext length should be 512 bytes
    console.log('ciphertext.length:', ciphertext.length);

    // Load private key (ensure correct path)
    const privateKeyPem = fs.readFileSync('student_private.pem', 'utf8');

    // Decrypt: OAEP with SHA-256 (must match how encryption was done)
    const plaintextBuf = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      ciphertext
    );

    // Convert result to hex (or utf8/string depending on how seed was encoded)
    const seedHex = plaintextBuf.toString('hex');
    console.log('Decryption succeeded, seed len (hex chars):', seedHex.length);

    return res.json({ success: true, seed_length: plaintextBuf.length, seed_hex: seedHex });
  } catch (err) {
    // Log full error for debugging (don't expose raw stack to external clients in prod)
    console.error('decrypt error:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Decryption failed' });
  }
});

// Endpoint: generate-2fa
// Returns current code (uses persisted /data/seed.txt)
app.get('/generate-2fa', (req, res) => {
  try {
    if (!fs.existsSync(SEED_FILE)) return res.status(404).json({ error: 'seed not found' });
    const hex = fs.readFileSync(SEED_FILE, 'utf8').trim();
    const base32Seed = getBase32SeedFromHex(hex);
    const code = totp.generate(base32Seed);
    res.json({ code });
  } catch (err) {
    console.error('generate error:', err.message);
    res.status(500).json({ error: 'generate failed' });
  }
});

// Endpoint: verify-2fa
// POST { "code": "123456" } -> returns { valid: true/false }
app.post('/verify-2fa', (req, res) => {
  try {
    const code = (req.body && req.body.code) || '';
    if (!code) return res.status(400).json({ error: 'missing code' });
    if (!fs.existsSync(SEED_FILE)) return res.status(404).json({ error: 'seed not found' });

    const hex = fs.readFileSync(SEED_FILE, 'utf8').trim();
    const base32Seed = getBase32SeedFromHex(hex);

    // Accept window +/-1 period to allow small clock skew
    const isValid = totp.check(code, base32Seed, { window: 1 });
    res.json({ valid: !!isValid });
  } catch (err) {
    console.error('verify error:', err.message);
    res.status(500).json({ error: 'verify failed' });
  }
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on 0.0.0.0:${PORT}`);
});
