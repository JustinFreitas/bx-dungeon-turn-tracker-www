module.exports = {
  apps: [{
    name: "osr-tracker",
    script: "./index.js",
    instances: 1,
    autorestart: true,
    watch: false, // PM2 watch can conflict with Node --watch; better to leave false in prod
    max_memory_restart: "200M",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      ADMIN_KEY: "dungeon-master" // CHANGE THIS to a strong secret!
    }
  }]
};