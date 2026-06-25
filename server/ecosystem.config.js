module.exports = {
  apps: [
    {
      name: 'learnsmart-server',
      script: 'src/app.js',
      cwd: __dirname,
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env',
      max_memory_restart: '500M',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 10000,
      listen_timeout: 15000,
      shutdown_with_message: true,
    },
  ],
};
