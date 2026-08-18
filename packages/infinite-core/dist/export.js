const META_LINE = /^\s*【(?:章节名|场景信息|对话推荐|开局|世界规则|叙事护栏|剧情推进|输出要求|随机世界事件|角色|当前场景|歧路)】.*$/;
const BODY_TAG = /【正文】/g;
const FENCE_BLOCK = /```[\s\S]*?```/g;
const FORK_BLOCK = /【歧路】[\s\S]*$/;
/** Drop template labels and author notes from one assistant blob. */
export function cleanProse(text) {
    const withoutFences = text.replace(FENCE_BLOCK, '');
    const withoutFork = withoutFences.replace(FORK_BLOCK, '');
    const withoutMeta = withoutFork
        .split(/\r?\n/)
        .filter((line) => !META_LINE.test(line) && !/^(?:亦可自己写一条)/.test(line.trim()))
        .join('\n')
        .replace(BODY_TAG, '');
    return withoutMeta
        .replace(/^\s*#{1,6}\s+.*$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
const PLANNING_MARKERS = [
    /We need answer/i,
    /Need obey/i,
    /output story body/i,
    /fiction narrative/i,
    /用户让我写/,
    /需要遵守叙事护栏/,
    /我要推进剧情/,
    /让我构思/,
    /我写正文/,
    /当前场景：/,
    /已出场角色：/,
    /剧情要素：/,
    /不要输出章节名/,
    /同时活跃的主要角色/,
];
/** True when the blob is a writing plan or instruction echo, not fiction. */
export function isPlanningDump(text) {
    const t = text.trim();
    if (!t)
        return false;
    if (/^(?:We need|Need obey|用户让我|我要推进|让我构思|我写正文)/i.test(t))
        return true;
    let hits = 0;
    for (const marker of PLANNING_MARKERS) {
        if (marker.test(t))
            hits += 1;
        if (hits >= 2)
            return true;
    }
    return false;
}
/** Keep only the story; drop planning dumps and instruction echoes. */
export function extractStoryBody(text) {
    const cleaned = cleanProse(text);
    if (!cleaned)
        return '';
    if (!isPlanningDump(cleaned))
        return cleaned;
    const split = cleaned.split(/(?:^|\n)我写正文[^\n]*/).pop() ?? '';
    const maybe = cleanProse(split);
    if (maybe && maybe !== cleaned && !isPlanningDump(maybe) && maybe.length > 40)
        return maybe;
    return '';
}
export function isOpeningInstruction(text) {
    const t = text.trim();
    return t.startsWith('【开局】') || t.startsWith('[开局]') || t === '启程。' || t === '启程';
}
/**
 * Build a typeset Markdown manuscript from one session transcript.
 * @param includePlayer - when true, keep player actions as italic bridges
 */
export function exportTranscript(title, protagonist, messages, includePlayer, world = '') {
    const chapters = [];
    let bridges = [];
    for (const message of messages) {
        if (message.role === 'system')
            continue;
        if (isOpeningInstruction(message.text))
            continue;
        if (message.role === 'user') {
            const body = message.text.trim();
            if (includePlayer && body && !isOpeningInstruction(body))
                bridges.push(body);
            continue;
        }
        const body = extractStoryBody(message.text);
        if (!body)
            continue;
        chapters.push({
            heading: chapterHeading(chapters.length + 1, body),
            body,
            bridges,
        });
        bridges = [];
    }
    const lines = [`# ${title}`, ''];
    const series = world ? `诸天万界 · ${world}` : '诸天万界';
    lines.push(`> ${series}`);
    if (protagonist)
        lines.push(`> 天命之人：${protagonist}`);
    lines.push(`> 誊录于 ${formatExportDate(new Date())}`, '', '---', '');
    for (const chapter of chapters) {
        for (const action of chapter.bridges) {
            lines.push(`*你：${action}*`, '');
        }
        lines.push(`## ${chapter.heading}`, '', chapter.body, '');
    }
    if (bridges.length > 0 && includePlayer) {
        for (const action of bridges)
            lines.push(`*你：${action}*`, '');
    }
    if (chapters.length === 0) {
        lines.push('（此稿尚无可以誊录的正文。模型若把构思写出来了，那些字不会进书。）', '');
    }
    return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
export function chapterHeading(index, body) {
    const name = clipChapterTitle(body);
    return name ? `第${chineseChapter(index)}章　${name}` : `第${chineseChapter(index)}章`;
}
export function chineseChapter(index) {
    if (index <= 0)
        return String(index);
    if (index < 10)
        return '一二三四五六七八九'[index - 1] ?? String(index);
    if (index === 10)
        return '十';
    if (index < 20)
        return `十${'一二三四五六七八九'[index - 11]}`;
    if (index < 100) {
        const tens = Math.floor(index / 10);
        const ones = index % 10;
        const head = `${'一二三四五六七八九'[tens - 1]}十`;
        return ones === 0 ? head : `${head}${'一二三四五六七八九'[ones - 1]}`;
    }
    return String(index);
}
function clipChapterTitle(body) {
    const sentence = body.split(/[。！？\n]/).map((part) => part.trim()).find((part) => part.length >= 2) ?? '';
    const cut = sentence.replace(/^[“"]|[”"]$/g, '').replace(/[，、；：].*$/, '').trim();
    if (cut.length < 2)
        return '';
    return cut.slice(0, 12);
}
function formatExportDate(at) {
    return `${at.getFullYear()}年${at.getMonth() + 1}月${at.getDate()}日`;
}
export function formatArchive(summary, at, previous = '') {
    const body = summary.trim();
    const prior = previous.trim();
    if (!body)
        return prior;
    const section = `## ${at}\n\n${body}\n`;
    if (!prior)
        return `# 剧情档案\n\n${section}`;
    return `${prior}\n\n${section}`;
}
