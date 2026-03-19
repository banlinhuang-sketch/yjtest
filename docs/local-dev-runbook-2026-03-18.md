# 本地联调运行手册

## 快速启动

### 一键启动前端 + API

- 双击 [start-app.bat](C:/Users/AORUS/Desktop/QMVS/app/start-app.bat)

### 单独启动前端

- 双击 [start-web.bat](C:/Users/AORUS/Desktop/QMVS/app/start-web.bat)

### 单独启动 API

- 双击 [start-api.bat](C:/Users/AORUS/Desktop/QMVS/app/start-api.bat)

### 一键停止

- 双击 [stop-app.bat](C:/Users/AORUS/Desktop/QMVS/app/stop-app.bat)

## 常用命令

```bash
npm.cmd run dev:all
npm.cmd run health:local
npm.cmd run smoke:api
npm.cmd run lint
npm.cmd run build
```

## 默认地址

- 前端：[http://127.0.0.1:4177](http://127.0.0.1:4177)
- API：`http://127.0.0.1:8787`
- 健康检查：`http://127.0.0.1:8787/api/v1/health`

## 环境变量

可参考 [.env.example](C:/Users/AORUS/Desktop/QMVS/app/.env.example)：

- `VITE_API_BASE_URL`
- `VITE_DEV_API_PROXY_TARGET`
- `VITE_API_TIMEOUT_MS`

## 推荐验证顺序

1. 运行 `npm.cmd run health:local`
2. 运行 `npm.cmd run smoke:api`
3. 打开浏览器手动回归 `P0 -> P1 -> P2 -> P3 -> P4`

## 备注

- 当前 `server/` 为开发联调后端
- 切正式后端时，优先修改 `VITE_API_BASE_URL` 或 Vite 代理目标
