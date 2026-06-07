module.exports = {
  apps: [{
    name: "bx-dungeon-turn",
    script: "./index.js",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: "200M",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      ADMIN_KEY: "your-secret-key-here",
      SSL_CERT: "./certs/server.crt",
      SSL_KEY: "./certs/server.key"
    }
  }]
};
