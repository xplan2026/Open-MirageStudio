/**
 * PM2 Ecosystem 配置
 *
 * 部署在 4C4G 服务器 /opt/mirage-studio/coordinator-agent/
 * 启动: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'coordinator',
      cwd: '/opt/mirage-studio/coordinator-agent',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        COORDINATOR_PORT: 3100,
      },
      // 自动重启
      max_restarts: 5,
      restart_delay: 5000,
      // 日志
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/coordinator-error.log',
      out_file: '/var/log/coordinator-out.log',
      merge_logs: true,
    },
  ],
};
