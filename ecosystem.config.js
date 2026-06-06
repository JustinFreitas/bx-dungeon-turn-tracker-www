module.exports = {
  apps: [{
    name: "bx-dungeon-turn",
    script: "./index.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "200M",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      ADMIN_KEY: "dungeon-master" // CHANGE THIS to a strong secret!
    }
  }]
};