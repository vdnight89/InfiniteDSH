export const name = 'infinite-restrict'
export const inject = ['tools']

export function apply(ctx) {
  ctx.tools.restrict({ allow: [] })
}
