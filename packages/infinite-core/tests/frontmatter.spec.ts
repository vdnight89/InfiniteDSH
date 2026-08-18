import { describe, expect, it } from 'vitest'
import { defaultMeta, formatStoryMeta, parseLoreEntry, parseStoryMeta } from '../src/frontmatter.ts'
import { TEMPLATE_CATALOG } from '../src/catalog.generated.ts'
import { coverFileForLabel } from '../src/covers.ts'
import {
  KEEP_DEFAULT_OPENING,
  KEEP_DEFAULT_PROTAGONIST,
  isKeepDefaultChoice,
  parseCommandArgs,
  resolveTemplateId,
  templateIdFromLabel,
} from '../src/topics.ts'

describe('parseLoreEntry', () => {
  it('reads front matter lists and booleans', () => {
    const entry = parseLoreEntry(
      `---
id: sect-rules
title: 宗门戒律
category: 规则
constant: false
keys: [宗门, 外门]
order: 10
---
夜不入藏经阁。
`,
      'fallback',
    )
    expect(entry).toMatchObject({
      id: 'sect-rules',
      title: '宗门戒律',
      keys: ['宗门', '外门'],
      constant: false,
      order: 10,
      content: '夜不入藏经阁。',
    })
  })

  it('falls back when front matter is missing', () => {
    const entry = parseLoreEntry('只有正文', 'only-body')
    expect(entry.id).toBe('only-body')
    expect(entry.content).toBe('只有正文')
    expect(entry.constant).toBe(false)
  })
})

describe('story meta', () => {
  it('round-trips', () => {
    const meta = { ...defaultMeta('urban', '林晏'), pickedEventIds: ['a', 'b'], pendingEventId: 'c' }
    const again = parseStoryMeta(formatStoryMeta(meta))
    expect(again.templateId).toBe('urban')
    expect(again.protagonist).toBe('林晏')
    expect(again.pickedEventIds).toEqual(['a', 'b'])
    expect(again.pendingEventId).toBe('c')
    expect(again.narrativeGuard).toBe(true)
  })
})

describe('topics', () => {
  it('maps aliases and default', () => {
    expect(resolveTemplateId('')).toBeNull()
    expect(resolveTemplateId('末世')).toBe('apocalypse')
    expect(resolveTemplateId('urban')).toBe('urban')
    expect(resolveTemplateId('都市')).toBe('modern')
    expect(resolveTemplateId('???')).toBeNull()
  })

  it('maps selectable labels back to template ids', () => {
    expect(templateIdFromLabel('修仙')).toBe('cultivation')
    expect(templateIdFromLabel('末世')).toBe('apocalypse')
    expect(templateIdFromLabel('都市异能')).toBe('urban')
    expect(templateIdFromLabel('宫廷')).toBe('palace')
    expect(templateIdFromLabel('梁组')).toBe('whale')
    expect(templateIdFromLabel('鲸鱼娘')).toBe('whale')
    expect(templateIdFromLabel('牢梁')).toBe('whale')
  })

  it('maps card labels to cover files', () => {
    expect(coverFileForLabel('修仙')).toBe('cultivation.jpg')
    expect(coverFileForLabel('梁组')).toBe('liang.jpg')
    expect(coverFileForLabel('鲸鱼娘（推荐）')).toBe('whale-girl.jpg')
    expect(coverFileForLabel('林晏')).toBe('campus.jpg')
    expect(coverFileForLabel('周慎')).toBe('apocalypse.jpg')
  })

  it('treats recommended default labels as keep-default', () => {
    expect(KEEP_DEFAULT_PROTAGONIST).toBe('以此界默认之身')
    expect(KEEP_DEFAULT_OPENING).toBe('走此界默认开局')
    expect(isKeepDefaultChoice('以此界默认之身（推荐）', KEEP_DEFAULT_PROTAGONIST)).toBe(true)
    expect(isKeepDefaultChoice('走此界默认开局', KEEP_DEFAULT_OPENING)).toBe(true)
    expect(isKeepDefaultChoice('周慎', KEEP_DEFAULT_PROTAGONIST)).toBe(false)
  })

  it('ships the imported AIRP catalog', () => {
    expect(TEMPLATE_CATALOG.length).toBeGreaterThanOrEqual(19)
    expect(TEMPLATE_CATALOG.some((item) => item.id === 'cultivation')).toBe(true)
    expect(TEMPLATE_CATALOG.some((item) => item.id === 'palace')).toBe(true)
    expect(TEMPLATE_CATALOG.some((item) => item.id === 'wuxia')).toBe(true)
    expect(TEMPLATE_CATALOG.some((item) => item.id === 'whale')).toBe(true)
  })

  it('parses force from command args', () => {
    expect(parseCommandArgs('修仙 force')).toEqual({ topic: '修仙', force: true, rest: ['修仙'] })
    expect(parseCommandArgs('')).toEqual({ topic: '', force: false, rest: [] })
  })
})
