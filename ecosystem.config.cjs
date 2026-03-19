module.exports = {
  apps: [
    {
      name: 'yijing-demo-api',
      script: 'server/index.mjs',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        API_HOST: '127.0.0.1',
        API_PORT: '8787',
        API_DB_PATH: './server/data/yijing-demo.sqlite',
      },
    },
  ],
}
