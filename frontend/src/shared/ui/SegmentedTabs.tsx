import { KeyboardEvent, useRef } from 'react'

export type SegmentedOption<T extends string> = { value: T; label: string; count?: number }

type SegmentedTabsProps<T extends string> = {
  label: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

/** Erişilebilir sekme listesi: ok tuşlarıyla gezinilir, yalnızca seçili sekme Tab sırasındadır. */
export function SegmentedTabs<T extends string>({ label, options, value, onChange }: SegmentedTabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = (index + delta + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div className="mh-segmented" role="tablist" aria-label={label}>
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(element) => { refs.current[index] = element }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="mh-segmented__item"
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
            {option.count !== undefined && <span className="mh-segmented__count">{option.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
