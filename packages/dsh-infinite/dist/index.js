import { registerCommands } from './commands.js';
import { registerCoverServer } from './covers-host.js';
import { installUserPreset } from './install-preset.js';
import { onSessionEvent } from './lifecycle.js';
import { registerPrompt } from './prompt.js';
import { resolveConfig } from './types.js';
export const name = 'dsh-infinite';
export const inject = ['commands', 'systemPrompt', 'userQuestions'];
export function apply(ctx, raw) {
    const config = resolveConfig(raw);
    installUserPreset(config);
    registerCoverServer(ctx, config);
    registerCommands(ctx, config);
    registerPrompt(ctx, config);
    ctx.effect(() => ctx.on('session/event', (...args) => {
        const session = args[0];
        const event = args[1];
        if (!session || !event)
            return;
        onSessionEvent(ctx, config, session, event);
    }), 'infinite.session');
}
export { apply as default };
