import { describe, expect, it, vi } from 'vitest'
import { QueryCache } from './api'

describe('QueryCache', () => {
  it('deduplicates a fresh value until its ttl expires', async () => {
    const loader = vi.fn().mockResolvedValue({ value: 1 })
    const cache = new QueryCache()
    expect(await cache.get('books', loader, 60_000)).toEqual({ value: 1 })
    expect(await cache.get('books', loader, 60_000)).toEqual({ value: 1 })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('invalidates only matching prefixes', async () => {
    const cache = new QueryCache()
    const books = vi.fn().mockResolvedValue('books')
    const profile = vi.fn().mockResolvedValue('profile')
    await cache.get('catalog:books', books)
    await cache.get('me:profile', profile)
    cache.invalidate('catalog:')
    await cache.get('catalog:books', books)
    await cache.get('me:profile', profile)
    expect(books).toHaveBeenCalledTimes(2)
    expect(profile).toHaveBeenCalledTimes(1)
  })
})
