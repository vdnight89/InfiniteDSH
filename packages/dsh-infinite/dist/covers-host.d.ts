import type { InfiniteContext, PluginConfig } from './types.js';
export declare function coversRoot(config: Required<PluginConfig>): string;
export declare function safeCoverName(name: string): string | null;
export declare function registerCoverServer(ctx: InfiniteContext, config: Required<PluginConfig>): void;
