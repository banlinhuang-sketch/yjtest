import { randomUUID } from 'node:crypto'

const scopeDefaults = {
  app: {
    feature: 'App 业务流程',
    preconditions: ['手机 App 已登录测试账号', '蓝牙、通知和网络权限均已开启'],
    steps: [
      {
        action: '进入 App 对应模块并触发业务动作',
        expected: '页面状态与反馈文案符合预期',
        evidence: '页面截图',
      },
      {
        action: '切换前后台或触发边界条件后再次验证',
        expected: '状态恢复正常，无异常弹窗',
        evidence: '客户端日志',
      },
    ],
  },
  glasses: {
    feature: '眼镜设备能力',
    preconditions: ['眼镜设备在线且已授权相关能力', '设备电量与网络状态满足执行条件'],
    steps: [
      {
        action: '在眼镜端触发目标能力',
        expected: '提示文案、视觉反馈和播报状态正确',
        evidence: '眼镜录屏',
      },
      {
        action: '切换设备状态或边界条件后再次验证',
        expected: '边界状态下仍有明确反馈',
        evidence: '设备日志',
      },
    ],
  },
  linked: {
    feature: '双端联动链路',
    preconditions: ['手机 App 与眼镜已绑定并保持在线', '蓝牙与通知权限已授权'],
    steps: [
      {
        action: '在手机端触发业务动作并观察眼镜端反馈',
        expected: '眼镜端在预期时延内收到正确联动展示',
        evidence: '双端录屏',
      },
      {
        action: '模拟链路中断后恢复连接并重复验证',
        expected: '恢复后状态一致，无重复弹卡或数据丢失',
        evidence: '链路日志',
      },
    ],
  },
}

