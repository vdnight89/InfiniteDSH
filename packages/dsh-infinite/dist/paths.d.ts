import type { DuckSession, InfiniteContext, PluginConfig } from './types.js';
export declare function defaultTemplatesDir(): string;
export declare function defaultPresetDir(): string;
export declare function resolveDshHome(config: Required<PluginConfig>): string;
export declare function fallbackStoriesRoot(config: Required<PluginConfig>): string;
export declare function safeSessionId(id: string): string;
/** Directory that owns this session's artifacts. */
export declare function resolveSessionDir(ctx: InfiniteContext, session: DuckSession, config: Required<PluginConfig>): string;
export declare function infiniteRoot(sessionDir: string): string;
export declare function templatesDir(config: Required<PluginConfig>): string;
export declare function userPresetTarget(config: Required<PluginConfig>): string;
