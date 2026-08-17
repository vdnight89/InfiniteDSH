export const name = 'infinite-restrict';
export const inject = ['tools'];
/**
 * Literary preset row: hide every global tool for this agent scope.
 * Scoped registrations (none in v1) would still appear.
 */
export function apply(ctx) {
    ctx.tools.restrict({ allow: [] });
}
export function applyRestrict(ctx) {
    apply(ctx);
}
