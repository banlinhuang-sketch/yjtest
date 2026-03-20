# 数据库迁移预案（第一版）

## 本轮完成内容

本轮不是直接把 SQLite 切到 MySQL/PostgreSQL，而是先把后续迁移真正需要的基础能力补齐：

1. 固化当前 SQLite 结构快照能力
2. 固化当前 SQLite 全量数据快照能力
3. 形成迁移前检查、迁移顺序、验证与回滚建议

对应脚本：

- `npm run db:report`
- `npm run db:export-snapshot`

输出目录默认位于：

- `server/migration-snapshots/`

## 当前数据库对象

当前 SQLite 主要表如下：

- `users`
- `cases`
- `knowledge_sources`
- `audit_logs`
- `export_records`

其中以下字段当前以 JSON 字符串形式存储，迁移到 MySQL/PostgreSQL 时需要重点处理：

- `cases.tags_json`
- `cases.preconditions_json`
- `cases.steps_json`
- `cases.attachments_json`
- `cases.activity_json`
- `audit_logs.metadata_json`
- `export_records.filters_json`

## 推荐迁移目标

### 优先推荐 PostgreSQL

原因：

- 原生 JSON/JSONB 更适合当前数据结构
- 后续如果做 RAG 或向量检索，可进一步接 `pgvector`
- 对复杂查询和审计查询更友好

### MySQL 也可行

如果团队现有基础设施主要是 MySQL，也可以迁移到 MySQL 8+。当前模型不依赖 SQLite 特有能力，主要需要处理：

- JSON 字段改为 `JSON`
- `TEXT PRIMARY KEY` 改为 `VARCHAR`
- 时间字段统一为 `DATETIME` 或 `TIMESTAMP`

## 表级迁移建议

### users

- `id`: `VARCHAR(64)`
- `username`: `VARCHAR(128)` + unique index
- `password_hash`: `TEXT`
- `name`: `VARCHAR(128)`
- `role_code`: `VARCHAR(32)`
- `role_label`: `VARCHAR(64)`
- `status`: `VARCHAR(32)`
- `created_at`, `updated_at`: `TIMESTAMP`

### cases

- 主表字段保持标量列
- `tags / preconditions / steps / attachments / activity` 一期可先保留 JSON
- 如果后续要做复杂检索，再拆分子表

### knowledge_sources

- 直接迁移为普通业务表
- 建议对 `category`、`updated_at` 建索引

### audit_logs

- 建议对以下字段建索引：
  - `actor_id`
  - `action`
  - `target_type`
  - `target_id`
  - `created_at`

### export_records

- 保留 `task_id` 唯一约束
- 建议对以下字段建索引：
  - `actor_id`
  - `status`
  - `created_at`

## 迁移顺序建议

1. 先冻结当前 SQLite schema 与数据快照
2. 在目标数据库创建同构表结构
3. 导入基础字典数据：
   - `users`
   - `knowledge_sources`
4. 导入核心业务数据：
   - `cases`
5. 导入追踪数据：
   - `audit_logs`
   - `export_records`
6. 切换后端数据库访问层
7. 跑功能回归与数据核对

## 迁移前必做检查

执行：

```bash
npm run db:report
npm run db:export-snapshot
```

建议同时保留：

- 最近一份 SQLite 备份
- 最近一份 migration snapshot
- 当前后端版本号或 git commit id

## 迁移验证建议

至少核对下面几项：

1. 用户数量一致
2. 用例数量一致
3. 知识源数量一致
4. 审计日志数量一致
5. 导出记录数量一致
6. 随机抽查 3-5 条用例，确认 JSON 字段未丢失
7. 登录、保存、审核、导出全链路回归通过

## 回滚建议

如果切换后出现严重问题：

1. 停止新数据库写入
2. 切回 SQLite 版本的后端配置
3. 使用最近 SQLite 备份恢复
4. 保留问题数据库快照用于排查

## 本轮交付物

- 数据库结构快照脚本：`scripts/db-schema-report.mjs`
- SQLite 全量迁移快照脚本：`scripts/sqlite-export-snapshot.mjs`
- `npm scripts`：
  - `db:report`
  - `db:export-snapshot`

## 下一步建议

如果继续推进正式化，数据库这条线建议按下面顺序做：

1. 抽象后端存储层接口，避免业务逻辑直接依赖 SQLite 细节
2. 先做 PostgreSQL 或 MySQL 的表结构草案
3. 做一次离线导入演练
4. 再做正式切换
