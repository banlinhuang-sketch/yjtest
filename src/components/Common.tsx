import type { ChangeEvent, ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import { classNames } from '../utils.ts'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <section className="page-header-card">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p className="muted">{description}</p>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </section>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  options: Array<{ label: string; value: string }>
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function MetricCard({
  label,
  value,
  note,
  icon,
  tone = 'primary',
}: {
  label: string
  value: string
  note: string
  icon: string
  tone?: 'primary' | 'success'
}) {
  return (
    <article className="metric-card card">
      <div className="metric-head">
        <div>
          <p className="muted">{label}</p>
          <strong>{value}</strong>
        </div>
        <span className={classNames('metric-icon', tone === 'success' && 'metric-success')}>
          <Icon name={icon} />
        </span>
      </div>
      <p className="small-note">{note}</p>
    </article>
  )
}

export function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  label: string
}) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

export function TipCard({
  icon,
  title,
  copy,
}: {
  icon: string
  title: string
  copy: string
}) {
  return (
    <div className="tip-card">
      <Icon name={icon} className="text-primary" />
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
    </div>
  )
}
