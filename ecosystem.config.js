// PM2 Ecosystem Configuration
// Documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [{
    name: 'qris-payment',
    script: './server.js',
    instances: 'max', // Use all available CPUs
    exec_mode: 'cluster', // Cluster mode for load balancing
    watch: false, // Disable watch in production
    max_memory_restart: '512M', // Restart if memory exceeds 512MB
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Error handling
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    
    // Auto restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Advanced features
    merge_logs: true,
    
    // Kill timeout (time to wait for graceful shutdown)
    kill_timeout: 5000,
    
    // Wait time before restarting crashed app
    restart_delay: 4000,
    
    // Exponential backoff restart delay
    exp_backoff_restart_delay: 100
  }],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/masarifys/simple-qris-payment.git',
      path: '/var/www/qris-payment',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};
