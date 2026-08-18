import type { DuckAgent, DuckSession, FollowupMessage, InfiniteContext } from './types.js';
export declare function pluginUserMessage(text: string): FollowupMessage;
/** Queue a next-turn user line and wake the driver. Official plugins use followup/steer. */
export declare function wakeAgent(agent: DuckAgent | undefined, text: string): boolean;
/** Wake now; if the driver is still settling after a command, retry once. */
export declare function wakeSoon(agent: DuckAgent | undefined, text: string): boolean;
export declare function liveAgent(ctx: InfiniteContext, session: DuckSession): DuckAgent | undefined;
