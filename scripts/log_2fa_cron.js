// scripts/log_2fa_cron.js

const fs = require('fs');
const path = require('path');
const axios = require('axios');

(async () => {
  try {
    const url = 'http://127.0.0.1:8080/generate-2fa';
    const resp = await axios.get(url);
    const code = resp.data.code;

    const timestamp = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
    const line = `${timestamp} - 2FA Code: ${code}\n`;

    // Correct path inside the project directory
    const logPath = path.join(__dirname, '..', 'cron', 'last_code.txt');

    fs.appendFileSync(logPath, line, 'utf8');
    console.log('Logged:', line.trim());
  } catch (err) {
    console.error('cron error:', err.message);
  }
})();
