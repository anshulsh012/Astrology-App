import { describe, expect, it } from 'vitest'
import { greetingName } from './greeting'

describe('greetingName', () => {
  it('title-cases the email local part', () => {
    expect(greetingName('meera.iyer@example.com')).toBe('Meera Iyer')
  })

  it('falls back when the local part is empty', () => {
    expect(greetingName('@example.com')).toBe('there')
  })
})
