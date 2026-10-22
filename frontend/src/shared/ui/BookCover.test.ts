import { describe, expect, it } from 'vitest'
import { coverColor } from './BookCover'

describe('coverColor', () => {
  it('is deterministic per book', () => {
    expect(coverColor('suc-ve-ceza')).toBe(coverColor('suc-ve-ceza'))
  })
  it('spreads books across the palette', () => {
    const colors = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(coverColor))
    expect(colors.size).toBeGreaterThan(3)
  })
})
