module.exports = {
  apps: [{
    name: 'montevideana-pedidos-backend',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    env_production: {
      NODE_ENV: 'production',
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
  }]
};
