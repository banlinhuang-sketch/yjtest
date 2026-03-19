# 后端接口契约矩阵（一期）

## 认证接口

### `POST /api/v1/auth/login`

请求体：

```json
{
  "username": "banlin.huang",
  "password": "Yijing@2026"
}
```

成功响应：

```json
{
  "accessToken": "token-string",
  "user": {
    "id": "user-banlin",
    "name": "Banlin Huang",
    "role": "测试设计负责人"
  }
}
```

### `GET /api/v1/auth/me`

请求头：

```http
Authorization: Bearer <token>
```

成功响应：

```json
{
  "id": "user-banlin",
  "name": "Banlin Huang",
  "role": "测试设计负责人"
}
```

## 用例接口

### `GET /api/v1/cases`

查询参数：

- `keyword`
- `scope`
- `status`
- `priority`
- `submitter`
- `updatedFrom`
- `updatedTo`
- `page`
- `pageSize`
- `timeRange`
- `tag`

成功响应：

```json
{
  "items": [
    {
      "id": "TC-APP-101",
      "title": "App 蓝牙首次配对引导与权限弹窗链路完整性校验",
      "feature": "蓝牙配对 / 首次安装",
      "scope": "app",
      "priority": "P0",
      "status": "待审核",
      "owner": "客户端 QA",
      "submitter": "李聪",
      "tags": ["蓝牙配对", "权限"],
      "updatedAt": "2026-03-18T11:15:00+08:00"
    }
  ],
  "total": 1
}
```

### `GET /api/v1/cases/:id`

成功响应：

```json
{
  "id": "TC-APP-101",
  "title": "App 蓝牙首次配对引导与权限弹窗链路完整性校验",
  "feature": "蓝牙配对 / 首次安装",
  "scope": "app",
  "priority": "P0",
  "status": "待审核",
  "owner": "客户端 QA",
  "submitter": "李聪",
  "tags": ["蓝牙配对", "权限"],
  "updatedAt": "2026-03-18T11:15:00+08:00",
  "objective": "验证权限申请顺序和引导链路是否正确。",
  "notes": "覆盖 iOS 与 Android 差异。",
  "preconditions": ["App 已安装并登录"],
  "steps": [
    {
      "action": "进入蓝牙配对模块",
      "expected": "出现首次配对引导",
      "evidence": "页面截图"
    }
  ],
  "attachments": [],
  "activity": [],
  "reviewNote": ""
}
```

### `POST /api/v1/cases`

用途：

- 新建空白用例
- 克隆后保存

### `PATCH /api/v1/cases/:id`

用途：

- `P1` 内联编辑保存
- `P2` 全屏详情保存

### `POST /api/v1/cases/generate-draft`

请求体：

```json
{
  "scope": "linked",
  "title": "双端联动断连恢复验证",
  "requirement": "验证手机与眼镜短暂断连后的恢复能力。"
}
```

成功响应：

- 返回完整 `CaseDetailDTO`

### `POST /api/v1/cases/:id/review`

请求体：

```json
{
  "action": "approve",
  "reviewNote": "场景覆盖充分，可以沉淀。"
}
```

说明：

- `approve` -> 状态流转到 `已沉淀`
- `reject` -> 状态流转到 `草稿`
- `reject` 时 `reviewNote` 必填

## 导出接口

### `POST /api/v1/exports`

请求体：

```json
{
  "format": "excel",
  "filters": {
    "keyword": "",
    "scope": "all",
    "status": "all",
    "priority": "all",
    "timeRange": "all",
    "tag": "all"
  }
}
```

成功响应：

```json
{
  "taskId": "export-task-id",
  "status": "pending"
}
```

### `GET /api/v1/exports/:taskId`

成功响应：

```json
{
  "taskId": "export-task-id",
  "status": "completed",
  "fileName": "导出用例_1710763100000.xlsx",
  "downloadUrl": "/api/v1/exports/export-task-id/download"
}
```

失败响应示例：

```json
{
  "taskId": "export-task-id",
  "status": "failed",
  "errorMessage": "无匹配的导出数据，请调整筛选条件。"
}
```

## 知识基线接口

### `GET /api/v1/knowledge/sources`

成功响应：

```json
{
  "items": [
    {
      "id": "KB-BUSINESS-001",
      "title": "App 业务知识库",
      "category": "business",
      "categoryLabel": "业务知识",
      "summary": "沉淀账号体系、蓝牙配对、通知同步等规则。",
      "updatedAt": "2026-03-17",
      "icon": "smartphone",
      "accent": "blue"
    }
  ],
  "total": 1
}
```

## 错误语义

- `401`：登录失效 / 未登录
- `403`：无权限访问
- `404`：目标资源不存在或当前无数据
- `422`：表单校验失败
- `5xx`：系统异常
- 网络失败 / 超时：前端统一映射为网络异常

## 前端环境变量

- `VITE_API_BASE_URL`
- `VITE_DEV_API_PROXY_TARGET`
- `VITE_API_TIMEOUT_MS`
