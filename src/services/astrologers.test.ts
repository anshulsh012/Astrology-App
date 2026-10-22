import { describe, expect, it } from 'vitest'
import { getAstrologerById, listAstrologers } from './astrologers'

describe('astrologer sample service', () => {
  it('filters by specialty and query without inventing listings', async () => {
    const love = await listAstrologers({ specialty: 'love', q: 'meera' })
    expect(love.source).toBe('sample')
    expect(love.items.map((item) => item.id)).toEqual(['sample-meera-iyer'])
  })

  it('returns null for unknown profile ids', async () => {
    await expect(getAstrologerById('missing')).resolves.toBeNull()
  })
})
