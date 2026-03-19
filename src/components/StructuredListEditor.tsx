import { useLayoutEffect, useRef } from 'react'

import { Icon } from './Icon.tsx'
import './StructuredListEditor.css'

export interface StructuredListItem {
  id: string
  content: string
}

interface StructuredListEditorProps {
  items: StructuredListItem[]
  addLabel: string
  placeholder: string
  minRows?: number
  onAdd: () => void
  onChange: (itemId: string, value: string) => void
  onRemove: (itemId: string) => void
}

function AutoGrowTextarea({
  value,
  placeholder,
  minRows = 3,
  onChange,
}: {
  value: string
  placeholder: string
  minRows?: number
  onChange: (value: string) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(textarea.scrollHeight, minRows * 24 + 24)}px`
  }, [minRows, value])

  return (
    <textarea
      ref={textareaRef}
      className="structured-list-textarea"
      placeholder={placeholder}
      rows={minRows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export function StructuredListEditor({
  items,
  addLabel,
  placeholder,
  minRows = 3,
  onAdd,
  onChange,
  onRemove,
}: StructuredListEditorProps) {
  const canRemove = items.length > 1

  return (
    <div className="structured-list-editor">
      <div className="structured-list-items">
        {items.map((item, index) => (
          <article key={item.id} className="structured-list-row">
            <span className="structured-list-index">{index + 1}</span>
            <AutoGrowTextarea
              minRows={minRows}
              placeholder={placeholder}
              value={item.content}
              onChange={(value) => onChange(item.id, value)}
            />
            <button
              className="structured-list-remove"
              disabled={!canRemove}
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={canRemove ? '删除当前行' : '至少保留一行'}
            >
              <Icon name="delete" />
            </button>
          </article>
        ))}
      </div>

      <button className="structured-list-add" type="button" onClick={onAdd}>
        <Icon name="add" />
        {addLabel}
      </button>
    </div>
  )
}
