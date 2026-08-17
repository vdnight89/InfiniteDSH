import { findMatchingEntries } from './worldbook.js';
/**
 * Pick one unused, non-constant, unmatched enabled entry.
 * @param rng - returns [0, 1)
 */
export function pickRandomEventEntry(entries, recentText, excludeIds, rng = Math.random) {
    const matchedIds = new Set(findMatchingEntries(entries, recentText).map((e) => e.id));
    const excluded = new Set(excludeIds);
    const pool = entries.filter((e) => !e.disabled && !e.constant && !matchedIds.has(e.id) && !excluded.has(e.id));
    if (pool.length === 0)
        return null;
    const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
    return pool[index] ?? null;
}
export function formatRandomEvent(entry) {
    return (`【随机世界事件】以下设定来自当前规则书，可作为本段剧情的新进展、转折或悬念自然引出` +
        `（不必强行出现，未引出也不算失败）：\n【${entry.category}·${entry.title}】${entry.content}`);
}
