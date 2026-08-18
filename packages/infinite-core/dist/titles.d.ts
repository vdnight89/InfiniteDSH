/** Two or three manuscript titles from world, hero, and opening prose. */
export declare function suggestExportTitles(world: string, protagonist: string, prose: string): string[];
/** Windows-safe file stem plus `.md`, or `.草稿.md` for the pre-polish pass. */
export declare function safeBookFileName(title: string, variant?: 'book' | 'draft'): string;
