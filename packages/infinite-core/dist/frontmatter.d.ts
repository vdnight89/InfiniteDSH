import type { LoreEntry, StoryMeta } from './types.js';
/** Split a Markdown file into front matter map and body. */
export declare function parseFrontMatter(source: string): {
    fields: Record<string, string>;
    body: string;
};
/**
 * Parse one lore Markdown file into an entry.
 * @param source - file text
 * @param fallbackId - used when front matter has no id
 */
export declare function parseLoreEntry(source: string, fallbackId: string): LoreEntry;
/** Parse story meta.yml (flat YAML subset). */
export declare function parseStoryMeta(source: string): StoryMeta;
/** Serialize story meta to a flat YAML document. */
export declare function formatStoryMeta(meta: StoryMeta): string;
export declare function defaultMeta(templateId: string, protagonist: string): StoryMeta;
