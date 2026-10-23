import { useState } from 'react'

/** Spoiler içeren metni bulanık gösterir; okur isterse açar. */
export function SpoilerText({ text, spoiler }: { text: string; spoiler: boolean }) {
  const [revealed, setRevealed] = useState(!spoiler)
  if (revealed) return <p className="comment-text">{text}</p>
  return (
    <button type="button" className="spoiler" onClick={() => setRevealed(true)}>
      <span className="spoiler__label">Spoiler içeriyor · göstermek için dokun</span>
      <span className="spoiler__text" aria-hidden="true">{text}</span>
    </button>
  )
}
