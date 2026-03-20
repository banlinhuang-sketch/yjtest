# 审计日志页面与浏览器自动化回归 Phase 2 总结

## 本轮完成

- 补齐了审计日志页面，并把它接入了应用主导航。
- 新增了可执行的 Playwright 浏览器自动化回归链路。
- 修复了 Windows 下浏览器回归启动脚本的兼容问题。
- 修复了 `P4 导出中心` 在真实下载时因缺少 `Bearer Token` 导致的 `401` 问题。
- 让浏览器回归从“脚本已写”升级为“本地可直接跑通”。

## 关键改动

### 1. 审计日志页面接入

- 新增审计日志 API 调用层：`src/api/audit.ts`
- 新增审计日志页面：
  - `src/views/AuditLogView.tsx`
  - `src/views/AuditLogView.css`
- 应用壳层新增审计日志视图与数据加载：
  - `src/App.tsx`
- 统一侧栏导航项来源，支持管理员显示“审计日志”入口：
  - `src/workspaceSidebarItems.ts`
- 相关页面接入审计日志入口与用户信息透传：
  - `src/views/WorkbenchView.tsx`
  - `src/views/ReviewCenterView.tsx`
  - `src/views/ExportCenterView.tsx`
  - `src/views/KnowledgeBaselineView.tsx`
  - `src/views/EmptyStateView.tsx`

### 2. 浏览器自动化回归基础设施

- 新增 Playwright 配置：`playwright.config.ts`
- 新增测试专用 API 启动脚本：`scripts/browser-api-server.mjs`
- 新增测试专用 Web 启动脚本：`scripts/browser-web-server.mjs`
- 新增端到端回归脚本：`tests/browser/regression.spec.ts`
- 新增运行命令：
  - `npm run playwright:install`
  - `npm run test:browser`
  - `npm run test:browser:headed`

### 3. 为保证回归可执行做的修复

- `scripts/browser-web-server.mjs`
  - 由直接 `spawn vite.cmd` 改为 Windows 兼容的 `cmd.exe /c npm.cmd run dev`
  - 解决 `spawn EINVAL`
- `playwright.config.ts`
  - 优先使用系统已安装的 Chrome / Edge
  - 关闭 `video` 依赖，避免 `ffmpeg` 未下载时阻塞
- `src/api/exports.ts`
  - 新增带认证头的导出文件下载逻辑
- `src/views/ExportCenterView.tsx`
  - `P4` 改为通过认证 `fetch + Blob` 执行下载
  - 新增导出成功 / 失败状态的测试标识
- `tests/browser/regression.spec.ts`
  - 选择器收紧为 `data-testid`
  - 导出断言改为页面成功状态
  - 审计日志入口改为走左侧栏

## 浏览器回归覆盖范围

当前自动化链路覆盖：

1. `P0` 登录
2. `P1` 生成草案并修改状态
3. `P3` 审核通过
4. `P4` 导出成功
5. `审计日志页面` 搜索并校验记录存在

## 验证结果

已通过：

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run test:browser`

最终浏览器回归结果：

```text
1 passed (12.9s)
```

## 使用方式

在项目目录执行：

```bash
cd /d C:\Users\AORUS\Desktop\QMVS\app
npm run test:browser
```

如需可视化运行：

```bash
cd /d C:\Users\AORUS\Desktop\QMVS\app
npm run test:browser:headed
```

## 当前价值

- 审计日志不再只有后端接口，已经有可用的管理员页面。
- 浏览器主链路已经有稳定的自动化回归入口。
- `P4` 的导出下载逻辑更接近真实正式环境。
- 后续继续做正式后端联调时，可以直接复用这套回归脚本做验证。

## 下一步建议

1. 把这轮改动提交并推送到远端仓库。
2. 给浏览器回归再补一条失败路径用例：
   - 登录失败
   - 无权限审核
   - 空导出结果
3. 开始用真实正式后端地址跑 `smoke:formal` 和浏览器联调回归。
