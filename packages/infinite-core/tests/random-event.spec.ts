import { describe, expect, it } from 'vitest'
import type { LoreEntry } from '../src/types.ts'
import { formatRandomEvent, pickRandomEventEntry } from '../src/random-event.ts'

function entry(partial: Partial<LoreEntry> & Pick<LoreEntry, 'id' | 'content'>): LoreEntry {
  return {
    title: partial.id,
    category: '事件',
    keys: [],
    constant: false,
    order: 0,
    disabled: false,
    ...partial,
  }
}

describe('pickRandomEventEntry', () => {
  it('skips constants, matches, disabled, and already drawn ids', () => {
    const entries = [
      entry({ id: 'c', content: '常驻', constant: true }),
      entry({ id: 'hit', content: '命中', keys: ['宗门'] }),
      entry({ id: 'used', content: '抽过' }),
      entry({ id: 'off', content: '关', disabled: true }),
      entry({ id: 'ok', content: '可用' }),
    ]
    const picked = pickRandomEventEntry(entries, '宗门迎客', ['used'], () => 0)
    expect(picked?.id).toBe('ok')
  })

  it('returns null when the pool is empty', () => {
    expect(pickRandomEventEntry([entry({ id: 'c', content: 'c', constant: true })], '', [])).toBeNull()
  })
})

describe('formatRandomEvent', () => {
  it('wraps the entry as an optional stimulus', () => {
    const text = formatRandomEvent(entry({ id: 'storm', title: '暴雨', content: '山洪将至' }))
    expect(text).toContain('【随机世界事件】')
    expect(text).toContain('山洪将至')
    expect(text).toContain('不必强行出现')
  })
})
