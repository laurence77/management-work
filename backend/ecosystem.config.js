module.exports = {
  apps: [{
    name: 'celebrity-booking-api',
    script: './server.js',
    cwd: '/var/www/celebrity-booking/backend',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    kill_timeout: 5000,
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};