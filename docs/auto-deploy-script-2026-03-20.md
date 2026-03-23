# Ubuntu 一键自动部署脚本说明

新增脚本：

- `scripts/deploy-auto.sh`

## 脚本用途

这份脚本用于 Ubuntu 服务器上的自动部署，完成以下动作：

1. `git fetch`
2. 比较本地 `HEAD` 与远端分支
3. 有新提交时执行：
   - `git reset --hard origin/main`
   - `npm install`
   - `npm run build`
   - 同步 `dist` 到发布目录
   - `pm2 restart`
4. 最后执行 API 健康检查

默认发布目录：

- `/var/www/yijing-test`

默认 PM2 应用名：

- `yijing-demo-api`

## 手动执行

```bash
cd /home/banlin/QMVS/app
chmod +x scripts/deploy-auto.sh
./scripts/deploy-auto.sh
```

如果你想忽略“无新提交”检查，强制重新发布一次：

```bash
cd /home/banlin/QMVS/app
DEPLOY_FORCE=1 ./scripts/deploy-auto.sh
```

## 定时任务

推荐每 5 分钟检查一次：

```bash
crontab -e
```

加入：

```bash
*/5 * * * * /home/banlin/QMVS/app/scripts/deploy-auto.sh
```

## 日志

默认日志文件：

- `/home/banlin/QMVS/app/deploy-auto.log`

查看最新日志：

```bash
tail -n 100 /home/banlin/QMVS/app/deploy-auto.log
```

## 可配置环境变量

脚本支持以下覆盖项：

- `DEPLOY_APP_DIR`
- `DEPLOY_WEB_DIR`
- `DEPLOY_BRANCH`
- `DEPLOY_REMOTE_NAME`
- `DEPLOY_PM2_APP_NAME`
- `DEPLOY_LOG_FILE`
- `DEPLOY_API_HEALTH_URL`
- `DEPLOY_NPM_BIN`
- `DEPLOY_GIT_BIN`
- `DEPLOY_PM2_BIN`
- `DEPLOY_FORCE=1`

## 建议前置条件

在服务器上确保以下条件已经满足：

1. `~/QMVS/app` 是 git 仓库
2. `origin` 指向 GitHub 仓库
3. SSH Deploy Key 已配置
4. `/var/www/yijing-test` 对部署用户可写
5. `pm2` 已托管 `yijing-demo-api`

## 建议权限

推荐把发布目录授权给当前部署用户：

```bash
sudo chown -R banlin:www-data /var/www/yijing-test
sudo chmod -R 775 /var/www/yijing-test
```

## 验证部署是否生效

### 1. 手动执行

```bash
DEPLOY_FORCE=1 /home/banlin/QMVS/app/scripts/deploy-auto.sh
```

### 2. 检查日志

```bash
tail -n 50 /home/banlin/QMVS/app/deploy-auto.log
```

### 3. 检查 API

```bash
curl http://127.0.0.1:8787/api/v1/health
```

### 4. 检查页面

```bash
curl http://127.0.0.1 | head
```
