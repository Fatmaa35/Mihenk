import { InputHTMLAttributes, ReactNode, useId } from 'react'

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; description?: ReactNode }

/** Açık/kapalı ayar satırı: yerleşik checkbox üzerine kurulur, ekran okuyucuya "anahtar" olarak duyurulur. */
export function Switch({ label, description, className = '', ...input }: SwitchProps) {
  const id = useId()
  return (
    <label className={`mh-switch ${className}`.trim()} htmlFor={id}>
      <span className="mh-switch__text">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input id={id} type="checkbox" role="switch" className="mh-switch__input" {...input} />
      <span className="mh-switch__track" aria-hidden="true"><span className="mh-switch__thumb" /></span>
    </label>
  )
}
