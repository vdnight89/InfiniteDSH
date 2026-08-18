/** Two or three manuscript titles from world, hero, and opening prose. */
export function suggestExportTitles(world, protagonist, prose) {
    const titles = [];
    const pair = [world, protagonist].filter(Boolean).join('·');
    if (pair)
        titles.push(pair);
    const quote = prose.match(/[“"]([^”"]{2,16})[”"]/);
    pushUnique(titles, clipTitle(quote?.[1] ?? ''));
    const sentence = prose.split(/[。！？\n]/).map((part) => part.trim()).find((part) => part.length >= 6) ?? '';
    pushUnique(titles, clipTitle(sentence.replace(/^[“"]|[”"]$/g, '')));
    return titles.slice(0, 3);
}
/** Windows-safe file stem plus .txt. */
export function safeBookFileName(title) {
    const cleaned = title.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${cleaned || '诸天万界书稿'}.md`;
}
function clipTitle(raw) {
    const cut = raw.replace(/[。！？…]+$/g, '').trim();
    if (cut.length < 4)
        return '';
    return cut.slice(0, 16);
}
function pushUnique(titles, next) {
    if (next && !titles.includes(next))
        titles.push(next);
}
