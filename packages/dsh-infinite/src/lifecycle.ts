import { bookNameForTemplate, formatArchive, pickRandomEventEntry, safeBookFileName } from 'infinite-core'
import { exportDone } from './copy.js'
import { offerForks } from './forks-host.js'
import { infiniteRoot, resolveSessionDir } from './paths.js'
import { finalizeManuscript } from './polish.js'
import { revealFile } from './reveal.js'
import { appendStoryBind, loadArchive, loadMeta, loadWorldbook, saveArchive, saveExport, saveMeta, saveNamedExport } from './story-files.js'
import { lastAssistantRaw, recentText, summaryFromCompaction } from './transcript.js'
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
    if (latest?.exportPending) {
      finishPolishExport(root, session, latest)
      return
    }
    if (latest?.pendingEventId) {
      const next = {
        ...latest,
        pickedEventIds: [...latest.pickedEventIds, latest.pendingEventId],
        pendingEventId: null,
      }
      saveMeta(root, next)
      appendStoryBind(session, {
        templateId: next.templateId,
        protagonist: next.protagonist,
        pendingEventId: next.pendingEventId,
        pickedEventIds: next.pickedEventIds,
        dir: 'infinite',
      })
    }
    void offerForks(ctx, session)
    return
  }

  if (event.type === 'compaction/summary') {
    const summary = summaryFromCompaction(event.data)
    const text = formatArchive(summary, new Date().toISOString(), loadArchive(root))
    saveArchive(root, text)
  }
}

function finishPolishExport(
  root: string,
  session: DuckSession,
  meta: NonNullable<ReturnType<typeof loadMeta>>,
): void {
  const title = meta.exportTitle || meta.protagonist || '诸天万界书稿'
  const world = bookNameForTemplate(meta.templateId)
  const book = finalizeManuscript(lastAssistantRaw(session), title, world, meta.protagonist)
  const destDir = meta.exportCwd || session.header?.cwd || process.cwd()
  if (book) {
    const dest = saveNamedExport(destDir, safeBookFileName(title), book)
    saveExport(root, book)
    revealFile(dest)
    session.append?.('command/done', {
      kind: 'success',
      text: exportDone(book.length, title, dest, true),
    })
  }
  saveMeta(root, {
    version: meta.version,
    templateId: meta.templateId,
    protagonist: meta.protagonist,
    narrativeGuard: meta.narrativeGuard,
    progressionGuard: meta.progressionGuard,
    randomEvent: meta.randomEvent,
    pickedEventIds: meta.pickedEventIds,
    pendingEventId: meta.pendingEventId,
    createdAt: meta.createdAt,
  })
}

