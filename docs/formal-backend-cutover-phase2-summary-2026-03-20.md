# 正式后端切换联调 Phase 2 总结

## 本轮完成

- 把正式后端切换从“只兼容响应”推进到“部分兼容请求侧”。
- 新增了可配置的 API 路由与查询参数映射层。
- 为登录、列表、草案生成、审核、导出创建请求侧别名兼容。
- 新增了只读的正式后端浏览器 smoke，不会修改线上数据。

## 关键改动

### 1. 请求侧适配层

新增文件：

- `src/api/requestAdapter.ts`

能力包括：

- 可通过环境变量覆盖主要 API 路由：
  - 认证
  - 用例列表/详情
  - 草案生成
  - 审核
  - 导出
  - 知识源
  - 审计日志
- 可通过环境变量覆盖常见查询参数名：
  - `page`
  - `pageSize`
  - `limit`
- 对常见正式后端入参风格增加别名兼容：
  - 登录：`username / userName / loginName / account`
  - 草案生成：`requirement / requirementSummary / summary`
  - 审核：`reviewNote / review_note / comment / decision`
  - 用例保存：补充 `module / scopeType / priorityLevel / state / tagList / preconditionList / stepList`
  - 导出任务：补充 `exportType / type / query`

### 2. API 层改为统一走请求适配

已接入：

- `src/api/auth.ts`
- `src/api/cases.ts`
- `src/api/exports.ts`
- `src/api/knowledge.ts`
- `src/api/audit.ts`

这样后续切正式后端时，不需要再去页面层逐个改接口路径或入参结构。

### 3. 正式后端只读浏览器 smoke

新增：

- `playwright.formal.config.ts`
- `tests/browser/formal-smoke.spec.ts`

新增命令：

```bash
npm run test:browser:formal
npm run test:browser:formal:headed
```

这条 smoke 默认是只读的，覆盖：

1. 登录
2. `P1` 工作台加载
3. `P3` 审核页加载
4. `P4` 导出页加载
5. `P5` 知识基线加载
6. 如提供管理员账号，再验证审计日志页加载

它不会：

- 创建用例
- 修改用例
- 审核通过/退回
- 导出文件

因此适合直接对正式环境做安全探活。

## 环境变量补充

已补充：

- `.env.example`
- `.env.formal.example`

新增内容包括：

- `VITE_API_QUERY_PAGE_KEY`
- `VITE_API_QUERY_PAGE_SIZE_KEY`
- `VITE_API_QUERY_LIMIT_KEY`
- `VITE_API_ROUTE_*`
- `FORMAL_BROWSER_*`

## 推荐联调方式

### 1. API 只读 smoke

```bash
set FORMAL_API_BASE_URL=https://your-formal-backend.example.com
set FORMAL_API_USERNAME=banlin.huang
set FORMAL_API_PASSWORD=replace-me
set FORMAL_API_ADMIN_USERNAME=admin.root
set FORMAL_API_ADMIN_PASSWORD=replace-me
npm run smoke:formal
```

### 2. 浏览器只读 smoke

```bash
set FORMAL_API_BASE_URL=https://your-formal-backend.example.com
set FORMAL_BROWSER_USERNAME=banlin.huang
set FORMAL_BROWSER_PASSWORD=replace-me
set FORMAL_BROWSER_ADMIN_USERNAME=admin.root
set FORMAL_BROWSER_ADMIN_PASSWORD=replace-me
npm run test:browser:formal
```

## 当前价值

- 切正式后端时，不再只靠响应包裹兼容。
- 请求路径、分页参数、常见字段命名都已经有适配入口。
- 可以先跑“API 探活”，再跑“只读浏览器 smoke”，降低联调风险。
- 页面层仍保持不变，切换成本集中在 `src/api/` 和环境变量。

## 下一步建议

1. 拿到正式后端实际返回样例后，把当前“宽兼容”收紧成“精确映射”。
2. 如正式后端支持稳定测试账号，可把 `test:browser:formal` 接入 CI 的手工触发流程。
3. 联调完成后，再决定是否需要对正式后端补一条“可写”的预发布回归链路。
