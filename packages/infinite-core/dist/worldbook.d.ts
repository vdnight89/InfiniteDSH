import type { LoreEntry, WorldContextOptions, WorldContextResult } from './types.js';
/** Entries whose keys appear in recent text. Constant and disabled entries are skipped. */
export declare function findMatchingEntries(entries: readonly LoreEntry[], contextText: string): LoreEntry[];
/**
 * Build the world-rule block: constants first, then keyword hits, truncated by budget.
 * @param bookName - header label
 */
export declare function buildWorldContext(entries: readonly LoreEntry[], recentText: string, bookName: string, options?: WorldContextOptions): WorldContextResult;
/** Character cards: constants always; others on trigger-word hit. */
export declare function buildCharacterContext(entries: readonly LoreEntry[], recentText: string, protagonist: string): string;
