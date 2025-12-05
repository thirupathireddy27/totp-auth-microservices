// submit_payload.js (robust PEM normalization + submit)
// run: node submit_payload.js

const fs = require('fs');
const axios = require('axios');
const child = require('child_process');

function normalizePemSingleLine(s) {
  // s might contain:
  // - literal "\\n" (two-character backslash + n)
  // - literal "\\\\n" (double-escaped)
  // - actual "\r\n" or "\n" sequences
  // Convert any escaped-newline forms into real newlines, remove stray \r
  let out = s;

  // First convert double-escaped \\n -> \n (single backslash + n)
  out = out.replace(/\\\\n/g, '\\n');

  // Then convert any single-escaped \n into an actual newline
  out = out.replace(/\\n/g, '\n');

  // Also convert explicit escaped CRLF sequences if present
  out = out.replace(/\\r\\n/g, '\n');

  // Remove any literal CR characters leftover
  out = out.replace(/\r/g, '');

  // Trim whitespace
  out = out.trim();

  return out;
}

(async () => {
  try {
    const URL = "https://eajeyq4r3zljoq4rpovy2nthda0vtjqf.lambda-url.ap-south-1.on.aws/submit";

    // files we expect
    const files = [
      "student_public_singleline.txt",
      "encrypted_seed_singleline.txt",
      "encrypted_commit_proof.txt"
    ];
    for (const f of files) {
      if (!fs.existsSync(f)) throw new Error(`Missing required file: ${f}`);
    }

    const github_repo_url = "https://github.com/thirupathireddy27/totp-auth-microservices";
    const repo_url = "https://github.com/thirupathireddy27/totp-auth-microservices.git";
    const student_id = "24A95A6101";
    const commit_hash = child.execSync("git rev-parse HEAD").toString().trim();

    const encrypted_signature_raw = fs.readFileSync("encrypted_commit_proof.txt", "utf8").trim();
    const encrypted_seed_raw = fs.readFileSync("encrypted_seed_singleline.txt", "utf8").trim();

    // Read the single-line public key (may contain literal \n escapes). Normalize to proper PEM:
    const student_public_singleline_raw = fs.readFileSync("student_public_singleline.txt", "utf8").trim();
    const student_public_key = normalizePemSingleLine(student_public_singleline_raw);

    // Debug checks before sending
    console.log("\n--- PUBLIC KEY SANITY CHECK ---");
    console.log("Starts with BEGIN:", student_public_key.startsWith("-----BEGIN"));
    console.log("Contains END:", student_public_key.includes("-----END PUBLIC KEY-----"));
    console.log("Length (chars):", student_public_key.length);
    // show whether any backslash characters remain
    const remainingBackslashes = (student_public_key.match(/\\/g) || []).length;
    console.log("Remaining backslash chars in PEM:", remainingBackslashes);
    // print first/last 120 chars for inspection (safe to paste)
    console.log("\npublic_key start (120 chars):\n", student_public_key.slice(0,120).replace(/\n/g, '\\n') );
    console.log("\npublic_key end (120 chars):\n", student_public_key.slice(-120).replace(/\n/g, '\\n') );

    // If obvious problems, stop and print guidance
    if (!student_public_key.startsWith("-----BEGIN PUBLIC KEY-----") ||
        !student_public_key.includes("-----END PUBLIC KEY-----") ||
        remainingBackslashes > 0) {
      throw new Error("Public key normalization suspicious. Either it doesn't look like a PEM or there are leftover backslashes. See printed debug above.");
    }

    const payload = {
      // server required names
      github_repo_url: github_repo_url,
      repo_url: repo_url,
      student_id: student_id,
      commit_hash: commit_hash,
      encrypted_signature: encrypted_signature_raw,
      encrypted_seed: encrypted_seed_raw,

      // the API expects this exact field name
      public_key: student_public_key
    };

    console.log("\nPayload preview (first 300 chars):\n", JSON.stringify(payload).slice(0,300));

    const resp = await axios.post(URL, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000
    });

    console.log("\n=== SUCCESS ===");
    console.log("status:", resp.status);
    console.log("data:", resp.data);

  } catch (err) {
    console.error("\n=== ERROR ===");
    if (err.response) {
      console.error("status:", err.response.status);
      console.error("headers:", err.response.headers);
      console.error("body:", err.response.data);
    } else {
      console.error(err.message);
    }
    process.exitCode = 1;
  }
})();
