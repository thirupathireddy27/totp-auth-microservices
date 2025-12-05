// test_decrypt.js
const fs = require('fs');
const crypto = require('crypto');

const base64 = fs.readFileSync('encrypted_seed.txt','utf8').replace(/\r|\n/g,'');
const privPem = fs.readFileSync('student_private.pem','utf8');
const ciphertext = Buffer.from(base64,'base64');

function tryDecrypt(oaepHash) {
  try {
    const plain = crypto.privateDecrypt({
      key: privPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash
    }, ciphertext);
    console.log(`OK with OAEP-${oaepHash}:`, plain.toString('utf8'));
    return true;
  } catch (e) {
    console.error(`FAIL OAEP-${oaepHash}:`, e.message);
    return false;
  }
}

if (!tryDecrypt('sha256')) tryDecrypt('sha1');
