import { describe, expect, it } from 'vitest'
import { bindManuscript, chapterHeading, chineseChapter, cleanProse, exportTranscript, extractStoryBody, formatArchive, isOpeningInstruction, isPlanningDump, manuscriptHasBody } from '../src/export.ts'
import { parseForkOptions } from '../src/forks.ts'
import { safeBookFileName, suggestExportTitles } from '../src/titles.ts'

describe('cleanProse', () => {
  it('strips the 歧路 block from exported prose', () => {
    const raw = '山门开了。\n\n【歧路】\n1. 推门进去\n2. 先问守门人\n3. 绕到侧廊\n亦可自己写一条别的路。'
    expect(cleanProse(raw)).toBe('山门开了。')
    expect(cleanProse(raw)).not.toContain('歧路')
  })

  it('keeps the story when an earlier draft also mentions 歧路', () => {
    const raw = [
      'Need maybe include 【歧路】 later. Final.',
      '',
      '门轴在掌下发出枯骨般的响。谢无妄把门后那根木闩一点一点推上。',
      '',
      '【歧路】',
      '1. 先挪人进柜台后',
      '2. 捡起告示',
    ].join('\n')
    expect(cleanProse(raw)).toContain('门轴在掌下发出枯骨般的响')
    expect(cleanProse(raw)).not.toContain('先挪人进柜台后')
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

describe('planning dump', () => {
  const dump = `用户让我写小说正文。需要遵守叙事护栏、剧情推进。
当前场景：主神广场。
我要推进剧情。让我构思：
机械臂女人回答三成怎么算。
我写正文。不要输出章节名`

  it('detects instruction echoes as not fiction', () => {
    expect(isPlanningDump(dump)).toBe(true)
    expect(extractStoryBody(dump)).toBe('')
    expect(isPlanningDump('巷口的驴鸣突然断了。')).toBe(false)
  })

  it('pulls fiction out of a single-paragraph mixed dump', () => {
    const wall = [
      'The user gave an action: 装昏诱魔修近前.',
      'I need to continue the narrative. Let\'s draft. Need to write a fresh segment.',
      '她向后一仰，后脑磕在车板草叶上，眼皮沉沉合拢，连呼吸都放成将断未断的细丝。水囊从膝边滚落。领头的灰袍魔修拿鞭杆挑开车帘。',
    ].join('\n')
    const body = extractStoryBody(wall)
    expect(body).toContain('车板草叶')
    expect(body).not.toContain('The user gave')
  })

  it('pulls the last Chinese fiction run out of a mixed English draft', () => {
    const mixed = `The user gave an action: 装昏诱魔修近前.
I need to continue the narrative. Let's draft.

Need to write a fresh segment. Do not write plan.

她向后一仰，后脑磕在车板草席上，眼皮沉沉合拢。水囊从膝边滚落。领头的灰袍魔修拿鞭杆挑开车帘。

Let's final. Must ensure no markdown.

她向后一仰，后脑磕在车板草叶上，眼皮沉沉合拢，连呼吸都放成将断未断的细丝。水囊从膝边滚落。领头的灰袍魔修拿鞭杆挑开车帘，半个身子探进来探她鼻息。那股混着尸油与铜灰的气味压近时，她忽然睁眼，肩膀撞开身后朽烂的板条。`
    const body = extractStoryBody(mixed)
    expect(body).toContain('车板草叶')
    expect(body).not.toContain('The user gave')
    expect(body).not.toContain('Let\'s draft')
    expect(isPlanningDump('我们需要回应用户“启程。”按照要求：只写小说正文')).toBe(true)
  })

  it('keeps planning out of the manuscript', () => {
    const txt = exportTranscript('无尽流浪', '陆沉舟', [
      { role: 'assistant', text: dump },
      { role: 'assistant', text: '广场上的光柱还在跳。陆沉舟问：“三成怎么算。”' },
    ], false, '无限流')
    expect(txt).toContain('# 无尽流浪')
    expect(txt).toContain('广场上的光柱还在跳')
    expect(txt).not.toContain('用户让我写')
    expect(txt).not.toContain('让我构思')
    expect(txt).toContain('第一章')
    expect(txt).not.toContain('第二章　用户让我')
  })
})

describe('exportTranscript', () => {
  it('drops opening instructions and player lines by default', () => {
    const txt = exportTranscript('青囊', '陈行舟', [
      { role: 'user', text: '【开局】请开始' },
      { role: 'assistant', text: '【正文】晨雾里有人扫地。' },
      { role: 'user', text: '上前询问' },
      { role: 'system', text: 'ignore' },
    ], false, '民俗')
    expect(txt).toContain('# 青囊')
    expect(txt).toContain('诸天万界 · 民俗')
    expect(txt).toContain('天命之人：陈行舟')
    expect(txt).toContain('## 第一章　晨雾里有人扫地')
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
    expect(txt).toContain('*你：推门*')
    expect(txt).toContain('门轴吱呀。')
    expect(txt).toContain('## 第一章')
  })

  it('binds extracted prose when the transcript path is empty', () => {
    const book = bindManuscript('掌中剑', '谢无妄', '奇幻', '门轴在掌下发出枯骨般的响。谢无妄把门后那根从未上过油的木闩一点一点推上。')
    expect(manuscriptHasBody(book)).toBe(true)
    expect(book).toContain('# 掌中剑')
    expect(book).toContain('天命之人：谢无妄')
    expect(book).toContain('门轴在掌下发出枯骨般的响')
  })

  it('numbers later chapters in Chinese', () => {
    expect(chineseChapter(1)).toBe('一')
    expect(chineseChapter(12)).toBe('十二')
    expect(chineseChapter(20)).toBe('二十')
    expect(chapterHeading(2, '夜闯藏经阁。钟声提前。')).toBe('第二章　夜闯藏经阁')
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

  it('reads the last 歧路 menu when a draft mentioned it earlier', () => {
    const raw = 'Need include 【歧路】 later.\n\n门开了。\n\n【歧路】\n1. 应门\n2. 藏尸\n3. 拔剑'
    expect(parseForkOptions(raw)).toEqual(['应门', '藏尸', '拔剑'])
  })
})

describe('suggestExportTitles', () => {
  it('leads with world and protagonist, then a quote clip', () => {
    const titles = suggestExportTitles('奇幻', '谢无妄', '巷口忽然静了。“谁的人头，谁的价。”猎人把碗推过来。')
    expect(titles[0]).toBe('奇幻·谢无妄')
    expect(titles).toContain('谁的人头，谁的价')
  })

  it('builds a safe windows file name', () => {
    expect(safeBookFileName('奇幻·谢无妄')).toBe('奇幻·谢无妄.md')
    expect(safeBookFileName('a<b>:"c')).toBe('a b c.md')
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
