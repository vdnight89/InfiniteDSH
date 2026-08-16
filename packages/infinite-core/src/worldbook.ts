import type { LoreEntry, WorldContextOptions, WorldContextResult } from './types.js'
import { DEFAULT_WORLD_OPTIONS } from './types.js'

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '')
}

/** Entries whose keys appear in recent text. Constant and disabled entries are skipped. */
export function findMatchingEntries(entries: readonly LoreEntry[], contextText: string): LoreEntry[] {
  const haystack = normalize(contextText)
  if (!haystack) return []
  const matched: LoreEntry[] = []
  for (const entry of entries) {
    if (entry.disabled || entry.constant) continue
    for (const key of entry.keys) {
      const kw = normalize(key)
      if (kw.length >= 2 && haystack.includes(kw)) {
        matched.push(entry)
        break
      }
    }
  }
  return matched
}

/**
 * Build the world-rule block: constants first, then keyword hits, truncated by budget.
 * @param bookName - header label
 */
export function buildWorldContext(
  entries: readonly LoreEntry[],
  recentText: string,
  bookName: string,
  options?: WorldContextOptions,
): WorldContextResult {
  const empty: WorldContextResult = { text: '', matchedEntryIds: [], constantCount: 0 }
  const enabled = entries.filter((e) => !e.disabled)
  if (enabled.length === 0) return empty

  const opts = { ...DEFAULT_WORLD_OPTIONS, ...options }
  const constants = enabled
    .filter((e) => e.constant)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const matched = findMatchingEntries(enabled, recentText)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

  const header = `【世界规则·${bookName}】（世界基础规则：仅定义舞台与底层设定）`
  const lines: string[] = []
  for (const e of constants.slice(0, opts.maxConstantEntries)) {
    lines.push(`【${e.category}·${e.title}】${e.content}`)
  }
  const matchedEntryIds: string[] = []
  for (const e of matched.slice(0, opts.maxMatchedEntries)) {
    lines.push(`【${e.category}·${e.title}】${e.content}`)
    matchedEntryIds.push(e.id)
  }

  const included: string[] = []
  let consumed = header.length
  for (const line of lines) {
    if (consumed + line.length + 1 > opts.maxChars) break
    included.push(line)
    consumed += line.length + 1
  }
  if (included.length === 0) return empty
  return {
    text: `${header}\n${included.join('\n')}`,
    matchedEntryIds,
    constantCount: constants.length,
  }
}

/** Character cards: constants always; others on trigger-word hit. */
export function buildCharacterContext(
  entries: readonly LoreEntry[],
  recentText: string,
  protagonist: string,
): string {
  const enabled = entries.filter((e) => !e.disabled)
  if (enabled.length === 0 && !protagonist) return ''
  const hits = enabled.filter((e) => e.constant || findMatchingEntries([e], recentText).length > 0)
  const lines: string[] = []
  if (protagonist) lines.push(`主角（用户角色，叙事中心）：${protagonist}`)
  for (const e of hits.sort((a, b) => a.order - b.order)) {
    lines.push(`【${e.title}】${e.content}`)
  }
  if (lines.length === 0) return ''
  return `【角色】\n${lines.join('\n')}`
}
