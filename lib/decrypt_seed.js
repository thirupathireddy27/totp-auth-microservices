// Requires at top of file:
// const fs = require('fs');
// const crypto = require('crypto');
// const express = require('express');
// app = express(); app.use(express.json({ limit: '2mb' }));

app.post('/decrypt-seed', async (req, res) => {
  try {
    let enc = req.body && req.body.encrypted_seed;

    console.log('Received encrypted_seed raw type:', typeof enc);

    // Normalize many possible shapes into a single base64 string:
    if (enc == null) {
      // maybe client posted the whole body as the string (rare)
      if (typeof req.body === 'string') enc = req.body;
    }

    // If client sent { value: "..." } or { encrypted_seed: "..." } inside nested object
    if (enc && typeof enc === 'object') {
      // If it's an array like ["line1","line2",...]
      if (Array.isArray(enc)) {
        enc = enc.join('');
      } else if (enc.value && typeof enc.value === 'string') {
        enc = enc.value;
      } else {
        // Numeric-keyed object or other object: take values in index order
        const vals = Object.keys(enc)
          .sort((a,b) => {
            // If keys look numeric, sort numerically, otherwise keep original order
            const ai = parseInt(a); const bi = parseInt(b);
            if (!isNaN(ai) && !isNaN(bi)) return ai - bi;
            return a < b ? -1 : a > b ? 1 : 0;
          })
          .map(k => (typeof enc[k] === 'string' ? enc[k] : String(enc[k])));
        enc = vals.join('');
      }
    }

    // Final type check
    if (!enc || typeof enc !== 'string') {
      console.error('decrypt error: encrypted_seed missing or wrong type:', typeof enc);
      return res.status(400).json({ error: 'encrypted_seed missing or invalid' });
    }

    // Remove stray whitespace/newlines introduced by some clients
    enc = enc.replace(/\s+/g, ''); // remove all whitespace (space/newline/tab)
    enc = enc.trim();

    // Base64 decode to Buffer and sanity-check length
    let ciphertext;
    try {
      ciphertext = Buffer.from(enc, 'base64');
    } catch (e) {
      console.error('decrypt error: base64 decode failed', e && e.message);
      return res.status(400).json({ error: 'encrypted_seed not valid base64' });
    }

    console.log('ciphertext.length:', ciphertext.length);

    // Load student's private key (ensure path correct)
    const privateKeyPem = fs.readFileSync('student_private.pem', 'utf8');

    // Attempt decryption with OAEP SHA-256 (matching your encryption)
    const plaintextBuf = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      ciphertext
    );

    const seedHex = plaintextBuf.toString('hex');
    console.log('Decryption succeeded, seed length (bytes):', plaintextBuf.length);

    return res.json({ success: true, seed_length: plaintextBuf.length, seed_hex: seedHex });
  } catch (err) {
    console.error('decrypt error:', err && (err.stack || err.message || err));
    return res.status(500).json({ error: 'Decryption failed' });
  }
});
