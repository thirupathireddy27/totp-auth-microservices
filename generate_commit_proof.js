// generate_commit_proof.js
// Usage: node generate_commit_proof.js
// Output: prints Commit hash and EncryptedSignature (base64 single line)

const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

function getCommitHash() {
  // get the latest commit hash (40 hex chars)
  const out = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(out)) throw new Error('Invalid commit hash: ' + out);
  return out;
}

function signAsciiCommit(commitHash, privateKeyPem) {
  // Sign ASCII bytes of the commit hash using RSA-PSS SHA-256 and max salt length
  const signer = crypto.createSign('sha256');
  signer.update(commitHash, 'utf8');
  signer.end();
  const signature = signer.sign({
    key: privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX
  });
  return signature; // Buffer
}

function encryptWithInstructorPub(signatureBuffer, instructorPubPem) {
  // Encrypt signature using RSA-OAEP with SHA-256
  const encrypted = crypto.publicEncrypt({
    key: instructorPubPem,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, signatureBuffer);
  return encrypted; // Buffer
}

(async () => {
  try {
    const commitHash = getCommitHash();
    console.log('Commit Hash:', commitHash);

    const priv = fs.readFileSync('student_private.pem', 'utf8');
    const instrPub = fs.readFileSync('instructor_public.pem', 'utf8');

    const signature = signAsciiCommit(commitHash, priv);
    const encrypted = encryptWithInstructorPub(signature, instrPub);

    const b64 = encrypted.toString('base64');
    console.log('\nEncrypted Signature (BASE64 single line):\n' + b64 + '\n');
    // Optionally write to file
    fs.writeFileSync('encrypted_commit_proof.txt', b64, { encoding: 'utf8' });
    console.log('Saved encrypted_commit_proof.txt');
  } catch (err) {
    console.error('ERROR:', err.message || err);
    process.exit(1);
  }
})();
    