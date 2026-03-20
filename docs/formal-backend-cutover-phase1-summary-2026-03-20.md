# 正式后端切换联调一期

已新增：

- 正式后端 Smoke 脚本：`scripts/formal-backend-smoke.mjs`
- 环境变量样例：`.env.formal.example`

当前能力：

- 真实登录校验
- `auth/me` 校验
- 用例列表与详情读取
- 知识源接口探测
- 可选管理员审计日志探测

运行方式：

```bash
set FORMAL_API_BASE_URL=https://your-formal-backend.example.com
set FORMAL_API_USERNAME=banlin.huang
set FORMAL_API_PASSWORD=replace-me
set FORMAL_API_ADMIN_USERNAME=admin.root
set FORMAL_API_ADMIN_PASSWORD=replace-me
npm run smoke:formal
```

这份脚本默认做非破坏性检查，不会创建、修改或删除正式环境数据。
