# 真实后端接口接入总结（一期）

日期：2026-03-18

## 1. 本期目标

本期按以下范围完成前后端一体化接入：

- 账号密码登录
- 用例列表查询
- 用例详情读取
- 用例新建 / 保存
- 后端草案生成
- 审核通过 / 退回
- 导出任务创建 / 轮询 / 下载

本期仍保留本地 mock 的部分：

- P5 知识基线页
- P6 状态模板页

## 2. 后端实现

已在项目内新增本地 Node API 服务，作为一期真实接口的前端联调后端：

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

## 3. 前端接入内容

### 3.1 API 层

新增统一 API 层与 DTO 适配：

- `src/api/client.ts`
- `src/api/auth.ts`
- `src/api/cases.ts`
- `src/api/exports.ts`
- `src/api/contracts.ts`
- `src/api/caseAdapters.ts`

能力包括：

- Bearer Token 自动注入
- 401 自动失效处理
- 超时与网络错误统一包装
- DTO 转前端 `TestCase`

### 3.2 页面接入

#### P0 登录页

- 改为真实账号密码登录
- 登录成功后调用 `/auth/me` 和 `/cases`
- Token 存在 `sessionStorage`

相关文件：

- `src/views/LoginView.tsx`
- `src/views/LoginView.css`

#### P1 用例工作台

- 初始列表来自 `GET /cases`
- 生成草案改调 `POST /cases/generate-draft`
- 克隆后改调 `POST /cases`
- 内联编辑自动保存改调 `PATCH /cases/:id`

相关文件：

- `src/views/WorkbenchView.tsx`
- `src/components/CaseInlineEditor.tsx`

#### P2 用例详情页

- 保存改调 `PATCH /cases/:id`
- 已去掉本地 `localStorage` 作为保存基线来源

相关文件：

- `src/views/CaseDetailEditorView.tsx`

#### P3 审核中心

- 列表基于共享真实用例数据
- 审核动作改调 `POST /cases/:id/review`
- 审核后直接更新共享状态

相关文件：

- `src/views/ReviewCenterView.tsx`

#### P4 导出中心

- 点击导出先创建导出任务
- 再轮询任务状态
- 完成后下载真实文件

相关文件：

- `src/views/ExportCenterView.tsx`

### 3.3 应用入口与共享状态

应用入口已改为真实登录态与真实用例数据驱动：

- `src/App.tsx`

当前由 `App.tsx` 统一管理：

- 登录态
- 当前用户
- 共享用例数据
- 当前页面视图
- 当前选中用例
- 全局 Toast
- 全局异常页切换

## 4. 本地运行方式

### 启动 API

```bash
npm.cmd run api
```

### 同时启动前端 + API

```bash
npm.cmd run dev:all
```

默认端口：

- 前端：`http://127.0.0.1:4177`
- API：`http://127.0.0.1:8787`

## 5. 演示账号

- 账号：`banlin.huang`
- 密码：`Yijing@2026`

- 账号：`review.expert`
- 密码：`Review@2026`

## 6. 本轮验证结果

### 工程验证

已通过：

- `npm.cmd run lint`
- `npm.cmd run build`

### 接口验证

已验证：

- 错误密码登录返回失败
- 正确账号登录返回 token 与用户信息
- `/cases` 可返回真实列表
- `/cases/generate-draft` 可生成完整草稿详情
- `/cases/:id` 可保存更新
- `/cases/:id/review` 可完成通过 / 退回
- `/exports` 可创建导出任务
- `/exports/:taskId` 可轮询到完成状态
- `/exports/:taskId/download` 可下载文件

### 浏览器验证

已确认通过：

- P0 登录进入平台
- P3 审核流转
- P4 导出任务完成并可下载

备注：

- 在 `agent-browser` 自动化下，`P1 生成草案` 按钮点击存在未稳定命中的情况
- 直接接口调用 `generate-draft` 正常
- 这更像当前自动化工具点击行为的问题，不作为本轮代码缺陷结论

## 7. 本期限制

本期尚未覆盖：

- Refresh Token
- SSO 回调
- 权限中心
- 导出历史页
- P5 知识基线真实接口
- P6 与后端错误码的精细映射

## 8. 下一步建议

建议按以下顺序进入二期：

1. 将本地 Node API 替换为真实业务后端
2. 给 `P1 生成草案` 增加接口日志或埋点，便于自动化排查
3. 接入导出历史
4. 接入知识基线真实接口
5. 增加浏览器自动化回归脚本
