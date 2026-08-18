import { type LoreEntry, type StoryMeta, type TemplateId } from 'infinite-core';
import type { PluginConfig } from './types.js';
export declare const META_FILE = "meta.yml";
export declare const WORLD_DIR = "worldbook";
export declare const CHAR_DIR = "characters";
export declare const PLOT_DIR = "plots";
export declare const ARCHIVE_FILE = "archive.md";
export declare const EXPORT_FILE = "export.md";
export declare function metaPath(root: string): string;
export declare function hasStory(root: string): boolean;
export declare function loadMeta(root: string): StoryMeta | null;
export declare function saveMeta(root: string, meta: StoryMeta): void;
/** Session world rules: worldbook only. Plots stay in plots/ for the opening picker. */
export declare function loadWorldbook(root: string): LoreEntry[];
export declare function loadCharacters(root: string): LoreEntry[];
export declare function loadPlots(root: string): LoreEntry[];
export declare function listTemplatePlots(config: Required<PluginConfig>, templateId: TemplateId): LoreEntry[];
export declare function listTemplateCharacters(config: Required<PluginConfig>, templateId: TemplateId): LoreEntry[];
export declare function applyOpening(root: string, plot: LoreEntry): void;
export declare function loadArchive(root: string): string;
export declare function saveArchive(root: string, text: string): void;
/** Keep only this name as the constant hero; other cards become NPCs. */
export declare function applyProtagonistIdentity(root: string, name: string): string;
/**
 * Do not write custom session events. DSH refuses unknown required types on
 * the next cold load (`SessionFormatUnsupportedError`). Bind state lives in
 * `meta.yml`.
 */
export declare function appendStoryBind(_session: {
    append?: (type: string, data?: Record<string, unknown>) => void;
}, _data: Record<string, unknown>): void;
export declare function saveExport(root: string, text: string): string;
export declare function saveNamedExport(dir: string, fileName: string, text: string): string;
export declare function templatePath(config: Required<PluginConfig>, templateId: TemplateId): string;
export declare function seedStory(root: string, templateId: TemplateId, config: Required<PluginConfig>, force: boolean): StoryMeta;
export declare function writeProtagonistCard(root: string, name: string): void;
