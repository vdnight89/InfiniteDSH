import { cleanProse, extractStoryBody } from 'infinite-core';
function isNarrativeBlock(block) {
    if (typeof block.text !== 'string' || !block.text)
        return false;
    if (!block.type || block.type === 'text')
        return true;
    return false;
}
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
        if (isNarrativeBlock(rec))
            parts.push(rec.text);
    }
    return parts.join('\n\n');
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
function fromDeriveMessages(session) {
    let derived = [];
    try {
        derived = session.deriveMessages?.() ?? [];
    }
    catch {
        derived = [];
    }
    const out = [];
    for (const item of derived) {
        if (!item || typeof item !== 'object')
            continue;
        const rec = item;
        const role = rec.role;
        if (role !== 'user' && role !== 'assistant' && role !== 'system')
            continue;
        const text = typeof rec.text === 'string' ? rec.text : blocksToText(rec.content);
        if (text.trim())
            out.push({ role, text });
    }
    return out;
}
function fromEvents(session) {
    if (!Array.isArray(session.events))
        return [];
    const out = [];
    for (const event of session.events) {
        const msg = eventToMessage(event);
        if (msg && msg.text.trim())
            out.push(msg);
    }
    return out;
}
/** Prefer the live transcript projection; fall back to walking the event log. */
export function sessionMessages(session) {
    const derived = fromDeriveMessages(session);
    if (derived.some((item) => item.role === 'assistant' && item.text.trim()))
        return derived;
    const events = fromEvents(session);
    return events.length > 0 ? events : derived;
}
/** Story-only source for polish/export. Harvests Chinese narrative if filters are too strict. */
export function collectExportSource(session) {
    const messages = sessionMessages(session);
    const extracted = messages
        .filter((message) => message.role === 'assistant')
        .map((message) => extractStoryBody(message.text))
        .filter((text) => text.trim().length > 0);
    if (extracted.length > 0)
        return extracted.join('\n\n');
    const harvested = messages
        .filter((message) => message.role === 'assistant')
        .map((message) => harvestFictionLines(message.text))
        .filter((text) => text.trim().length > 0);
    return harvested.join('\n\n');
}
function harvestFictionLines(text) {
    const cleaned = cleanProse(text);
    if (!cleaned)
        return '';
    const kept = [];
    for (const line of cleaned.split(/\n+/)) {
        const t = line.trim();
        if (!t)
            continue;
        const cjk = t.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
        const letters = t.match(/[A-Za-z]/g)?.length ?? 0;
        if (cjk < 8 || letters > cjk)
            continue;
        if (/我们需要回应|按照要求|用户让我|让我构思|我写正文|当前场景：|已出场角色：/.test(t))
            continue;
        kept.push(t);
    }
    return kept.join('\n\n');
}
export function recentText(session, last = 4) {
    const msgs = sessionMessages(session).filter((m) => m.role !== 'system');
    return msgs
        .slice(-last)
        .map((m) => (m.role === 'assistant' ? extractStoryBody(m.text) : m.text))
        .filter((text) => text.trim().length > 0)
        .join('\n');
}
export function hasAssistantProse(session) {
    return sessionMessages(session).some((m) => m.role === 'assistant' && extractStoryBody(m.text).length > 0);
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
