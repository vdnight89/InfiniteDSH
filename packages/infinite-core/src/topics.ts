import { TEMPLATE_CATALOG } from './catalog.generated.js'
import type { TemplateId } from './types.js'

export interface TopicChoice {
  readonly id: TemplateId
  readonly label: string
  readonly description: string
}

export const TEMPLATE_IDS: readonly TemplateId[] = TEMPLATE_CATALOG.map((item) => item.id)

export const TOPIC_CHOICES: readonly TopicChoice[] = TEMPLATE_CATALOG.map((item) => ({
  id: item.id,
  label: item.label,
  description: item.description,
}))

export function topicChoice(id: TemplateId): TopicChoice {
  return TOPIC_CHOICES.find((item) => item.id === id) ?? TOPIC_CHOICES[0]!
}

export function catalogEntry(id: string) {
  return TEMPLATE_CATALOG.find((item) => item.id === id)
}

/** Resolve a user topic token to a shipped template id. Empty → null (caller should ask). */
export function resolveTemplateId(raw: string | undefined): TemplateId | null {
  const key = (raw ?? '').trim()
  if (!key) return null
  const lower = key.toLowerCase()
  for (const item of TEMPLATE_CATALOG) {
    if (item.id === lower || item.label === key) return item.id
    if (item.aliases.some((alias) => alias === key || alias.toLowerCase() === lower)) return item.id
  }
  return null
}

export function templateIdFromLabel(label: string): TemplateId | null {
  return resolveTemplateId(label)
}

export function defaultProtagonist(templateId: TemplateId): string {
  return catalogEntry(templateId)?.defaultProtagonist || '陆沉舟'
}

export function parseCommandArgs(rawInput: string): { topic: string; force: boolean; rest: string[] } {
  const tokens = rawInput.trim().split(/\s+/).filter(Boolean)
  const force = tokens.some((t) => t.toLowerCase() === 'force')
  const rest = tokens.filter((t) => t.toLowerCase() !== 'force')
  return { topic: rest[0] ?? '', force, rest }
}

export const KEEP_DEFAULT_PROTAGONIST = '用题材默认主角'
export const KEEP_DEFAULT_OPENING = '用默认开篇'
