type ProgressProps = { value: number; label: string; tone?: 'ink' | 'accent'; size?: 'sm' | 'md' }

export function Progress({ value, label, tone = 'ink', size = 'md' }: ProgressProps) {
  const percent = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      className={`mh-progress mh-progress--${tone} mh-progress--${size}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="mh-progress__bar" style={{ width: `${percent}%` }} />
    </div>
  )
}
