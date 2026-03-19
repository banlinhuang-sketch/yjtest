---
title: "Backend Integration Phase 1 Completion Status"
date: "2026-03-18"
category: "integration-issues"
status: "completed-with-followups"
tags:
  - frontend
  - backend-integration
  - auth
  - cases
  - export
project: "亿境测试部测试用例管理平台"
---

# 后端接入一期完成度总结

## 问题背景

本轮目标是把前端从本地假数据驱动，升级为可联调的真实接口驱动版本，覆盖：

- P0 登录
- P1 工作台
- P2 详情保存
- P3 审核流转
- P4 异步导出

同时要求保留现有页面结构，不引入新的路由框架和状态库。

## 已完成

### 1. 本地真实接口联调后端

已在项目内实现一套可直接联调的本地 Node API：

- `server/index.mjs`
- `server/store.mjs`
- `server/seed-data.mjs`

已实现接口：

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/cases`
- `GET /api/v1/cases/:id`
- `POST /api/v1/cases`
- `PATCH /api/v1/cases/:id`
- `POST /api/v1/cases/generate-draft`
- `POST /api/v1/cases/:id/review`
- `POST /api/v1/exports`
- `GET /api/v1/exports/:taskId`
- `GET /api/v1/exports/:taskId/download`

### 2. 统一前端 API 层

已新增统一 API 封装和 DTO 适配层：

- `src/api/client.ts`
- `src/api/auth.ts`
- `src/api/cases.ts`
- `src/api/exports.ts`
- `src/api/contracts.ts`
- `src/api/caseAdapters.ts`

已覆盖：

- Bearer Token 注入
- `sessionStorage` 持久化 token
- 401 失效清理
- 超时与网络错误包装
- DTO 到前端 `TestCase` 的转换

### 3. P0 登录页接入真实认证流程

已完成：

- 账号密码表单登录
- 登录失败提示
- 登录后调用 `/auth/me`
- 刷新后恢复会话

对应文件：

- `src/views/LoginView.tsx`
- `src/views/LoginView.css`

### 4. P1-P4 接入真实接口

#### P1 工作台

已完成：

- 初始列表来自 `GET /cases`
- 草案生成改为 `POST /cases/generate-draft`
- 克隆改为 `POST /cases`
- 内联编辑自动保存改为 `PATCH /cases/:id`

#### P2 详情页

已完成：

- 保存改为 `PATCH /cases/:id`
- 去掉本地 `localStorage` 作为已保存基线

#### P3 审核中心

已完成：

- 基于真实共享用例数据展示
- 审核通过/退回改为 `POST /cases/:id/review`
- 审核后同步更新共享状态

#### P4 导出中心

已完成：

- 创建导出任务
- 轮询导出状态
- 完成后下载后端文件
- 失败时给出错误提示

### 5. 应用入口改为真实数据驱动

`src/App.tsx` 已改为统一管理：

- 登录态
- 当前用户
- 共享用例数据
- 页面视图
- 当前选中用例
- 全局 Toast
- 全局异常页

### 6. 启动脚本与本地运行

已完成：

- `npm.cmd run api`
- `npm.cmd run dev:all`
- 双击启动脚本：`start-app.bat`

并修复了 Windows 下 `spawn EINVAL` 的问题，`dev-all.mjs` 现在使用更稳的 Windows 启动方式。

## 未完成

### 1. 还没有接入真实业务后端

当前的“真实接口”是项目内置的本地 Node API，用于联调和固化契约，不是你们正式业务后端。

也就是说，一期完成的是：

- 前端不再依赖静态 mock
- 接口契约已经固定
- 本地联调链路已经打通

但还没有完成：

- 切换到公司正式后端服务
- 联调正式环境数据

### 2. P5 仍然使用本地 mock 数据

知识基线页本期未接真实接口，仍是前端本地数据驱动。

### 3. P6 还没有和真实后端错误码精细映射

当前 P6 已能承接：

- 无权限
- 登录失效
- 网络异常
- 系统错误

但还没有做到：

- 按正式后端错误码进行精细分流
- 不同接口场景下更细的异常文案映射

### 4. 未实现 refresh token / SSO / 权限中心

本期明确未覆盖：

- Refresh Token
- SSO 回调
- 权限中心
- 导出历史页

### 5. 浏览器自动化对 P1 草案生成的点击稳定性仍需后续验证

直接接口调用 `generate-draft` 是正常的，数据也能写入列表。

但在 `agent-browser` 自动化点击场景里，P1 的“生成草案”按钮出现过未稳定命中的现象。当前更倾向于：

- 自动化工具点击行为问题

而不是：

- 前端业务代码阻塞缺陷

这项不影响当前代码构建，也不影响接口本身，但如果后续要做持续浏览器回归，建议补一层更稳定的自动化断言。

## 验证结果

已通过：

- `npm.cmd run lint`
- `npm.cmd run build`

已验证接口：

- 登录成功/失败
- 列表查询
- 草案生成
- 详情保存
- 审核通过/退回
- 导出任务创建/轮询/下载

## 结论

如果按“一期真实后端接口接入方案”来看：

- 核心接入目标：已完成

如果按“正式生产后端完全接入”来看：

- 仍有后续项未完成

## 建议的下一步

1. 用这套已固定的契约去对接正式业务后端。
2. 优先替换认证、用例 CRUD、审核、导出任务四条主链路。
3. 再补 P5 知识基线真实接口。
4. 最后补 P6 与正式错误码映射、导出历史、自动化回归脚本。

## 相关文档

- `docs/backend-integration-phase1-summary-2026-03-18.md`
- `docs/prd-closure-summary-2026-03-18.md`
- `docs/solutions/integration-issues/stitch-static-ui-to-react-qmvs-20260317.md`
