import { ReactNode, useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'

type DialogProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

/** Yerleşik <dialog> üzerine kurulu modal: odak tuzağı, Esc ve arka plan tıklaması tarayıcıdan gelir. */
export function Dialog({ open, title, onClose, children, footer, size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`mh-dialog mh-dialog--${size}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => { if (event.target === ref.current) onClose() }}
    >
      {open && (
        <div className="mh-dialog__panel">
          <header className="mh-dialog__header">
            <h2 id={titleId}>{title}</h2>
            <IconButton label="Kapat" icon={<X size={20} />} onClick={onClose} />
          </header>
          <div className="mh-dialog__body">{children}</div>
          {footer && <footer className="mh-dialog__footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
