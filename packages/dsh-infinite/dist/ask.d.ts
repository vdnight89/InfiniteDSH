import type { AskAnswerItem, AskItem, CommandInvocation, InfiniteContext } from './types.js';
export declare function isNoAskProvider(error: unknown): boolean;
/** True only when a UI provider is known to exist. Headless still exposes ask(). */
export declare function canAsk(ctx: InfiniteContext): boolean;
export declare function stripRecommend(label: string): string;
export declare function pickAnswer(answers: readonly AskAnswerItem[], id: string): string;
export declare function askUser(ctx: InfiniteContext, inv: CommandInvocation, questions: readonly AskItem[]): Promise<readonly AskAnswerItem[] | null>;
