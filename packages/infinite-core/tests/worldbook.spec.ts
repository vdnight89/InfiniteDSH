import { describe, expect, it } from 'vitest'
import type { LoreEntry } from '../src/types.ts'
import { buildCharacterContext, buildWorldContext, findMatchingEntries } from '../src/worldbook.ts'

function entry(partial: Partial<LoreEntry> & Pick<LoreEntry, 'id' | 'content'>): LoreEntry {
  return {
    title: partial.id,
    category: '设定',
    keys: [],
    constant: false,
    order: 0,
    disabled: false,
    ...partial,
  }
}

describe('findMatchingEntries', () => {
  it('hits a key of at least two characters and skips constants', () => {
    const entries = [
      entry({ id: 'const', content: '常驻', constant: true, keys: ['宗门'] }),
      entry({ id: 'sect', content: '戒律', keys: ['宗门', '外门'] }),
      entry({ id: 'off', content: '关', disabled: true, keys: ['宗门'] }),
    ]
    expect(findMatchingEntries(entries, '走进宗门山门').map((e) => e.id)).toEqual(['sect'])
  })

  it('ignores single-character keys', () => {
    expect(findMatchingEntries([entry({ id: 'x', content: 'x', keys: ['门'] })], '山门')).toEqual([])
  })
})

describe('buildWorldContext', () => {
  it('puts constants first then matches, and reports ids', () => {
    const result = buildWorldContext(
      [
        entry({ id: 'realm', title: '境界', content: '炼气筑基', constant: true, order: 1 }),
        entry({ id: 'sect', title: '戒律', content: '夜不入阁', keys: ['宗门'], order: 2 }),
      ],
      '夜探宗门',
      '修仙',
    )
    expect(result.constantCount).toBe(1)
    expect(result.matchedEntryIds).toEqual(['sect'])
    expect(result.text).toContain('【世界规则·修仙】')
    expect(result.text).toContain('炼气筑基')
    expect(result.text).toContain('夜不入阁')
  })

  it('truncates by maxChars and returns empty when nothing fits', () => {
    const long = entry({ id: 'huge', content: '字'.repeat(80), constant: true })
    const cut = buildWorldContext([long], '', '修仙', { maxChars: 40 })
    expect(cut.text).toBe('')
    const ok = buildWorldContext([long], '', '修仙', { maxChars: 200 })
    expect(ok.text.length).toBeGreaterThan(0)
  })
})

describe('buildCharacterContext', () => {
  it('always names the protagonist and includes constant cards', () => {
    const text = buildCharacterContext(
      [entry({ id: 'p', title: '陈行舟', content: '外门杂役', constant: true })],
      '',
      '陈行舟',
    )
    expect(text).toContain('主角（用户角色，叙事中心）：陈行舟')
    expect(text).toContain('外门杂役')
  })
})
