import type { DuckSession, InfiniteContext } from './types.js';
/** After a prose turn, turn the 【歧路】 lines into a clickable ask. */
export declare function offerForks(ctx: InfiniteContext, session: DuckSession): Promise<void>;
