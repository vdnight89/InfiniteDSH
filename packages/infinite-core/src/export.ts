import type { TranscriptMessage } from './types.js'

const META_LINE = /^\s*【(?:章节名|场景信息|对话推荐|开局|世界规则|叙事护栏|剧情推进|输出要求|随机世界事件|角色|当前场景|歧路)】.*$/
const BODY_TAG = /【正文】/g
const FENCE_BLOCK = /```[\s\S]*?```/g
const FORK_BLOCK = /【歧路】[\s\S]*$/

/** Drop template labels and author notes from one assistant blob. */
export function cleanProse(text: string): string {
  const withoutFences = text.replace(FENCE_BLOCK, '')
  const withoutFork = withoutFences.replace(FORK_BLOCK, '')
  const withoutMeta = withoutFork
    .split(/\r?\n/)
    .filter((line) => !META_LINE.test(line) && !/^(?:亦可自己写一条)/.test(line.trim()))
    .join('\n')
    .replace(BODY_TAG, '')
  return withoutMeta
    .replace(/^\s*#{1,6}\s+.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function isOpeningInstruction(text: string): boolean {
  const t = text.trim()
  return t.startsWith('【开局】') || t.startsWith('[开局]') || t === '启程。' || t === '启程'
}

/**
 * Build a typeset Markdown manuscript from one session transcript.
 * @param includePlayer - when true, keep player actions as italic bridges
 */
export function exportTranscript(
  title: string,
  protagonist: string,
  messages: readonly TranscriptMessage[],
  includePlayer: boolean,
  world = '',
): string {
  const chapters: { heading: string; body: string; bridges: string[] }[] = []
  let bridges: string[] = []
  for (const message of messages) {
    if (message.role === 'system') continue
    if (isOpeningInstruction(message.text)) continue
    if (message.role === 'user') {
      const body = message.text.trim()
      if (includePlayer && body && !isOpeningInstruction(body)) bridges.push(body)
      continue
    }
    const body = cleanProse(message.text)
    if (!body) continue
    chapters.push({
      heading: chapterHeading(chapters.length + 1, body),
      body,
      bridges,
    })
    bridges = []
  }

  const lines: string[] = [`# ${title}`, '']
  const series = world ? `诸天万界 · ${world}` : '诸天万界'
  lines.push(`> ${series}`)
  if (protagonist) lines.push(`> 天命之人：${protagonist}`)
  lines.push(`> 誊录于 ${formatExportDate(new Date())}`, '', '---', '')

  for (const chapter of chapters) {
    for (const action of chapter.bridges) {
      lines.push(`*你：${action}*`, '')
    }
    lines.push(`## ${chapter.heading}`, '', chapter.body, '')
  }
  if (bridges.length > 0 && includePlayer) {
    for (const action of bridges) lines.push(`*你：${action}*`, '')
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

export function chapterHeading(index: number, body: string): string {
  const name = clipChapterTitle(body)
  return name ? `第${chineseChapter(index)}章　${name}` : `第${chineseChapter(index)}章`
}

export function chineseChapter(index: number): string {
  if (index <= 0) return String(index)
  if (index < 10) return '一二三四五六七八九'[index - 1] ?? String(index)
  if (index === 10) return '十'
  if (index < 20) return `十${'一二三四五六七八九'[index - 11]}`
  if (index < 100) {
    const tens = Math.floor(index / 10)
    const ones = index % 10
    const head = `${'一二三四五六七八九'[tens - 1]}十`
    return ones === 0 ? head : `${head}${'一二三四五六七八九'[ones - 1]}`
  }
  return String(index)
}

function clipChapterTitle(body: string): string {
  const sentence = body.split(/[。！？\n]/).map((part) => part.trim()).find((part) => part.length >= 2) ?? ''
  const cut = sentence.replace(/^[“"]|[”"]$/g, '').replace(/[，、；：].*$/, '').trim()
  if (cut.length < 2) return ''
  return cut.slice(0, 12)
}

function formatExportDate(at: Date): string {
  return `${at.getFullYear()}年${at.getMonth() + 1}月${at.getDate()}日`
}

export function formatArchive(summary: string, at: string, previous = ''): string {
  const body = summary.trim()
  const prior = previous.trim()
  if (!body) return prior
  const section = `## ${at}\n\n${body}\n`
  if (!prior) return `# 剧情档案\n\n${section}`
  return `${prior}\n\n${section}`
}
