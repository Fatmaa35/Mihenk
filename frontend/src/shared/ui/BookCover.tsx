import { useState } from 'react'

const COVER_COLORS = ['#B23A2E', '#3F3A7A', '#2F5D4A', '#9A5B1E', '#1E3A5F', '#6A3164', '#2C5F6E', '#7A4A2A']

/** Aynı kitap her yerde aynı rengi alsın diye kimlikten deterministik renk üretir. */
export function coverColor(seed: string): string {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return COVER_COLORS[hash % COVER_COLORS.length]
}

type BookCoverProps = {
  id: string
  title: string
  author?: string
  coverUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'fill'
  showText?: boolean
}

export function BookCover({ id, title, author, coverUrl, size = 'md', showText = true }: BookCoverProps) {
  const [failed, setFailed] = useState(false)
  const useImage = Boolean(coverUrl) && !failed
  return (
    <div className={`mh-cover mh-cover--${size}`} style={{ background: coverColor(id || title) }}>
      {useImage ? (
        <img src={coverUrl ?? undefined} alt={`${title} kapağı`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : showText ? (
        <div className="mh-cover__text" aria-hidden="true">
          <span className="mh-cover__title">{title}</span>
          {author && <span className="mh-cover__author">{author}</span>}
        </div>
      ) : null}
    </div>
  )
}
