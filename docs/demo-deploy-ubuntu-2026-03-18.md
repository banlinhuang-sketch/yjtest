# 演示版部署指南（Ubuntu + Nginx + PM2 + SQLite）

## 适用范围

这份文档适用于当前项目的演示版部署：

- 前端：Vite 构建后的静态文件
- 后端：Node.js 原生 HTTP 服务
- 持久化：SQLite
- 进程托管：PM2
- 反向代理：Nginx

说明：

- 这套方案适合演示、试运行、前后端联调
- 当前后端数据会持久化到 SQLite 文件，不会因为服务重启丢失
- 但它仍然不是正式生产版架构

## 一、准备一台 Ubuntu 服务器

推荐：

- Ubuntu 22.04
- Ubuntu 24.04

开放端口：

- `22`：SSH
- `80`：HTTP
- `443`：HTTPS

## 二、安装基础环境

```bash
apt update
apt install -y curl git nginx
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
```

检查版本：

```bash
node -v
npm -v
```

要求：

- Node.js 建议使用 `24.x`

因为当前后端使用了 `node:sqlite`。

## 三、上传项目

如果你用 Git：

```bash
cd /opt
git clone <你的仓库地址> yijing-test-platform
cd /opt/yijing-test-platform/QMVS/app
```

如果你是本地上传压缩包，最终目录也尽量保持为：

```bash
/opt/yijing-test-platform/QMVS/app
```

## 四、安装依赖并构建前端

```bash
cd /opt/yijing-test-platform/QMVS/app
npm install
npm run build
```

## 五、准备环境变量

创建 `.env.production`：

```bash
cat > .env.production <<'EOF'
VITE_API_BASE_URL=
VITE_API_TIMEOUT_MS=12000
VITE_API_BACKEND_MODE=local
VITE_API_RESPONSE_ENVELOPE=auto
EOF
```

说明：

- `VITE_API_BASE_URL` 留空即可
- 因为部署后会由 Nginx 把 `/api` 反向代理到本机 `8787`

## 六、启动后端

先试跑：

```bash
cd /opt/yijing-test-platform/QMVS/app
API_HOST=127.0.0.1 API_PORT=8787 API_DB_PATH=./server/data/yijing-demo.sqlite node server/index.mjs
```

看到类似输出即成功：

```bash
亿境测试部演示版 API 已启动：http://127.0.0.1:8787
```

另开一个终端检查：

```bash
curl http://127.0.0.1:8787/api/v1/health
```

你会看到：

- `status: ok`
- `storage.engine: sqlite`
- `storage.filePath`

## 七、用 PM2 托管后端

安装 PM2：

```bash
npm install -g pm2
```

使用项目内配置启动：

```bash
cd /opt/yijing-test-platform/QMVS/app
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

查看状态：

```bash
pm2 status
pm2 logs yijing-demo-api
```

## 八、配置 Nginx

创建站点配置：

```bash
cat > /etc/nginx/sites-available/yijing-test <<'EOF'
server {
    listen 80;
    server_name test.yourdomain.com;

    root /opt/yijing-test-platform/QMVS/app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8787/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

启用：

```bash
ln -s /etc/nginx/sites-available/yijing-test /etc/nginx/sites-enabled/yijing-test
nginx -t
systemctl reload nginx
```

## 九、配置 HTTPS

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d test.yourdomain.com
```

## 十、SQLite 数据文件位置

默认数据库文件：

```bash
/opt/yijing-test-platform/QMVS/app/server/data/yijing-demo.sqlite
```

这个文件需要保留和备份。

建议备份命令：

```bash
cp /opt/yijing-test-platform/QMVS/app/server/data/yijing-demo.sqlite /opt/yijing-test-platform/QMVS/app/server/data/yijing-demo.sqlite.bak
```

## 十一、更新版本

```bash
cd /opt/yijing-test-platform/QMVS/app
git pull
npm install
npm run build
pm2 restart yijing-demo-api
systemctl reload nginx
```

## 十二、当前限制

- SQLite 适合演示、小规模试运行，不适合高并发生产
- 当前认证仍是演示账号密码，不是正式 SSO
- 导出任务是内存任务，重启后不会保留历史任务
- 正式生产建议下一步迁移到 MySQL/PostgreSQL
