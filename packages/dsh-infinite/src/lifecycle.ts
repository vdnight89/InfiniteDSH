import { formatArchive, pickRandomEventEntry } from 'infinite-core'
import { infiniteRoot, resolveSessionDir } from './paths.js'
import { loadMeta, loadWorldbook, saveArchive, saveMeta } from './story-files.js'
import { recentText, summaryFromCompaction } from './transcript.js'
import type { DuckEvent, DuckSession, InfiniteContext, PluginConfig } from './types.js'

export function onSessionEvent(
  ctx: InfiniteContext,
  config: Required<PluginConfig>,
  session: DuckSession,
  event: DuckEvent,
): void {
  const root = infiniteRoot(resolveSessionDir(ctx, session, config))
  const meta = loadMeta(root)
  if (!meta) return

  if (event.type === 'turn/start' && meta.randomEvent) {
    const pool = loadWorldbook(root).filter(
      (entry) => entry.category !== '写法' && entry.category !== '开篇' && entry.category !== '剧情',
    )
    const picked = pickRandomEventEntry(
      pool,
      recentText(session),
      meta.pickedEventIds,
    )
    saveMeta(root, { ...meta, pendingEventId: picked?.id ?? null })
    return
  }

  if (event.type === 'turn/end') {
    const latest = loadMeta(root)
    if (!latest?.pendingEventId) return
    saveMeta(root, {
      ...latest,
      pickedEventIds: [...latest.pickedEventIds, latest.pendingEventId],
      pendingEventId: null,
    })
    return
  }

  if (event.type === 'compaction/summary') {
    const summary = summaryFromCompaction(event.data)
    const text = formatArchive(summary, new Date().toISOString())
    saveArchive(root, text)
  }
}
