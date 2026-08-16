import type { InfiniteContext } from './types.js'

export const name = 'infinite-restrict'
export const inject = ['tools']

interface RestrictContext {
  readonly tools: {
    restrict(filter: { allow?: readonly string[]; deny?: readonly string[] }): () => void
  }
}

/**
 * Literary preset row: hide every global tool for this agent scope.
 * Scoped registrations (none in v1) would still appear.
 */
export function apply(ctx: RestrictContext): void {
  ctx.tools.restrict({ allow: [] })
}

export function applyRestrict(ctx: InfiniteContext & RestrictContext): void {
  apply(ctx)
}
