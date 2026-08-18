import { cleanProse, extractStoryBody, type TranscriptMessage } from 'infinite-core'
import type { DuckEvent, DuckSession } from './types.js'

function blocksToText(value: unknown): string {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''
  const parts: string[] = []
  for (const block of value) {
    if (!block || typeof block !== 'object') continue
    const rec = block as { type?: string; text?: string }
    if (typeof rec.text === 'string') parts.push(rec.text)
  }
  return parts.join('')
}

function messageText(message: unknown): string {
  if (!message || typeof message !== 'object') return ''
  const rec = message as { content?: unknown; text?: unknown }
  if (typeof rec.text === 'string') return rec.text
  return blocksToText(rec.content)
}

function eventToMessage(event: DuckEvent): TranscriptMessage | null {
  if (event.type === 'user/message') {
    const text = messageText(event.data?.message ?? event.data)
    return { role: 'user', text }
  }
  if (event.type === 'assistant/message') {
    const text = messageText(event.data?.message ?? event.data)
    return { role: 'assistant', text }
  }
  return null
}

/** Project a session log (or deriveMessages fallback) into role/text pairs. */
export function sessionMessages(session: DuckSession): TranscriptMessage[] {
  if (Array.isArray(session.events) && session.events.length > 0) {
    const out: TranscriptMessage[] = []
    for (const event of session.events) {
      const msg = eventToMessage(event)
      if (msg && msg.text.trim()) out.push(msg)
    }
    return out
  }
  const derived = session.deriveMessages?.() ?? []
  const out: TranscriptMessage[] = []
  for (const item of derived) {
    if (!item || typeof item !== 'object') continue
    const rec = item as { role?: string; content?: unknown }
    const role = rec.role
    if (role !== 'user' && role !== 'assistant' && role !== 'system') continue
    const text = blocksToText(rec.content)
    if (text.trim()) out.push({ role, text })
  }
  return out
}

export function recentText(session: DuckSession, last = 4): string {
  const msgs = sessionMessages(session).filter((m) => m.role !== 'system')
  return msgs
    .slice(-last)
    .map((m) => (m.role === 'assistant' ? extractStoryBody(m.text) : m.text))
    .filter((text) => text.trim().length > 0)
    .join('\n')
}

export function hasAssistantProse(session: DuckSession): boolean {
  return sessionMessages(session).some((m) => m.role === 'assistant' && extractStoryBody(m.text).length > 0)
}

export function lastAssistantRaw(session: DuckSession): string {
  const msgs = sessionMessages(session)
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    if (msgs[i]?.role === 'assistant') return msgs[i]!.text
  }
  return ''
}

export function summaryFromCompaction(data: Record<string, unknown> | undefined): string {
  if (!data) return ''
  if (typeof data.summary === 'string') return data.summary
  return blocksToText(data.summary)
}
