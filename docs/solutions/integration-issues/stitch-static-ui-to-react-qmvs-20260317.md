---
module: 亿境测试部
date: 2026-03-17
problem_type: integration_issue
component: tooling
symptoms:
  - "Stitch-generated screens were static HTML and Markdown assets that could not directly support stateful React workflows."
  - "P1, P4, and P5 had page-local empty or exceptional states instead of a shared reusable component."
  - "The new P5 knowledge baseline page required converting hardcoded cards into array-driven rendering with a consistent fallback state."
  - "The P5 sidebar layout produced oversized vertical gaps because the navigation stack used a stretching layout primitive."
root_cause: missing_tooling
resolution_type: code_fix
severity: medium
tags:
  - stitch-export
  - react
  - data-driven-ui
  - empty-state
  - knowledge-baseline
  - yijing-test-department
---

# Troubleshooting: 将 Stitch 静态页面接入亿境测试部 React 工作台并统一空状态组件

## Problem

亿境测试部这次连续接入了多张 Stitch 生成的静态页面和 Markdown 设计资产，包括 P1 用例工作台、P4 导出中心、P5 知识基线页，以及 P6 空状态规范。设计稿本身能提供视觉参考，但它们都是静态 HTML 或 Markdown 产物，不能直接承载 React 的真实数据流、状态管理和跨页面复用逻辑。

如果继续沿用静态结构，页面会很快出现两类问题：一类是列表、卡片、筛选和兜底状态都停留在硬编码层；另一类是 P1、P4、P5 会分别长出自己的空状态实现、文案和按钮行为，后续维护成本会持续变高。

## Environment

- Module: 亿境测试部
- Stack: Vite 8 + React + TypeScript
- Affected files:
  - `src/App.tsx`
  - `src/components/EmptyState.tsx`
  - `src/components/EmptyState.css`
  - `src/views/WorkbenchView.tsx`
  - `src/views/ExportCenterView.tsx`
  - `src/views/KnowledgeBaselineView.tsx`
  - `src/views/KnowledgeBaselineView.css`
- Design inputs:
  - `docs/ui-design-prd.md`
  - `stitch_exports/9704352910043583143/code/06-p5-knowledge-center.html`
  - `stitch_exports/15263127978283088284/code/07-p6-empty-state.html`
- Date solved: 2026-03-17

## Symptoms

- Stitch 导出的 screen 是静态结构，无法直接承载 `.map` 列表渲染、受控状态、筛选条件和空状态切换。
- P1 和 P4 已经存在页面级空状态实现，如果 P5 继续单独写，会导致重复实现和交互漂移。
- P5 知识基线页要求把知识库卡片改成数组驱动，同时补上统一的空状态兜底。
- P5 左侧导航在接入后出现过大的上下间距，视觉上不像企业后台，且每次微调都需要重复改局部数值。

## What Didn't Work

**Attempted Solution 1:** 直接把 Stitch 导出的 HTML 视为页面代码继续使用。  
- **Why it failed:** 这只能保留静态视觉结构，无法融入当前 React 工程的数据流和组件体系，也会让后续 API 接入变成二次重写。

**Attempted Solution 2:** 让每个页面各自维护空状态或异常状态组件。  
- **Why it failed:** P1、P4、P5 的文案、图标、布局和按钮行为会逐步分裂，后续想统一样式和交互时需要回头拆旧代码。

**Attempted Solution 3:** 在 P5 左侧导航中使用会撑满高度的布局方式。  
- **Why it failed:** 导航项被强行拉开，造成菜单上下相距过大，视觉节奏失衡，也增加了反复调 spacing 的成本。

## Solution

这次最终采用的是“静态导出只做参考，真实页面用 React 重建”的方式，并且把跨页面复用价值最高的空状态抽成了全局组件。

### 1. 先抽离全局 EmptyState 组件

新增 `src/components/EmptyState.tsx` 和 `src/components/EmptyState.css`，把空状态统一为一个可复用的 UI primitive，输入参数只有：

- `type`
- `title`
- `description`
- `actionText`
- `onAction`

这样 P1、P4、P5 不再分别维护自己的空白页逻辑。

```tsx
type EmptyStateType = 'no-data' | 'error' | 'no-permission' | '404'

const iconMap: Record<EmptyStateType, string> = {
  'no-data': 'inventory_2',
  error: 'error_outline',
  'no-permission': 'lock',
  '404': 'travel_explore',
}

export function EmptyState({
  type,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <section className="global-empty-state" role="status" aria-live="polite">
      <div className={`global-empty-state-icon ${type}`.trim()}>
        <Icon name={iconMap[type]} />
      </div>
      <div className="global-empty-state-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <button className="global-empty-state-action" type="button" onClick={onAction}>
        {actionText}
      </button>
    </section>
  )
}
```

### 2. 把 P5 知识基线页改成真正的数据驱动页面

在 `src/views/KnowledgeBaselineView.tsx` 中定义了 `KnowledgeSource` 类型和本地 mock 数组，把原先的静态知识库卡片改成 `.map` 渲染，并用 `randomDate(seed)` 生成真实感更强的最近更新时间。

```tsx
interface KnowledgeSource {
  id: string
  title: string
  category: KnowledgeCategory
  description: string
  updateDate: string
  accent: 'blue' | 'indigo' | 'teal' | 'red' | 'amber' | 'purple'
  icon: string
}

const [sources] = useState<KnowledgeSource[]>(mockKnowledgeSources)
const readyCount = useMemo(() => sources.length, [sources])

{sources.length ? (
  <section className="knowledge-grid">
    {sources.map((item) => (
      <KnowledgeCard key={item.id} item={item} />
    ))}
  </section>
) : (
  <EmptyState
    type="no-data"
    title="暂无知识基线"
    description="当前还没有同步到任何知识源，可以先触发一次全量同步。"
    actionText="同步全部资源"
    onAction={() => undefined}
  />
)}
```

