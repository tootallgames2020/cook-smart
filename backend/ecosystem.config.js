module.exports = {
  apps: [
    {
      name: 'cook-smart-backend',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      log_file: '/var/log/cook-smart/combined.log',
      out_file: '/var/log/cook-smart/out.log',
      error_file: '/var/log/cook-smart/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      max_memory_restart: '500M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      monitoring: false,
      
      // Advanced settings
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Auto restart on file changes (disabled in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      
      // Source map support
      source_map_support: true,
      
      // Graceful shutdown
      kill_retry_time: 100,
    },
  ],
};