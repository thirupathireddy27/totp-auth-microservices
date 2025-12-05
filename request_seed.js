const fs = require('fs');
const path = require('path');
const axios = require('axios');

const STUDENT_ID = "24A95A6101";  // Same as Python
const REPO_URL = "https://github.com/thirupathireddy27/totp-auth-microservice";
const API_URL = "https://eajeyq4r3zljoq4rpovy2nthda0vtjqf.lambda-url.ap-south-1.on.aws/";

const getSeed = async () => {
    try {
        const pubKey = fs.readFileSync("student_public.pem", "utf8");
        
        const payload = {
            student_id: STUDENT_ID,
            github_repo_url: REPO_URL,
            public_key: pubKey
        };

        console.log(`Requesting seed for ${STUDENT_ID}...`);
        const response = await axios.post(API_URL, payload);
        
        const data = response.data;
        if (data.encrypted_seed) {
            fs.writeFileSync("encrypted_seed.txt", data.encrypted_seed);
            console.log("✅ Success! Encrypted seed saved to 'encrypted_seed.txt'");
        } else {
            console.log("❌ Error:", data);
        }
    } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        if (error.response) {
            console.log("Response:", error.response.data);
        }
    }
};

getSeed();