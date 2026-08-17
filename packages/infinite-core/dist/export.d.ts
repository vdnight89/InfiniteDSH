import type { TranscriptMessage } from './types.js';
/** Drop template labels and author notes from one assistant blob. */
export declare function cleanProse(text: string): string;
export declare function isOpeningInstruction(text: string): boolean;
/**
 * Build a clean export from one session transcript.
 * @param includePlayer - when true, prefix player lines with （你）
 */
export declare function exportTranscript(title: string, protagonist: string, messages: readonly TranscriptMessage[], includePlayer: boolean): string;
export declare function formatArchive(summary: string, at: string, previous?: string): string;
