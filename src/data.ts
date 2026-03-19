import { supplementalCaseSeeds } from './caseSeeds.ts'
import type { KnowledgeResource, Scope, TestCase } from './types.ts'

const now = (value: string) => new Date(value).getTime()

function formatCaseUpdatedLabel(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export const scopeMeta: Record<
  Scope,
  {
    label: string
    description: string
    badgeClass: string
    defaultFeature: string
    lenses: string[]
    defaultPreconditions: string[]
    defaultSteps: TestCase['steps']
  }
> = {
  app: {
    label: '手机 App',
    description: '覆盖业务流程、权限、通知、前后台切换与弱网恢复。',
    badgeClass: 'badge-app',
    defaultFeature: 'App 业务流程',
    lenses: ['登录态', '权限', '通知', '前后台切换'],
    defaultPreconditions: [
      '手机 App 已登录测试账号并完成基础初始化。',
      '当前网络与权限状态满足主链路进入条件。',
    ],
    defaultSteps: [
      {
        action: '进入 App 对应模块并完成主路径操作。',
        expected: '页面状态与数据展示符合 PRD 说明。',
        evidence: '页面截图',
      },
      {
        action: '切换前后台或模拟弱网后再次进入同一路径。',
        expected: '关键状态恢复正确，无异常提示或数据丢失。',
        evidence: '客户端日志',
      },
    ],
  },
  glasses: {
    label: '智能眼镜',
    description: '覆盖语音、手势、提示态、佩戴态与低电量边界。',
    badgeClass: 'badge-glasses',
    defaultFeature: '眼镜单端能力',
    lenses: ['语音', '手势', '提示态', '低电量'],
    defaultPreconditions: [
      '眼镜设备已连接测试环境并处于可操作状态。',
      '相关硬件能力与权限已开启。',
    ],
    defaultSteps: [
      {
        action: '在眼镜端进入目标功能入口并触发目标动作。',
        expected: '提示文案、视觉反馈和设备状态符合设计预期。',
        evidence: '眼镜录屏',
      },
      {
        action: '切换设备状态或边界条件后再次验证。',
        expected: '低电量、离线或异常条件下仍有明确反馈。',
        evidence: '设备日志',
      },
    ],
  },
  linked: {
    label: '双端联动',
    description: '覆盖配对、同步、断连重连与状态一致性。',
    badgeClass: 'badge-linked',
    defaultFeature: '双端联动',
    lenses: ['配对链路', '同步机制', '断连重连', '状态一致性'],
    defaultPreconditions: [
      '手机 App 与眼镜已完成绑定，并使用同一测试账号登录。',
      '蓝牙与通知等联动依赖权限已授权。',
    ],
    defaultSteps: [
      {
        action: '在手机端触发业务动作并观察眼镜端反馈。',
        expected: '眼镜端在预期时延内收到正确联动展示。',
        evidence: '双端录屏',
      },
      {
        action: '模拟链路中断后恢复连接并重复验证。',
        expected: '恢复后状态一致，无重复弹卡或数据缺失。',
        evidence: '链路日志',
      },
    ],
  },
}

const sampleCasesSeed: TestCase[] = [
  {
    id: 'TC-LINK-001',
    title: '首次配对后消息通知同步',
    feature: '通知联动',
    scope: 'linked',
    priority: 'P0',
    status: '待审核',
    owner: '系统测试组',
    submitter: '王宁',
    objective:
      '验证手机端打开消息通知同步后，眼镜端能在 3 秒内收到卡片并保持未读状态一致。',
    notes:
      '重点关注首次授权、通知权限变更、断连重连后重复提醒等高频回归风险。',
    tags: ['通知', '首次配对', '联动'],
    preconditions: [
      '手机 App 已登录测试账号，蓝牙和通知权限已授权。',
      '眼镜设备已完成首次绑定并保持在线。',
    ],
    steps: [
      {
        action: '在手机 App 中开启消息通知同步开关。',
        expected: '开关状态立即生效，设置页无异常提示。',
        evidence: '设置页截图',
      },
      {
        action: '向测试账号发送一条即时消息。',
        expected: '眼镜端 3 秒内收到消息卡片。',
        evidence: '眼镜录屏',
      },
      {
        action: '在眼镜端打开消息详情后返回主页。',
        expected: '手机端未读数与眼镜端展示状态同步更新。',
        evidence: '联动日志片段',
      },
    ],
    attachments: [
      { name: '通知联动录屏.mp4', kind: 'video' },
      { name: '蓝牙链路日志.log', kind: 'log' },
    ],
    activity: [
      { time: '今天 14:30', detail: '你修改了步骤 2 的预期结果。', tone: 'primary' },
      { time: '今天 11:10', detail: '王宁补充了首次授权说明。', tone: 'positive' },
      { time: '昨天 18:20', detail: '系统创建了该用例。', tone: 'neutral' },
    ],
    reviewNote: '建议补充“关闭通知权限后再次打开”的回归路径。',
    updatedAtLabel: '03-17 14:30',
    updatedAtEpoch: now('2026-03-17T14:30:00+08:00'),
  },
  {
    id: 'TC-APP-014',
    title: 'App 退后台后连接态恢复',
    feature: '连接稳定性',
    scope: 'app',
    priority: 'P1',
    status: '草稿',
    owner: '冒烟回归',
    submitter: '赵琪',
    objective:
      '验证 App 切至后台 30 秒后回到前台，连接状态、提示文案和设备卡片是否恢复正确。',
    notes: '常与权限弹窗、弱网切换叠加出现，是 App 侧高频回归入口。',
    tags: ['前后台', '连接态', '恢复'],
    preconditions: [
      '手机 App 已与眼镜保持稳定连接。',
      '当前网络状态正常，设备电量高于 50%。',
    ],
    steps: [
      {
        action: '进入设备管理页并确认当前状态为已连接。',
        expected: '设备卡片显示在线、连接强度正常。',
        evidence: '设备管理页截图',
      },
      {
        action: '将 App 退至后台 30 秒后切回前台。',
        expected: '5 秒内恢复正确连接态，不出现重复 Toast。',
        evidence: '前后台切换录屏',
      },
      {
        action: '再次进入消息同步设置页验证状态。',
        expected: '设置项保持开启状态，文案无闪烁。',
        evidence: 'App 客户端日志',
      },
    ],
    attachments: [{ name: '前后台恢复截图.png', kind: 'image' }],
    activity: [
      { time: '今天 10:05', detail: '赵琪创建了草稿。', tone: 'primary' },
      { time: '昨天 16:40', detail: '系统同步了模块标签。', tone: 'neutral' },
    ],
    reviewNote: '',
    updatedAtLabel: '03-17 10:05',
    updatedAtEpoch: now('2026-03-17T10:05:00+08:00'),
  },
  {
    id: 'TC-GLS-008',
    title: '眼镜语音唤起导航卡片',
    feature: '语音交互',
    scope: 'glasses',
    priority: 'P1',
    status: '已沉淀',
    owner: '体验专项',
    submitter: '刘珂',
    objective:
      '验证眼镜端通过语音指令唤起导航卡片时，提示文案、播报和视觉反馈保持一致。',
    notes: '适合作为眼镜单端能力基线，可继续派生为双端导航联动场景。',
    tags: ['语音', '导航', '单端'],
    preconditions: [
      '眼镜已进入可唤醒状态。',
      '导航功能已配置测试地点。',
    ],
    steps: [
      {
        action: '佩戴眼镜并完成语音唤醒。',
        expected: '唤醒词识别成功，状态灯进入监听态。',
        evidence: '状态灯照片',
      },
      {
        action: '说出“开始导航到公司”指令。',
        expected: '导航卡片成功展示，播报文案与卡片标题一致。',
        evidence: '眼镜录屏',
      },
      {
        action: '取消导航后再次发起相同指令。',
        expected: '卡片状态清空后重新展示，不残留旧路径。',
        evidence: '设备日志',
      },
    ],
    attachments: [{ name: '语音识别结果.csv', kind: 'doc' }],
    activity: [
      { time: '03-15 09:50', detail: '刘珂将状态更新为已沉淀。', tone: 'positive' },
      { time: '03-14 19:20', detail: '系统补充了语音识别日志。', tone: 'neutral' },
    ],
    reviewNote: '可作为知识基线案例。',
    updatedAtLabel: '03-15 09:50',
    updatedAtEpoch: now('2026-03-15T09:50:00+08:00'),
  },
  {
    id: 'TC-LINK-015',
    title: '断连后消息队列重新同步',
    feature: '链路恢复',
    scope: 'linked',
    priority: 'P0',
    status: '待审核',
    owner: '链路专项',
    submitter: '陈雪',
    objective:
      '验证蓝牙断连 60 秒后重连，眼镜端能补齐未展示的消息队列且不重复弹卡。',
    notes: '该场景是通知联动的大促前置回归项。',
    tags: ['断连重连', '通知', '联动'],
    preconditions: [
      '双端已完成绑定并开启通知同步。',
      '测试账号中有可触发的待收消息。',
    ],
    steps: [
      {
        action: '手动关闭蓝牙并保持 60 秒。',
        expected: '设备状态切换为离线，App 侧出现弱链路提示。',
        evidence: '离线状态截图',
      },
      {
        action: '恢复蓝牙连接并等待自动重连。',
        expected: '30 秒内自动恢复连接且不需要重新授权。',
        evidence: '重连日志',
      },
      {
        action: '查看眼镜端消息卡片展示顺序。',
        expected: '补发消息顺序正确且无重复弹出。',
        evidence: '消息补发录屏',
      },
    ],
    attachments: [{ name: '消息队列分析.xlsx', kind: 'doc' }],
    activity: [
      { time: '今天 09:20', detail: '陈雪提交了审核请求。', tone: 'primary' },
      { time: '昨天 20:15', detail: '系统新增“断连重连”标签。', tone: 'neutral' },
    ],
    reviewNote: '需要再补一条“弱网+断连并发”的边界说明。',
    updatedAtLabel: '03-17 09:20',
    updatedAtEpoch: now('2026-03-17T09:20:00+08:00'),
  },
  {
    id: 'TC-GLS-021',
    title: '低电量下语音提示降级',
    feature: '设备边界',
    scope: 'glasses',
    priority: 'P2',
    status: '待审核',
    owner: '设备专项',
    submitter: '孙晨',
    objective:
      '验证眼镜电量低于 10% 时，语音提示、卡片样式和功能限制策略是否符合设计规范。',
    notes: '建议后续补充“充电恢复后状态解除”用例。',
    tags: ['低电量', '语音', '边界'],
    preconditions: [
      '眼镜电量已降至 10% 以下。',
      '设备系统版本为最新测试基线。',
    ],
    steps: [
      {
        action: '唤起语音助手并发起任意导航指令。',
        expected: '系统提示当前为低电量模式，并限制高功耗能力。',
        evidence: '低电量提示截图',
      },
      {
        action: '观察卡片颜色、图标和文案。',
        expected: '低电量视觉样式符合设计稿，无遮挡或截断。',
        evidence: '视觉比对图片',
      },
    ],
    attachments: [{ name: '低电量模式说明.pdf', kind: 'doc' }],
    activity: [
      { time: '03-16 17:45', detail: '孙晨更新了低电量预期结果。', tone: 'primary' },
      { time: '03-15 13:10', detail: '系统创建了该用例。', tone: 'neutral' },
    ],
    reviewNote: '',
    updatedAtLabel: '03-16 17:45',
    updatedAtEpoch: now('2026-03-16T17:45:00+08:00'),
  },
]

export const sampleKnowledge: KnowledgeResource[] = [
  {
    id: 'KB-001',
    title: 'App 业务知识库',
    category: 'business',
    categoryLabel: '业务文档',
    summary: '沉淀核心业务流程、关键页面状态机和主链路交互规范。',
    updatedAt: '2 小时前',
    icon: 'mobile_friendly',
    accent: '#145bff',
  },
  {
    id: 'KB-002',
    title: '眼镜能力基线',
    category: 'hardware',
    categoryLabel: '硬件能力',
    summary: '记录眼镜的传感器、续航、提示态和语音能力边界。',
    updatedAt: '1 天前',
    icon: 'visibility',
    accent: '#7c3aed',
  },
  {
    id: 'KB-003',
    title: '交互流程标准',
    category: 'flow',
    categoryLabel: '交互流程',
    summary: '沉淀配对、同步、断连重连等典型双端交互流程。',
    updatedAt: '3 天前',
    icon: 'account_tree',
    accent: '#0f766e',
  },
  {
    id: 'KB-004',
    title: '历史缺陷归档',
    category: 'history',
    categoryLabel: '历史缺陷',
    summary: '汇总高价值缺陷、修复策略和后续回归重点。',
    updatedAt: '5 天前',
    icon: 'history_toggle_off',
    accent: '#dc2626',
  },
  {
    id: 'KB-005',
    title: '兼容性矩阵',
    category: 'matrix',
    categoryLabel: '兼容矩阵',
    summary: '覆盖手机机型、系统版本、固件版本和 SDK 兼容关系。',
    updatedAt: '1 周前',
    icon: 'grid_view',
    accent: '#4f46e5',
  },
  {
    id: 'KB-006',
    title: '术语与异常码',
    category: 'terms',
    categoryLabel: '术语规范',
    summary: '统一术语定义、错误码说明和接口响应口径。',
    updatedAt: '2 周前',
    icon: 'terminal',
    accent: '#d97706',
  },
]

export const knowledgeTabs: Array<{ id: KnowledgeResource['category'] | 'all'; label: string }> = [
  { id: 'all', label: '全部资源' },
  { id: 'business', label: '业务文档' },
  { id: 'hardware', label: '硬件能力' },
  { id: 'flow', label: '交互流程' },
  { id: 'history', label: '历史缺陷' },
  { id: 'matrix', label: '兼容矩阵' },
  { id: 'terms', label: '术语规范' },
]

export function cloneCases(source: TestCase[]): TestCase[] {
  return source.map((item) => ({
    ...item,
    tags: [...item.tags],
    preconditions: [...item.preconditions],
    steps: item.steps.map((step) => ({ ...step })),
    attachments: item.attachments.map((attachment) => ({ ...attachment })),
    activity: item.activity.map((entry) => ({ ...entry })),
  }))
}

export function createSampleCases() {
  const supplementalCases = supplementalCaseSeeds.map((seed) => {
    const meta = scopeMeta[seed.scope]
    const updatedAtLabel = formatCaseUpdatedLabel(seed.updatedAtIso)

    return {
      id: seed.id,
      title: seed.title,
      feature: seed.feature,
      scope: seed.scope,
      priority: seed.priority,
      status: seed.status,
      owner: seed.owner,
      submitter: seed.submitter,
      objective: seed.objective,
      notes: seed.notes,
      tags: [...seed.tags],
      preconditions: [...meta.defaultPreconditions],
      steps: meta.defaultSteps.map((step, index) => ({
        ...step,
        action: index === 0 ? `${seed.title}：${step.action}` : step.action,
      })),
      attachments: [],
      activity: [
        {
          time: updatedAtLabel,
          detail:
            seed.status === '已沉淀'
              ? `${seed.submitter} 完成了基线沉淀。`
              : `${seed.submitter} 更新了该用例并同步到工作台。`,
          tone: seed.status === '已沉淀' ? 'positive' : 'primary',
        },
      ],
      reviewNote: seed.status === '待审核' ? '建议补充边界条件与异常恢复链路。' : '',
      updatedAtLabel,
      updatedAtEpoch: now(seed.updatedAtIso),
    } satisfies TestCase
  })

  return cloneCases([...sampleCasesSeed, ...supplementalCases])
}

export function buildEmptyCase(index: number): TestCase {
  return {
    id: `TC-LINK-${String(index).padStart(3, '0')}`,
    title: '新建双端联动用例',
    feature: '待补充模块',
    scope: 'linked',
    priority: 'P1',
    status: '草稿',
    owner: 'AI 草案',
    submitter: 'Web 工作台',
    objective: '请补充业务目标、联动范围和重点风险。',
    notes: '建议优先补充授权路径、断连重连和异常恢复逻辑。',
    tags: ['AI草案', '联动'],
    preconditions: ['请补充前置条件'],
    steps: [
      {
        action: '补充步骤 1',
        expected: '补充预期结果',
        evidence: '补充证据建议',
      },
    ],
    attachments: [],
    activity: [{ time: '刚刚', detail: '系统创建了空白用例。', tone: 'primary' }],
    reviewNote: '',
    updatedAtLabel: '刚刚',
    updatedAtEpoch: Date.now(),
  }
}

export function createGeneratedCase({
  index,
  scope,
  title,
  feature,
  requirement,
}: {
  index: number
  scope: Scope
  title: string
  feature?: string
  requirement: string
}): TestCase {
  const meta = scopeMeta[scope]
  const normalizedRequirement =
    requirement.trim() || '请补充业务背景、主路径、异常路径和回归重点。'
  const normalizedTitle =
    title.trim() ||
    normalizedRequirement
      .replace(/\s+/g, ' ')
      .slice(0, 24)
      .replace(/[，。；,.;]$/, '') ||
    `新建${meta.label}用例`

  const casePrefix = {
    app: 'APP',
    glasses: 'GLS',
    linked: 'LNK',
  }[scope]

  return {
    id: `TC-${casePrefix}-${String(index).padStart(3, '0')}`,
    title: normalizedTitle,
    feature: feature?.trim() || meta.defaultFeature,
    scope,
    priority: scope === 'linked' ? 'P0' : 'P1',
    status: '草稿',
    owner: 'AI 草案',
    submitter: 'PRD 生成器',
    objective: normalizedRequirement,
    notes: `基于 PRD 草案生成，建议重点补充：${meta.lenses.join(' / ')}。`,
    tags: [meta.label, 'AI草案', ...meta.lenses.slice(0, 2)],
    preconditions: [...meta.defaultPreconditions],
    steps: meta.defaultSteps.map((step) => ({ ...step })),
    attachments: [],
    activity: [
      {
        time: '刚刚',
        detail: '系统根据 PRD 摘要生成了新的测试用例草案。',
        tone: 'primary',
      },
    ],
    reviewNote: '',
    updatedAtLabel: '刚刚',
    updatedAtEpoch: Date.now(),
  }
}
