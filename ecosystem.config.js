// PM2 Ecosystem Configuration File
// This file configures PM2 process manager for production deployment
// 
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 restart ecosystem.config.js
//   pm2 stop ecosystem.config.js
//   pm2 delete ecosystem.config.js

module.exports = {
  apps: [{
    name: 'my-app',
    script: 'dist/index.js',
    
    // Instances
    instances: 1,
    exec_mode: 'cluster',
    
    // Auto-restart configuration
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Environment variables
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Advanced features
    min_uptime: '10s',
    max_restarts: 10,
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Source map support
    source_map_support: true,
    
    // Interpreter args (optional, uncomment if needed)
    // node_args: '--max-old-space-size=4096'
  }]
};
