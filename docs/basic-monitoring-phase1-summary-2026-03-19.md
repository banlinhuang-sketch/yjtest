# 基础监控 Phase 1 总结

## 已完成

- 新增统一巡检脚本：`npm run health:ops`
- 巡检覆盖：
  - Web 壳可访问性
  - API 健康检查
  - SQLite 文件存在性
  - 导出目录存在性
  - 磁盘可用空间
  - Nginx 服务状态
  - PM2 进程状态
- 新增 Ubuntu 日志查看脚本：`scripts/ubuntu-log-watch.sh`

## 关键文件

- `scripts/ops-health.mjs`
- `scripts/ubuntu-log-watch.sh`
- `package.json`
- `.env.example`

## 使用方式

### 本地或服务器巡检

```bash
npm run health:ops
```

可选环境变量：

- `WEB_BASE_URL`
- `API_BASE_URL`
- `PM2_APP_NAME`
- `NGINX_SERVICE_NAME`
- `MONITOR_MIN_FREE_GB`
- `MONITOR_SKIP_WEB`

### Ubuntu 查看日志

```bash
bash scripts/ubuntu-log-watch.sh
```

自定义日志行数：

```bash
LOG_LINES=120 bash scripts/ubuntu-log-watch.sh
```

## 输出说明

`health:ops` 返回 JSON，包含：

- `status`
- `checkedAt`
- `host`
- `platform`
- `checks[]`

当任何关键检查失败时，脚本会以非零退出码结束，便于挂到定时任务或监控系统。

## 验证结果

- `npm.cmd run lint`
- `npm.cmd run build`
- `MONITOR_SKIP_WEB=1 npm.cmd run health:ops`

## 下一步建议

- 将 `health:ops` 加入 Ubuntu `cron`
- 对磁盘空间和 API 状态增加告警通知
- 后续补一页“监控面板 / 管理员状态页”
