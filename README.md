# 亿境测试部

面向 `手机 App + 智能眼镜` 场景的测试用例管理平台前端与本地联调后端。

## 当前范围

- `P0` 登录页：账号密码登录、会话恢复
- `P1` 工作台：真实列表、筛选、草案生成、内联编辑
- `P2` 详情页：完整编辑、保存校验、离开拦截
- `P3` 审核中心：待审核 / 已处理、审核通过 / 退回
- `P4` 导出中心：任务化导出、轮询、下载
- `P5` 知识基线：真实只读知识源接口
- `P6` 状态模板：登录失效、无数据、无权限、网络异常、系统异常

## 本地运行

### 一键启动

- 双击 [start-app.bat](C:/Users/AORUS/Desktop/QMVS/app/start-app.bat)

### 命令行启动

```bash
npm.cmd install
npm.cmd run dev:all
```

默认地址：

- 前端：[http://127.0.0.1:4177](http://127.0.0.1:4177)
- API：`http://127.0.0.1:8787`

### 单独启动 API

```bash
npm.cmd run api
```

### 本地健康检查

```bash
npm.cmd run health:local
```

### API 烟雾回归

```bash
npm.cmd run smoke:api
```

### 便捷脚本

- [start-app.bat](C:/Users/AORUS/Desktop/QMVS/app/start-app.bat)
- [start-web.bat](C:/Users/AORUS/Desktop/QMVS/app/start-web.bat)
- [start-api.bat](C:/Users/AORUS/Desktop/QMVS/app/start-api.bat)
- [stop-app.bat](C:/Users/AORUS/Desktop/QMVS/app/stop-app.bat)

## 演示账号

- `banlin.huang / Yijing@2026`
- `review.expert / Review@2026`

## 正式后端切换

开发环境默认：

- Vite 代理 `/api` -> `http://127.0.0.1:8787`

可配置项：

- `VITE_API_BASE_URL`
- `VITE_DEV_API_PROXY_TARGET`
- `VITE_API_TIMEOUT_MS`

可参考 [.env.example](C:/Users/AORUS/Desktop/QMVS/app/.env.example)。

## 目录说明

- [App.tsx](C:/Users/AORUS/Desktop/QMVS/app/src/App.tsx)：应用壳层、共享状态、视图切换
- [src/api](C:/Users/AORUS/Desktop/QMVS/app/src/api)：认证、用例、导出、知识源 API 层
- [server](C:/Users/AORUS/Desktop/QMVS/app/server)：本地联调后端
- [docs](C:/Users/AORUS/Desktop/QMVS/app/docs)：PRD、阶段总结、契约文档、回归清单
- [local-dev-runbook-2026-03-18.md](C:/Users/AORUS/Desktop/QMVS/app/docs/local-dev-runbook-2026-03-18.md)：本地联调运行手册

## 已知限制

- 当前 `server/` 是开发联调后端，不是正式业务后端
- 暂未接入 refresh token、SSO、权限中心、导出历史
- `P5` 当前仅支持只读展示，不含知识维护后台