### 3. 反向收敛 P1 和 P4 的空状态

把 `WorkbenchView.tsx` 和 `ExportCenterView.tsx` 里原本页面自带的空状态实现替换成同一个 `EmptyState` 组件：

```tsx
<EmptyState
  type="no-data"
  title="暂无对应范围的用例"
  description="可以切回全部范围，或直接从左侧需求输入区创建新的草稿用例。"
  actionText="去创建"
  onAction={focusComposer}
/>
```

```tsx
<EmptyState
  type="no-data"
  title="无匹配的导出数据"
  description="当前筛选条件下没有可导出的测试用例，调整范围、状态或标签后再试一次。"
  actionText="清空筛选"
  onAction={resetFilters}
/>
```

### 4. 把 P5 设为当前入口并修正侧边栏布局

在 `src/App.tsx` 中新增 `knowledge-baseline` 视图并设为默认入口，方便直接验证 P5。

```tsx
type WorkspaceView =
  | 'workbench'
  | 'case-detail'
  | 'review-center'
  | 'export-center'
  | 'knowledge-baseline'

const [view, setView] = useState<WorkspaceView>('knowledge-baseline')
```

同时，P5 左侧导航从会拉伸行高的布局切回了更适合后台菜单的纵向 `flex` 结构，解决菜单项上下相距过大的问题。

```css
.knowledge-sidebar-nav {
  flex: 1;
  padding: 18px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}

.knowledge-sidebar-item {
  min-height: 52px;
  padding: 0 18px;
  border-radius: 14px;
}
```

### 5. 验证结果

这轮收口后，以下验证均通过：

```bash
npm.cmd run build
npm.cmd run lint
```

## Why This Works

1. **把设计参考和应用代码分层了。**  
   Stitch HTML/PNG 继续保存在 `stitch_exports/` 里做设计依据，真正的页面逻辑则落在 `src/views/` 和 `src/components/` 中，不再混用。

2. **把跨页面状态抽到了共享原语层。**  
   空状态不再是页面私有实现，而是统一的组件契约。后续无论是 P6 404、无权限还是异常状态，都可以继续扩展，而不用回到每个页面重复造轮子。

3. **先建立数据模型，再做页面微调。**  
   P5 从一开始就定义了类型、mock 数据和 `.map` 渲染路径，后续接真实接口只需要替换数据源，不需要重写结构。

4. **修正了不适合导航场景的布局原语。**  
   垂直导航默认用 `flex-column` 比全高 `grid` 更稳定，能避免菜单项被拉得过松，也更符合企业后台的密度要求。

## Prevention

- 把 Stitch 导出视为设计参考资产，不要把它直接当成应用代码。
- 任何页面在进入视觉微调前，都先完成这四步：
  - 定义 TypeScript 数据结构
  - 准备真实感 mock 数据
  - 用 `.map` 完成渲染
  - 补齐 empty / filtered-empty / error / disabled 等状态
- 如果某个 UI 模式在 2 个页面里重复出现，就抽到 `src/components/`。
- 后台侧边栏默认用 `flex-direction: column`，除非有非常明确的行高控制需求，否则不要直接用会拉伸的 `grid`。
- 页面完成前至少跑一次：

```bash
npm.cmd run build
npm.cmd run lint
```

- 手动 QA 时至少检查：
  - 空状态居中是否正常
  - 侧边栏菜单上下密度是否均衡
  - 列表/卡片是否都来自 `.map`
  - 是否仍有页面私有的重复 EmptyState 实现

## Generated Markdown Artifacts

这次实现和以下 Markdown 资产直接相关：

- 设计主文档：[`../../ui-design-prd.md`](../../ui-design-prd.md)
- Stitch 导出的 PRD 快照：
  - [`../../../../stitch_exports/15263127978283088284/code/01-ui-design-prd-1801255541382860650.md`](../../../../stitch_exports/15263127978283088284/code/01-ui-design-prd-1801255541382860650.md)
  - [`../../../../stitch_exports/15263127978283088284/code/02-ui-design-prd-1801255541382857325.md`](../../../../stitch_exports/15263127978283088284/code/02-ui-design-prd-1801255541382857325.md)

## Related Issues

相关静态设计与导出资产：

- P1 静态稿：[`../../../../stitch_exports/9704352910043583143/code/01-p1-workbench-zh.html`](../../../../stitch_exports/9704352910043583143/code/01-p1-workbench-zh.html)
- P4 静态稿：[`../../../../stitch_exports/9704352910043583143/code/04-p4-export-center-icon-optimized.html`](../../../../stitch_exports/9704352910043583143/code/04-p4-export-center-icon-optimized.html)
- P5 静态稿：[`../../../../stitch_exports/9704352910043583143/code/06-p5-knowledge-center.html`](../../../../stitch_exports/9704352910043583143/code/06-p5-knowledge-center.html)
- P5 另一版导出：[`../../../../stitch_exports/15263127978283088284/code/06-p5-knowledge-baseline.html`](../../../../stitch_exports/15263127978283088284/code/06-p5-knowledge-baseline.html)
- P6 空状态静态稿：[`../../../../stitch_exports/15263127978283088284/code/07-p6-empty-state.html`](../../../../stitch_exports/15263127978283088284/code/07-p6-empty-state.html)

当前工作区里还没有其他 `docs/solutions/` 条目，因此这份文档是第一条解决方案记录。也没有发现可交叉引用的 GitHub issue。
