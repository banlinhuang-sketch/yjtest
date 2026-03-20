# 浏览器自动化回归脚本一期

已新增：

- `Playwright` 配置：`playwright.config.ts`
- 独立测试 API 启动脚本：`scripts/browser-api-server.mjs`
- 独立测试 Web 启动脚本：`scripts/browser-web-server.mjs`
- 主链路回归：`tests/browser/regression.spec.ts`

覆盖链路：

1. `P0` 登录
2. `P1` 生成草案并进入内联编辑
3. `P3` 审核通过
4. `P4` 导出下载
5. 审计日志页检索

运行命令：

```bash
npm run playwright:install
npm run test:browser
```

如果需要可见浏览器：

```bash
npm run test:browser:headed
```
