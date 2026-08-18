import type { TranscriptMessage } from './types.js';
/** Drop template labels and author notes from one assistant blob. */
export declare function cleanProse(text: string): string;
/** True when the blob is a writing plan or instruction echo, not fiction. */
export declare function isPlanningDump(text: string): boolean;
/** Keep only the story; drop planning dumps and instruction echoes. */
export declare function extractStoryBody(text: string): string;
export declare function isOpeningInstruction(text: string): boolean;
/**
 * Build a typeset Markdown manuscript from one session transcript.
 * @param includePlayer - when true, keep player actions as italic bridges
 */
export declare function exportTranscript(title: string, protagonist: string, messages: readonly TranscriptMessage[], includePlayer: boolean, world?: string): string;
export declare function chapterHeading(index: number, body: string): string;
export declare function chineseChapter(index: number): string;
export declare function formatArchive(summary: string, at: string, previous?: string): string;
