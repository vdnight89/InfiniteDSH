import { type TranscriptMessage } from 'infinite-core';
import type { DuckSession } from './types.js';
/** Project a session log (or deriveMessages fallback) into role/text pairs. */
export declare function sessionMessages(session: DuckSession): TranscriptMessage[];
export declare function recentText(session: DuckSession, last?: number): string;
export declare function hasAssistantProse(session: DuckSession): boolean;
export declare function summaryFromCompaction(data: Record<string, unknown> | undefined): string;
