// call_decrypt.js
const axios = require('axios');
const fs = require('fs');

(async () => {
  try {
    const enc = fs.readFileSync('encrypted_seed.txt', 'utf8').trim();
    console.log('encrypted_seed length:', enc.length);
    console.log('first40:', enc.slice(0,40));
    console.log('last40:', enc.slice(-40));
    const r = await axios.post('http://127.0.0.1:8080/decrypt-seed',
      { encrypted_seed: enc },
      { headers: { 'Content-Type': 'application/json' }});
    console.log('OK:', r.data);
  } catch (e) {
    if (e.response) {
      console.error('HTTP', e.response.status, e.response.data);
    } else {
      console.error('ERR', e.message);
    }
  }
})();
