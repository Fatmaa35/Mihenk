import { HTMLAttributes, ReactNode } from 'react'

export type TileTone = 'surface' | 'mint' | 'lilac' | 'butter' | 'peach'

type TileProps = HTMLAttributes<HTMLElement> & {
  tone?: TileTone
  as?: 'section' | 'div' | 'article'
  eyebrow?: ReactNode
  outlined?: boolean
}

/** Bento ızgarasının temel kartı. Başlık hiyerarşisini sayfa belirler; kart yalnızca yüzeydir. */
export function Tile({ tone = 'surface', as: Tag = 'div', eyebrow, outlined = false, className = '', children, ...rest }: TileProps) {
  return (
    <Tag className={`mh-tile mh-tile--${tone}${outlined ? ' mh-tile--outlined' : ''} ${className}`.trim()} {...rest}>
      {eyebrow && <p className="mh-eyebrow">{eyebrow}</p>}
      {children}
    </Tag>
  )
}
