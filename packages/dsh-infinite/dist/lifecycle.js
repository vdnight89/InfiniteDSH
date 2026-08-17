import { formatArchive, pickRandomEventEntry } from 'infinite-core';
import { infiniteRoot, resolveSessionDir } from './paths.js';
import { appendStoryBind, loadArchive, loadMeta, loadWorldbook, saveArchive, saveMeta } from './story-files.js';
import { recentText, summaryFromCompaction } from './transcript.js';
export function onSessionEvent(ctx, config, session, event) {
    const root = infiniteRoot(resolveSessionDir(ctx, session, config));
    const meta = loadMeta(root);
    if (!meta)
        return;
    if (event.type === 'turn/start' && meta.randomEvent) {
        const pool = loadWorldbook(root).filter((entry) => entry.category !== '写法' && entry.category !== '开篇' && entry.category !== '剧情');
        const picked = pickRandomEventEntry(pool, recentText(session), meta.pickedEventIds);
        saveMeta(root, { ...meta, pendingEventId: picked?.id ?? null });
        return;
    }
    if (event.type === 'turn/end') {
        const latest = loadMeta(root);
        if (!latest?.pendingEventId)
            return;
        const next = {
            ...latest,
            pickedEventIds: [...latest.pickedEventIds, latest.pendingEventId],
            pendingEventId: null,
        };
        saveMeta(root, next);
        appendStoryBind(session, {
            templateId: next.templateId,
            protagonist: next.protagonist,
            pendingEventId: next.pendingEventId,
            pickedEventIds: next.pickedEventIds,
            dir: 'infinite',
        });
        return;
    }
    if (event.type === 'compaction/summary') {
        const summary = summaryFromCompaction(event.data);
        const text = formatArchive(summary, new Date().toISOString(), loadArchive(root));
        saveArchive(root, text);
    }
}
