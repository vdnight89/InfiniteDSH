/** One lore entry loaded from a Markdown file with YAML-like front matter. */
export interface LoreEntry {
  readonly id: string
  readonly title: string
  readonly category: string
  readonly keys: readonly string[]
  readonly content: string
  readonly constant: boolean
  readonly order: number
  readonly disabled: boolean
}

/** Story binding persisted as infinite/meta.yml. */
export interface StoryMeta {
  readonly version: 1
  readonly templateId: string
  readonly protagonist: string
  readonly narrativeGuard: boolean
  readonly progressionGuard: boolean
  readonly randomEvent: boolean
  readonly pickedEventIds: readonly string[]
  readonly pendingEventId: string | null
  readonly createdAt: string
  readonly exportPending?: boolean
  readonly exportTitle?: string
  readonly exportCwd?: string
}

export interface WorldContextOptions {
  readonly maxChars?: number
  readonly maxMatchedEntries?: number
  readonly maxConstantEntries?: number
}

export interface WorldContextResult {
  readonly text: string
  readonly matchedEntryIds: readonly string[]
  readonly constantCount: number
}

export type TemplateId = string

export interface TranscriptMessage {
  readonly role: 'user' | 'assistant' | 'system'
  readonly text: string
}

export const DEFAULT_WORLD_OPTIONS = {
  maxChars: 8000,
  maxMatchedEntries: 20,
  maxConstantEntries: 15,
} as const

export const META_VERSION = 1 as const