const caseSeeds = [
  {
    id: 'TC-APP-101',
    title: 'App 蓝牙首次配对引导与权限弹窗链路完整性校验',
    scope: 'app',
    priority: 'P0',
    status: '待审核',
    feature: '蓝牙配对 / 首次安装',
    owner: '客户端 QA',
    submitter: '李聪',
    objective:
      '验证首次安装后的蓝牙、定位和通知权限申请顺序，以及配对引导文案和回流路径是否正确。',
    notes: '需要覆盖 iOS 与 Android 的差异化权限弹窗顺序。',
    tags: ['蓝牙配对', '权限', '首次安装'],
    updatedAt: '2026-03-18T11:15:00+08:00',
  },
  {
    id: 'TC-APP-102',
    title: 'App 蓝牙配对超时后的重试引导与异常提示文案',
    scope: 'app',
    priority: 'P1',
    status: '已沉淀',
    feature: '蓝牙配对 / 异常恢复',
    owner: '客户端 QA',
    submitter: '李聪',
    objective: '验证扫描超时、验证码失败和配对失败后的用户回流路径、重试提示和帮助入口。',
    notes: '该用例已经被用作多个版本的回归基线。',
    tags: ['蓝牙配对', '异常提示', '重试'],
    updatedAt: '2026-03-14T19:30:00+08:00',
  },
  {
    id: 'TC-APP-103',
    title: 'App 蓝牙权限被拒后重新授权回流与页面恢复',
    scope: 'app',
    priority: 'P1',
    status: '草稿',
    feature: '蓝牙配对 / 权限回流',
    owner: '客户端 QA',
    submitter: '张妍',
    objective: '验证用户从系统设置重新授权蓝牙权限后，App 是否能正确刷新页面状态并恢复配对入口。',
    notes: '建议补充后台切回前台时的权限刷新时序验证。',
    tags: ['蓝牙配对', '权限', '授权回流'],
    updatedAt: '2026-03-13T13:25:00+08:00',
  },
  {
    id: 'TC-APP-104',
    title: 'App 换机后历史眼镜解绑与重新配对流程验证',
    scope: 'app',
    priority: 'P0',
    status: '待审核',
    feature: '蓝牙配对 / 换机迁移',
    owner: '客户端 QA',
    submitter: '高远',
    objective: '验证旧手机残留绑定、云端设备记录刷新，以及新手机登录后的重新配对链路是否完整。',
    notes: '需重点关注账号切换与云端设备列表延迟问题。',
    tags: ['蓝牙配对', '换机', '解绑'],
    updatedAt: '2026-03-12T10:00:00+08:00',
  },
  {
    id: 'TC-GLS-101',
    title: '智能眼镜语音唤醒在地铁噪声场景下的误唤醒率验证',
    scope: 'glasses',
    priority: 'P0',
    status: '已沉淀',
    feature: '语音交互 / 唤醒链路',
    owner: '语音专项组',
    submitter: '刘程',
    objective: '验证高噪声地铁环境中语音热词误唤醒率是否稳定在阈值内，并检查误唤醒后的提示与回退策略。',
    notes: '重点关注连续播报、乘客交谈和列车进站播报三类复合噪声。',
    tags: ['语音交互', '误唤醒', '高噪声'],
    updatedAt: '2026-03-17T10:20:00+08:00',
  },
  {
    id: 'TC-GLS-102',
    title: '智能眼镜连续语音指令被打断后的上下文恢复能力',
    scope: 'glasses',
    priority: 'P1',
    status: '待审核',
    feature: '语音交互 / 连续指令',
    owner: '语音专项组',
    submitter: '周宁',
    objective: '验证连续语音命令在被插话、改口或播报打断后，系统能否恢复正确的上下文并完成执行。',
    notes: '建议补充中英混说与弱网同时发生时的降级说明。',
    tags: ['语音交互', '连续指令', '恢复'],
    updatedAt: '2026-03-17T09:05:00+08:00',
  },
  {
    id: 'TC-GLS-103',
    title: '智能眼镜方言混说场景下的指令识别降级策略校验',
    scope: 'glasses',
    priority: 'P1',
    status: '草稿',
    feature: '语音交互 / 识别策略',
    owner: '语音专项组',
    submitter: '陈嘉',
    objective: '验证普通话与粤语混说场景下的指令识别准确率，以及低置信度时的降级提示和兜底文案。',
    notes: '当前仅覆盖语音主链路，后续可追加手势兜底回退。',
    tags: ['语音交互', '方言识别', '降级'],
    updatedAt: '2026-03-16T15:40:00+08:00',
  },
  {
    id: 'TC-GLS-104',
    title: '智能眼镜低电量模式下语音助手可用性验证',
    scope: 'glasses',
    priority: 'P2',
    status: '待审核',
    feature: '设备边界 / 低电量',
    owner: '设备专项组',
    submitter: '孙晨',
    objective: '验证电量低于 10% 时语音助手的降级提示、功能裁剪和恢复策略是否符合设计预期。',
    notes: '需补充充电恢复后的能力回放场景。',
    tags: ['低电量', '语音交互', '边界'],
    updatedAt: '2026-03-15T18:10:00+08:00',
  },
  {
    id: 'TC-LNK-101',
    title: '双端联动断连后 10 秒内自动重连恢复验证',
    scope: 'linked',
    priority: 'P0',
    status: '已沉淀',
    feature: '双端联动 / 重连恢复',
    owner: '联调测试组',
    submitter: '陈雪',
    objective: '验证蓝牙链路短暂断开后，手机 App 与眼镜会话能否在 10 秒内自动恢复，并保持状态一致。',
    notes: '这是导出中心常用的回归基线用例。',
    tags: ['断连重连', '双端联动', '自动恢复'],
    updatedAt: '2026-03-17T17:45:00+08:00',
  },
  {
    id: 'TC-LNK-102',
    title: '双端联动弱网与蓝牙抖动下的状态同步一致性',
    scope: 'linked',
    priority: 'P0',
    status: '待审核',
    feature: '双端联动 / 状态同步',
    owner: '联调测试组',
    submitter: '王冉',
    objective: '验证通知、设备状态和会话状态在弱网与蓝牙抖动并发场景下的最终一致性和恢复速度。',
    notes: '建议补充更长时长的弱网模拟曲线。',
    tags: ['断连重连', '弱网', '状态同步'],
    updatedAt: '2026-03-16T12:35:00+08:00',
  },
  {
    id: 'TC-LNK-103',
    title: '双端联动锁屏后通知转发中断与恢复能力验证',
    scope: 'linked',
    priority: 'P1',
    status: '草稿',
    feature: '双端联动 / 通知转发',
    owner: '联调测试组',
    submitter: '王冉',
    objective: '验证手机锁屏、眼镜息屏与后台省电策略叠加时，通知链路是否能在恢复后继续补发。',
    notes: '后续需要和消息中心的未读状态回写一起验证。',
    tags: ['断连重连', '锁屏', '通知转发'],
    updatedAt: '2026-03-11T09:50:00+08:00',
  },
  {
    id: 'TC-LNK-104',
    title: '双端联动重启手机后会话恢复与补偿同步',
    scope: 'linked',
    priority: 'P1',
    status: '已沉淀',
    feature: '双端联动 / 会话恢复',
    owner: '联调测试组',
    submitter: '陈雪',
    objective: '验证手机异常重启后，双端会话恢复、消息补偿和设备状态回放链路是否稳定。',
    notes: '适合与 OTA 升级后首连流程一起做回归组合。',
    tags: ['断连重连', '重启恢复', '补偿同步'],
    updatedAt: '2026-03-08T18:15:00+08:00',
  },
]

