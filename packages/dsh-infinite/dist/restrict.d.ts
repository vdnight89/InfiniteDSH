import type { InfiniteContext } from './types.js';
export declare const name = "infinite-restrict";
export declare const inject: string[];
interface RestrictContext {
    readonly tools: {
        restrict(filter: {
            allow?: readonly string[];
            deny?: readonly string[];
        }): () => void;
    };
}
/**
 * Literary preset row: hide every global tool for this agent scope.
 * Scoped registrations (none in v1) would still appear.
 */
export declare function apply(ctx: RestrictContext): void;
export declare function applyRestrict(ctx: InfiniteContext & RestrictContext): void;
export {};
