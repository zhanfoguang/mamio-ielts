module.exports = {
  apps: [{
    name: 'mamio-server',
    script: './server/index.js',
    cwd: '/var/www/mimio',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '256M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
}
