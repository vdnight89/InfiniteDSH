import { TEMPLATE_CATALOG } from './catalog.generated.js';
export const TEMPLATE_IDS = TEMPLATE_CATALOG.map((item) => item.id);
export const TOPIC_CHOICES = TEMPLATE_CATALOG.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description,
}));
export function topicChoice(id) {
    return TOPIC_CHOICES.find((item) => item.id === id) ?? TOPIC_CHOICES[0];
}
export function catalogEntry(id) {
    return TEMPLATE_CATALOG.find((item) => item.id === id);
}
export function bookNameForTemplate(templateId) {
    return catalogEntry(templateId)?.label || templateId;
}
export function isKeepDefaultChoice(chosen, keep) {
    const t = chosen.replace(/\s*(?:\((?:recommended|推荐)\)|（(?:recommended|推荐)）)\s*$/i, '').trim();
    return !t || t === keep || t.startsWith(keep);
}
/** Resolve a user topic token to a shipped template id. Empty → null (caller should ask). */
export function resolveTemplateId(raw) {
    const key = (raw ?? '').trim();
    if (!key)
        return null;
    const lower = key.toLowerCase();
    for (const item of TEMPLATE_CATALOG) {
        if (item.id === lower || item.label === key)
            return item.id;
        if (item.aliases.some((alias) => alias === key || alias.toLowerCase() === lower))
            return item.id;
    }
    return null;
}
export function templateIdFromLabel(label) {
    return resolveTemplateId(label);
}
export function defaultProtagonist(templateId) {
    return catalogEntry(templateId)?.defaultProtagonist || '陆沉舟';
}
export function parseCommandArgs(rawInput) {
    const tokens = rawInput.trim().split(/\s+/).filter(Boolean);
    const force = tokens.some((t) => t.toLowerCase() === 'force');
    const rest = tokens.filter((t) => t.toLowerCase() !== 'force');
    return { topic: rest[0] ?? '', force, rest };
}
export const KEEP_DEFAULT_PROTAGONIST = '以此界默认之身';
export const KEEP_DEFAULT_OPENING = '走此界默认开局';
