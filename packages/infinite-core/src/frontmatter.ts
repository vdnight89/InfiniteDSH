import type { LoreEntry, StoryMeta } from './types.js'

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

/** Split a Markdown file into front matter map and body. */
export function parseFrontMatter(source: string): { fields: Record<string, string>; body: string } {
  const match = FENCE.exec(source)
  if (!match) return { fields: {}, body: source.trim() }
  const fields: Record<string, string> = {}
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return { fields, body: source.slice(match[0].length).trim() }
}

function parseStringList(raw: string | undefined): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
  }
  return trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback
  const v = raw.toLowerCase()
  if (v === 'true' || v === 'yes' || v === '1') return true
  if (v === 'false' || v === 'no' || v === '0') return false
  return fallback
}

function parseIntField(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Parse one lore Markdown file into an entry.
 * @param source - file text
 * @param fallbackId - used when front matter has no id
 */
export function parseLoreEntry(source: string, fallbackId: string): LoreEntry {
  const { fields, body } = parseFrontMatter(source)
  const id = fields.id?.trim() || fallbackId
  return {
    id,
    title: fields.title?.trim() || id,
    category: fields.category?.trim() || '设定',
    keys: parseStringList(fields.keys),
    content: body,
    constant: parseBool(fields.constant, false),
    order: parseIntField(fields.order, 0),
    disabled: parseBool(fields.disabled, false),
  }
}

/** Parse story meta.yml (flat YAML subset). */
export function parseStoryMeta(source: string): StoryMeta {
  const { fields } = parseFrontMatter(`---\n${source.trim()}\n---\n`)
  return {
    version: 1,
    templateId: fields.templateId?.trim() || 'cultivation',
    protagonist: fields.protagonist?.trim() || '',
    narrativeGuard: parseBool(fields.narrativeGuard, true),
    progressionGuard: parseBool(fields.progressionGuard, true),
    randomEvent: parseBool(fields.randomEvent, true),
    pickedEventIds: parseStringList(fields.pickedEventIds),
    pendingEventId: fields.pendingEventId && fields.pendingEventId !== 'null'
      ? fields.pendingEventId
      : null,
    createdAt: fields.createdAt?.trim() || new Date().toISOString(),
    ...(parseBool(fields.exportPending, false) ? { exportPending: true as const } : {}),
    ...(fields.exportTitle?.trim() ? { exportTitle: fields.exportTitle.trim() } : {}),
    ...(fields.exportCwd?.trim()
      ? { exportCwd: fields.exportCwd.trim().replace(/^['"]|['"]$/g, '') }
      : {}),
  }
}

/** Serialize story meta to a flat YAML document. */
export function formatStoryMeta(meta: StoryMeta): string {
  const pending = meta.pendingEventId ?? 'null'
  const picked = meta.pickedEventIds.length === 0
    ? '[]'
    : `[${meta.pickedEventIds.join(', ')}]`
  return [
    `version: ${meta.version}`,
    `templateId: ${meta.templateId}`,
    `protagonist: ${meta.protagonist}`,
    `narrativeGuard: ${meta.narrativeGuard}`,
    `progressionGuard: ${meta.progressionGuard}`,
    `randomEvent: ${meta.randomEvent}`,
    `pickedEventIds: ${picked}`,
    `pendingEventId: ${pending}`,
    `createdAt: ${meta.createdAt}`,
    ...(meta.exportPending ? ['exportPending: true'] : []),
    ...(meta.exportTitle ? [`exportTitle: ${JSON.stringify(meta.exportTitle)}`] : []),
    ...(meta.exportCwd ? [`exportCwd: ${JSON.stringify(meta.exportCwd)}`] : []),
    '',
  ].join('\n')
}

export function defaultMeta(templateId: string, protagonist: string): StoryMeta {
  return {
    version: 1,
    templateId,
    protagonist,
    narrativeGuard: true,
    progressionGuard: true,
    randomEvent: true,
    pickedEventIds: [],
    pendingEventId: null,
    createdAt: new Date().toISOString(),
  }
}
