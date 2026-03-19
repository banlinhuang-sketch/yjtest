interface IconProps {
  name: string
  className?: string
  filled?: boolean
}

export function Icon({ name, className = '', filled = false }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? 'is-filled' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