function createActivity(updatedAt, detail, tone = 'primary') {
  return {
    time: new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(updatedAt)),
    detail,
    tone,
  }
}

function buildSeedCase(seed) {
  const defaults = scopeDefaults[seed.scope]

  return {
    id: seed.id,
    title: seed.title,
    feature: seed.feature || defaults.feature,
    scope: seed.scope,
    priority: seed.priority,
    status: seed.status,
    owner: seed.owner,
    submitter: seed.submitter,
    objective: seed.objective,
    notes: seed.notes,
    tags: [...seed.tags],
    preconditions: [...defaults.preconditions],
    steps: defaults.steps.map((step, index) => ({
      ...step,
      action: index === 0 ? `${seed.title}：${step.action}` : step.action,
    })),
    attachments: [
      {
        name:
          seed.scope === 'linked'
            ? '双端录屏.mp4'
            : seed.scope === 'glasses'
              ? '眼镜端录屏.mp4'
              : 'App 截图.png',
        kind: seed.scope === 'app' ? 'image' : 'video',
      },
    ],
    activity: [
      createActivity(
        seed.updatedAt,
        seed.status === '已沉淀'
          ? `${seed.submitter} 完成了该用例的沉淀归档。`
          : `${seed.submitter} 更新了该用例并同步到工作台。`,
        seed.status === '已沉淀' ? 'positive' : 'primary',
      ),
      createActivity(seed.updatedAt, '系统补充了结构化步骤和证据建议。', 'neutral'),
    ],
    reviewNote: seed.status === '待审核' ? '建议补充边界场景和异常恢复说明。' : '',
    updatedAt: seed.updatedAt,
  }
}

export function createSeedCases() {
  return caseSeeds.map(buildSeedCase)
}

export function createGeneratedDraftCase({ scope, title, requirement, submitter = 'Agent 生成器' }) {
  const defaults = scopeDefaults[scope]
  const now = new Date().toISOString()
  const normalizedTitle = title.trim() || `${defaults.feature}新草稿`
  const normalizedRequirement = requirement.trim() || '请补充业务背景、边界条件和回归重点。'
  const prefix = {
    app: 'APP',
    glasses: 'GLS',
    linked: 'LNK',
  }[scope]

  return {
    id: `TC-${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`,
    title: normalizedTitle,
    feature: defaults.feature,
    scope,
    priority: scope === 'linked' ? 'P0' : 'P1',
    status: '草稿',
    owner: 'AI 草案',
    submitter,
    objective: normalizedRequirement,
    notes: `已根据需求摘要生成草稿，建议继续补充：${defaults.feature}、异常恢复、联动边界。`,
    tags: [scope === 'app' ? '手机 App' : scope === 'glasses' ? '智能眼镜' : '双端联动', 'AI草稿'],
    preconditions: [...defaults.preconditions],
    steps: defaults.steps.map((step) => ({ ...step })),
    attachments: [],
    activity: [createActivity(now, '系统根据需求摘要生成了新的用例草稿。', 'primary')],
    reviewNote: '',
    updatedAt: now,
  }
}
