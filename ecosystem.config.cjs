module.exports = {
  apps: [
    {
      name: 'montevideana-api',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        DISABLE_SCHEDULER: 'true', // Desactivar scheduler en workers del cluster
        ALLOWED_ORIGINS: 'https://montheladoturnero.com,https://www.montheladoturnero.com,http://localhost:5174'
      },
      env_production: {
        NODE_ENV: 'production',
        DISABLE_SCHEDULER: 'true',
        ALLOWED_ORIGINS: 'https://montheladoturnero.com,https://www.montheladoturnero.com,http://localhost:5174'
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
    },
    {
      name: 'montevideana-scheduler',
      script: './dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        DISABLE_SCHEDULER: 'false', // Activar scheduler solo en este proceso
        ALLOWED_ORIGINS: 'https://montheladoturnero.com,https://www.montheladoturnero.com,http://localhost:5174'
      },
      env_production: {
        NODE_ENV: 'production',
        DISABLE_SCHEDULER: 'false',
        ALLOWED_ORIGINS: 'https://montheladoturnero.com,https://www.montheladoturnero.com,http://localhost:5174'
      },
      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '300M',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
    }
  ]
};
