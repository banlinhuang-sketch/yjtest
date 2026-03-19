# 亿境测试部 PRD 收尾总结

- 日期：2026-03-18
- 项目：亿境测试部测试用例管理平台
- 范围：P0 登录页、P1 工作台、P3 审核中心、共享数据流

## 本次完成项

### 1. P0 登录页补齐

- 新增统一认证跳转页风格的登录入口
- 首次进入平台默认落到 `P0`
- 使用 `sessionStorage` 保存当前会话登录态
- 登录后进入工作台，刷新后保持已登录状态

对应文件：

- [App.tsx](C:/Users/AORUS/Desktop/QMVS/app/src/App.tsx)
- [LoginView.tsx](C:/Users/AORUS/Desktop/QMVS/app/src/views/LoginView.tsx)
- [LoginView.css](C:/Users/AORUS/Desktop/QMVS/app/src/views/LoginView.css)

### 2. P1 内联编辑器补齐为完整编辑器

- 工作台右侧编辑区已补齐基础信息、长文本和结构化列表
- 现在支持在 `P1` 内直接编辑：
  - 标题、模块、负责人、范围、优先级、状态、标签
  - 测试目标、补充说明
  - 前置条件、执行步骤、预期结果、证据建议
- 生成草案后自动选中新建用例并在右侧打开完整编辑区
- 保留“进入 P2 全屏编辑”入口

对应文件：

- [WorkbenchView.tsx](C:/Users/AORUS/Desktop/QMVS/app/src/views/WorkbenchView.tsx)
- [CaseInlineEditor.tsx](C:/Users/AORUS/Desktop/QMVS/app/src/components/CaseInlineEditor.tsx)
- [caseFormAdapters.ts](C:/Users/AORUS/Desktop/QMVS/app/src/caseFormAdapters.ts)
- [App.css](C:/Users/AORUS/Desktop/QMVS/app/src/App.css)

### 3. P3 审核中心补齐 C24 分段视图

- 新增 `待审核 / 已处理` 分段切换
- `待审核` 视图保留审批动作
- `已处理` 视图改为只读预览与结果展示
- 审核通过或退回后，用例会从待审核中移除，并进入已处理视图
- 搜索、范围、优先级、提交人、时间筛选统一作用于当前分段

对应文件：

- [ReviewCenterView.tsx](C:/Users/AORUS/Desktop/QMVS/app/src/views/ReviewCenterView.tsx)
- [ReviewCenterView.css](C:/Users/AORUS/Desktop/QMVS/app/src/views/ReviewCenterView.css)

### 4. 主流程数据一致性继续保持

- `P1 / P2 / P3 / P4` 继续共享同一份用例数据
- `P3 -> P2` 仍然打开真实用例，而不是临时拼装详情
- `P1` 内联编辑后的变更会影响 `P3 / P4`
- `P3` 审核后的状态会影响 `P4` 导出可见结果

核心文件：

- [App.tsx](C:/Users/AORUS/Desktop/QMVS/app/src/App.tsx)
- [WorkbenchView.tsx](C:/Users/AORUS/Desktop/QMVS/app/src/views/WorkbenchView.tsx)
- [CaseDetailEditorView.tsx](C:/Users/AORUS/Desktop/QMVS/app/src/views/CaseDetailEditorView.tsx)
- [ReviewCenterView.tsx](C:/Users/AORUS/Desktop/QMVS/app/src/views/ReviewCenterView.tsx)
- [ExportCenterView.tsx](C:/Users/AORUS/Desktop/QMVS/app/src/views/ExportCenterView.tsx)

## 实现说明

- 本轮仍采用纯前端方案，不引入真实认证接口
- `P0` 采用“统一认证跳转页”方案，而非账号密码表单
- `P1` 结构化编辑复用了现有 `StructuredListEditor`
- 登录态与页面恢复依赖浏览器 `sessionStorage`

## 验证结果

已完成工程验证：

- `npm.cmd run lint`
- `npm.cmd run build`

结果：

- `lint` 通过
- `build` 通过

## 当前状态

本轮收尾后，原先确认的剩余 PRD 主项已经补齐，包括：

- P0 登录页
- P1 完整内联编辑器
- P3 分段视图

后续如果继续迭代，建议优先考虑：

1. 接入真实 SSO 或后端认证
2. 为 P1 内联编辑增加更强的保存反馈或草稿版本提示
3. 把 P3 的审核记录继续结构化沉淀到知识基线或历史审计视图
