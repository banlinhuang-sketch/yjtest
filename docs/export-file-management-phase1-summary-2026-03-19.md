# 导出文件管理 Phase 1 总结

## 已完成

- 导出任务在完成后会将文件写入 `server/exports/`
- 导出文件名采用统一规则：`导出用例_时间戳.xlsx|docx`
- 导出结果会持久化到 SQLite 的 `export_records` 表
- 新增导出历史接口：`GET /api/v1/exports/history?limit=50`
- 历史接口支持普通用户只看自己的记录，管理员查看全部
- 导出下载继续通过 `GET /api/v1/exports/:taskId/download`
- 新增导出文件清理脚本：`npm run cleanup:exports`

## 关键文件

- `server/database.mjs`
- `server/store.mjs`
- `server/index.mjs`
- `scripts/api-smoke.mjs`
- `scripts/export-cleanup.mjs`

## 验证结果

- `npm.cmd run lint`
- `npm.cmd run build`
- 临时端口 `8795` + 临时 SQLite 数据库验证通过
- `npm.cmd run smoke:api` 通过
- 导出历史接口返回已完成任务

## 当前行为

### 创建导出任务

`POST /api/v1/exports`

- 立即返回 `taskId`
- 后台异步处理导出
- 成功后写入磁盘并更新 `export_records`
- 失败时保留错误消息

### 查询导出历史

`GET /api/v1/exports/history?limit=50`

返回字段包含：

- `taskId`
- `actorId`
- `actorName`
- `actorRoleCode`
- `format`
- `fileName`
- `status`
- `createdAt`
- `updatedAt`
- `completedAt`
- `errorMessage`
- `downloadUrl`

### 清理导出文件

默认保留最近 `14` 天的导出文件：

```bash
npm run cleanup:exports
```

仅预览，不实际删除：

```bash
node scripts/export-cleanup.mjs --dry-run
```

自定义保留天数：

```bash
EXPORT_CLEANUP_RETENTION_DAYS=30 npm run cleanup:exports
```

## 下一步建议

- 增加导出历史页面
- 在管理端增加导出失败重试
- 给清理脚本配定时任务
- 导出记录补充文件大小和耗时
