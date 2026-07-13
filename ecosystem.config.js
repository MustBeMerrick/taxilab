// pm2 process config. Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "taxilab",
      cwd: __dirname,
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
    },
  ],
};
