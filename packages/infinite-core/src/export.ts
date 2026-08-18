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
 * Build a clean export from one session transcript.
 * @param includePlayer - when true, prefix player lines with （你）
 */
export function exportTranscript(
  title: string,
  protagonist: string,
  messages: readonly TranscriptMessage[],
  includePlayer: boolean,
): string {
  const lines: string[] = [title]
  if (protagonist) lines.push(`主角：${protagonist}`)
  lines.push(`导出时间：${new Date().toISOString()}`)
  lines.push('')
  for (const message of messages) {
    if (message.role === 'system') continue
    if (isOpeningInstruction(message.text)) continue
    if (message.role === 'user') {
      if (!includePlayer) continue
      const body = message.text.trim()
      if (!body) continue
      lines.push(`（你）${body}`, '')
      continue
    }
    const body = cleanProse(message.text)
    if (!body) continue
    lines.push(body, '')
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

export function formatArchive(summary: string, at: string, previous = ''): string {
  const body = summary.trim()
  const prior = previous.trim()
  if (!body) return prior
  const section = `## ${at}\n\n${body}\n`
  if (!prior) return `# 剧情档案\n\n${section}`
  return `${prior}\n\n${section}`
}
