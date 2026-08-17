import type { InfiniteContext, PluginConfig } from './types.js';
export declare const name = "dsh-infinite";
export declare const inject: string[];
export type { PluginConfig };
/** Named exports only. Cordis unwraps `default` and would drop `inject`. */
export declare function apply(ctx: InfiniteContext, raw?: PluginConfig): void;
