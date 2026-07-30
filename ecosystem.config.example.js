// Template for ecosystem.config.js (which is gitignored).
//
// Configuration now comes from .env rather than literals in this file — copy
// .env.example to .env and fill it in. Keeping ADMIN_KEY here meant the
// credential lived in a file that only a .gitignore entry kept out of the repo.

const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
const customEnv = {};

if (fs.existsSync(envPath)) {
  try {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.substring(0, eq).trim();
      let val = trimmed.substring(eq + 1).trim();
      if (val.length >= 2 &&
          ((val.startsWith('"') && val.endsWith('"')) ||
           (val.startsWith("'") && val.endsWith("'")))) {
        val = val.slice(1, -1);
      }
      customEnv[key] = val;
    }
  } catch (err) {
    console.error('Error loading .env file:', err.message);
  }
}

if (!customEnv.ADMIN_KEY) {
  throw new Error(
    'ADMIN_KEY is not set. Copy .env.example to .env and set a strong random value:\n' +
    "  node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\""
  );
}

module.exports = {
  apps: [{
    name: "bx-dungeon-turn",
    script: "./index.js",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: "200M",
    env: {
      NODE_ENV: "production",
      PORT: customEnv.PORT || "3000",
      ADMIN_KEY: customEnv.ADMIN_KEY,
      SSL_CERT: customEnv.SSL_CERT || "./certs/server.crt",
      SSL_KEY: customEnv.SSL_KEY || "./certs/server.key"
    }
  }]
};
