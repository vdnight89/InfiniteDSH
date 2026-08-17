import type { DuckEvent, DuckSession, InfiniteContext, PluginConfig } from './types.js';
export declare function onSessionEvent(ctx: InfiniteContext, config: Required<PluginConfig>, session: DuckSession, event: DuckEvent): void;
