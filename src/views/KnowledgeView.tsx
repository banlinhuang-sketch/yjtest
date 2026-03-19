import type { CSSProperties } from 'react'
import { knowledgeTabs } from '../data.ts'
import { PageHeader } from '../components/Common.tsx'
import { Icon } from '../components/Icon.tsx'
import { classNames } from '../utils.ts'
import type { KnowledgeResource, KnowledgeTab } from '../types.ts'

export function KnowledgeView({
  resources,
  activeTab,
  onTabChange,
}: {
  resources: KnowledgeResource[]
  activeTab: KnowledgeTab | 'all'
  onTabChange: (tab: KnowledgeTab | 'all') => void
}) {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="P5 / 知识基线页"
        title="知识基线"
        description="用来承接 App 业务知识、眼镜能力边界、历史缺陷和兼容矩阵。"
        actions={
          <div className="inline-actions">
            <button type="button" className="button button-ghost">
              <Icon name="filter_list" />
              <span>筛选</span>
            </button>
            <button type="button" className="button button-primary">
              <Icon name="add" />
              <span>新增资源</span>
            </button>
          </div>
        }
      />

      <div className="tab-row">
        {knowledgeTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={classNames('tab-button', activeTab === tab.id && 'tab-button-active')}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="resource-grid">
        {resources.map((resource) => (
          <article className="resource-card" key={resource.id}>
            <div
              className="resource-hero"
              style={{ '--resource-accent': resource.accent } as CSSProperties}
            >
              <span className="resource-chip">{resource.categoryLabel}</span>
              <Icon name={resource.icon} className="resource-icon" />
            </div>
            <div className="resource-body">
              <h4>{resource.title}</h4>
              <p>{resource.summary}</p>
              <div className="resource-foot">
                <span>更新于 {resource.updatedAt}</span>
                <Icon name="arrow_forward" />
              </div>
            </div>
          </article>
        ))}
      </div>

      {!resources.length ? (
        <div className="card table-empty">
          <Icon name="search_off" className="empty-icon" />
          <strong>当前筛选下没有命中的知识资源</strong>
          <p>可以切换分类，或在顶部搜索框里调整关键词。</p>
        </div>
      ) : null}

      <section className="card activity-card">
        <div className="card-head">
          <h4>最近动态</h4>
        </div>
        <div className="timeline">
          <div className="timeline-row">
            <span className="timeline-dot timeline-primary" />
            <div>
              <strong>2 小时前</strong>
              <p>Sarah 更新了“眼镜能力基线”中的传感器规格说明。</p>
            </div>
          </div>
          <div className="timeline-row">
            <span className="timeline-dot timeline-positive" />
            <div>
              <strong>昨天 16:30</strong>
              <p>系统自动归档了 12 条历史缺陷，并同步到回归重点清单。</p>
            </div>
          </div>
          <div className="timeline-row">
            <span className="timeline-dot timeline-neutral" />
            <div>
              <strong>2 天前</strong>
              <p>David 对“兼容矩阵 v2.4”补充了评论和责任人建议。</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
