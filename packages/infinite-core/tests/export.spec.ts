import { describe, expect, it } from 'vitest'
import { cleanProse, exportTranscript, formatArchive, isOpeningInstruction } from '../src/export.ts'

describe('cleanProse', () => {
  it('strips template tags, headings, and fences', () => {
    const raw = '【正文】山门开了\n【对话推荐】去藏经阁\n## 第一章\n```js\nx\n```\n留下'
    expect(cleanProse(raw)).toContain('山门开了')
    expect(cleanProse(raw)).toContain('留下')
    expect(cleanProse(raw)).not.toContain('【正文】')
  })

  it('keeps a single blank line between paragraphs', () => {
    expect(cleanProse('第一段。\n\n第二段。')).toBe('第一段。\n\n第二段。')
  })
})

describe('exportTranscript', () => {
  it('drops opening instructions and player lines by default', () => {
    const txt = exportTranscript('青囊', '陈行舟', [
      { role: 'user', text: '【开局】请开始' },
      { role: 'assistant', text: '【正文】晨雾里有人扫地。' },
      { role: 'user', text: '上前询问' },
      { role: 'system', text: 'ignore' },
    ], false)
    expect(txt).toContain('青囊')
    expect(txt).toContain('主角：陈行舟')
    expect(txt).toContain('晨雾里有人扫地。')
    expect(txt).not.toContain('请开始')
    expect(txt).not.toContain('上前询问')
    expect(txt).not.toContain('【正文】')
  })

  it('keeps player actions when asked', () => {
    const txt = exportTranscript('书', '', [
      { role: 'user', text: '推门' },
      { role: 'assistant', text: '门轴吱呀。' },
    ], true)
    expect(txt).toContain('（你）推门')
    expect(txt).toContain('门轴吱呀。')
  })
})

describe('isOpeningInstruction / formatArchive', () => {
  it('detects opening markers', () => {
    expect(isOpeningInstruction('【开局】写第一段')).toBe(true)
    expect(isOpeningInstruction('我推开门')).toBe(false)
  })

  it('wraps a compaction summary', () => {
    expect(formatArchive('外门扫地三日', '2026-08-16')).toContain('外门扫地三日')
    expect(formatArchive('  ', 'x')).toBe('')
  })

  it('appends later summaries instead of replacing the book', () => {
    const first = formatArchive('外门扫地三日', 't1')
    const next = formatArchive('夜闯藏经阁', 't2', first)
    expect(next).toContain('外门扫地三日')
    expect(next).toContain('夜闯藏经阁')
    expect(next).toContain('## t2')
  })
})
