import type { LoreEntry } from './types.js';
/**
 * Pick one unused, non-constant, unmatched enabled entry.
 * @param rng - returns [0, 1)
 */
export declare function pickRandomEventEntry(entries: readonly LoreEntry[], recentText: string, excludeIds: readonly string[], rng?: () => number): LoreEntry | null;
export declare function formatRandomEvent(entry: LoreEntry): string;
