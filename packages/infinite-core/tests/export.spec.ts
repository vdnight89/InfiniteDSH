import { describe, expect, it } from 'vitest'
import { cleanProse, exportTranscript, formatArchive, isOpeningInstruction } from '../src/export.ts'
import { parseForkOptions } from '../src/forks.ts'
import { safeBookFileName, suggestExportTitles } from '../src/titles.ts'

describe('cleanProse', () => {
  it('strips the 歧路 block from exported prose', () => {
    const raw = '山门开了。\n\n【歧路】\n1. 推门进去\n2. 先问守门人\n3. 绕到侧廊\n亦可自己写一条别的路。'
    expect(cleanProse(raw)).toBe('山门开了。')
    expect(cleanProse(raw)).not.toContain('歧路')
  })

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

describe('parseForkOptions', () => {
  it('reads numbered 歧路 lines and drops the free-write trailer', () => {
    const raw = `山门开了。

【歧路】
1. 推门进去
2. 先问守门人
3. 绕到侧廊 亦可自己写一条别的路。`
    expect(parseForkOptions(raw)).toEqual(['推门进去', '先问守门人', '绕到侧廊'])
  })

  it('returns empty when there is no 歧路 block', () => {
    expect(parseForkOptions('只有正文。')).toEqual([])
  })
})

describe('suggestExportTitles', () => {
  it('leads with world and protagonist, then a quote clip', () => {
    const titles = suggestExportTitles('奇幻', '谢无妄', '巷口忽然静了。“谁的人头，谁的价。”猎人把碗推过来。')
    expect(titles[0]).toBe('奇幻·谢无妄')
    expect(titles).toContain('谁的人头，谁的价')
  })

  it('builds a safe windows file name', () => {
    expect(safeBookFileName('奇幻·谢无妄')).toBe('奇幻·谢无妄.txt')
    expect(safeBookFileName('a<b>:"c')).toBe('a b c.txt')
  })
})

describe('isOpeningInstruction / formatArchive', () => {
  it('detects opening markers', () => {
    expect(isOpeningInstruction('【开局】写第一段')).toBe(true)
    expect(isOpeningInstruction('启程。')).toBe(true)
    expect(isOpeningInstruction('启程')).toBe(true)
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
