import { type TranscriptMessage } from 'infinite-core';
import type { DuckSession } from './types.js';
/** Prefer the live transcript projection; fall back to walking the event log. */
export declare function sessionMessages(session: DuckSession): TranscriptMessage[];
/** Story-only source for polish/export. Harvests Chinese narrative if filters are too strict. */
export declare function collectExportSource(session: DuckSession): string;
export declare function recentText(session: DuckSession, last?: number): string;
export declare function hasAssistantProse(session: DuckSession): boolean;
export declare function lastAssistantRaw(session: DuckSession): string;
export declare function summaryFromCompaction(data: Record<string, unknown> | undefined): string;
