import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading = false, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`mh-button mh-button--${variant} mh-button--${size} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="mh-spinner mh-spinner--inline" aria-hidden="true" /> : icon}
      {children && <span>{children}</span>}
    </button>
  )
})

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ReactNode; variant?: 'ghost' | 'secondary' }

export function IconButton({ label, icon, variant = 'ghost', className = '', type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={`mh-icon-button mh-icon-button--${variant} ${className}`.trim()} {...rest}>
      {icon}
    </button>
  )
}
