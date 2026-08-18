import { cleanProse } from 'infinite-core';
function blocksToText(value) {
    if (typeof value === 'string')
        return value;
    if (!Array.isArray(value))
        return '';
    const parts = [];
    for (const block of value) {
        if (!block || typeof block !== 'object')
            continue;
        const rec = block;
        if (typeof rec.text === 'string')
            parts.push(rec.text);
    }
    return parts.join('');
}
function messageText(message) {
    if (!message || typeof message !== 'object')
        return '';
    const rec = message;
    if (typeof rec.text === 'string')
        return rec.text;
    return blocksToText(rec.content);
}
function eventToMessage(event) {
    if (event.type === 'user/message') {
        const text = messageText(event.data?.message ?? event.data);
        return { role: 'user', text };
    }
    if (event.type === 'assistant/message') {
        const text = messageText(event.data?.message ?? event.data);
        return { role: 'assistant', text };
    }
    return null;
}
/** Project a session log (or deriveMessages fallback) into role/text pairs. */
export function sessionMessages(session) {
    if (Array.isArray(session.events) && session.events.length > 0) {
        const out = [];
        for (const event of session.events) {
            const msg = eventToMessage(event);
            if (msg && msg.text.trim())
                out.push(msg);
        }
        return out;
    }
    const derived = session.deriveMessages?.() ?? [];
    const out = [];
    for (const item of derived) {
        if (!item || typeof item !== 'object')
            continue;
        const rec = item;
        const role = rec.role;
        if (role !== 'user' && role !== 'assistant' && role !== 'system')
            continue;
        const text = blocksToText(rec.content);
        if (text.trim())
            out.push({ role, text });
    }
    return out;
}
export function recentText(session, last = 4) {
    const msgs = sessionMessages(session).filter((m) => m.role !== 'system');
    return msgs
        .slice(-last)
        .map((m) => (m.role === 'assistant' ? cleanProse(m.text) : m.text))
        .join('\n');
}
export function hasAssistantProse(session) {
    return sessionMessages(session).some((m) => m.role === 'assistant' && cleanProse(m.text).length > 0);
}
export function lastAssistantRaw(session) {
    const msgs = sessionMessages(session);
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
        if (msgs[i]?.role === 'assistant')
            return msgs[i].text;
    }
    return '';
}
export function summaryFromCompaction(data) {
    if (!data)
        return '';
    if (typeof data.summary === 'string')
        return data.summary;
    return blocksToText(data.summary);
}
