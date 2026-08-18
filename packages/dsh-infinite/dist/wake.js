export function pluginUserMessage(text) {
    return {
        id: crypto.randomUUID(),
        role: 'user',
        content: [{ type: 'text', text }],
        source: { kind: 'plugin', plugin: 'dsh-infinite' },
    };
}
/** Queue a next-turn user line and wake the driver. Official plugins use followup/steer. */
export function wakeAgent(agent, text) {
    if (!agent || !text.trim())
        return false;
    const message = pluginUserMessage(text);
    if (tryCall(() => agent.followup?.(message)))
        return true;
    if (tryCall(() => agent.send?.(message, 'next-turn', true)))
        return true;
    if (tryCall(() => agent.steer?.(message)))
        return true;
    return false;
}
/** Wake now; if the driver is still settling after a command, retry once. */
export function wakeSoon(agent, text) {
    if (wakeAgent(agent, text))
        return true;
    if (!agent)
        return false;
    setTimeout(() => {
        wakeAgent(agent, text);
    }, 0);
    return true;
}
export function liveAgent(ctx, session) {
    const agents = typeof ctx.get === 'function'
        ? ctx.get('agents')
        : undefined;
    if (session.id && typeof agents?.get === 'function') {
        const found = agents.get(session.id);
        if (found)
            return found;
    }
    return undefined;
}
function tryCall(fn) {
    try {
        fn();
        return true;
    }
    catch {
        return false;
    }
}
