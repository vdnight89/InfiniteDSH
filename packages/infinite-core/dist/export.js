const META_LINE = /^\s*【(?:章节名|场景信息|对话推荐|开局|世界规则|叙事护栏|剧情推进|输出要求|随机世界事件|角色|当前场景|歧路)】.*$/;
const BODY_TAG = /【正文】/g;
const FENCE_BLOCK = /```[\s\S]*?```/g;
const FORK_MARK = '【歧路】';
/** Drop template labels and author notes from one assistant blob. */
/** Drop only the trailing 歧路 menu, not an earlier mention inside a draft. */
export function stripTrailingFork(text) {
    const at = text.lastIndexOf(FORK_MARK);
    return at < 0 ? text : text.slice(0, at);
}
export function cleanProse(text) {
    const withoutFences = text.replace(FENCE_BLOCK, '');
    const withoutFork = stripTrailingFork(withoutFences);
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
    /The user gave/i,
    /I need to (?:continue|write|be careful)/i,
    /Let's (?:craft|draft|write|final)/i,
    /Need to write/i,
    /Do not write plan/i,
    /Must ensure/i,
    /Option \d:/i,
    /用户让我写/,
    /我们需要回应/,
    /按照要求/,
    /需要遵守叙事护栏/,
    /我要推进剧情/,
    /让我构思/,
    /我写正文/,
    /当前场景：/,
    /已出场角色：/,
    /剧情要素：/,
    /不要输出章节名/,
    /同时活跃的主要角色/,
    /第三人称有限视角/,
];
const PLANNING_LINE = /^(?:The |I |We |Need |Let's |Must |Could |Option |Count |Draft |Do not |Need to )/i;
const PLANNING_CN_LINE = /我们需要回应|按照要求|只写小说正文|第三人称有限|不要输出|我要推进|让我构思|用户让我|已出场角色|当前场景：|剧情要素：|Need to write|I need to|Let's draft|Let's write|Let's final|Must ensure|Do not write plan/;
/** True when a paragraph is a writing plan, not fiction. */
export function isPlanningParagraph(text) {
    const t = text.trim();
    if (!t)
        return true;
    if (PLANNING_LINE.test(t) || PLANNING_CN_LINE.test(t))
        return true;
    for (const marker of PLANNING_MARKERS) {
        if (marker.test(t))
            return true;
    }
    const letters = t.match(/[A-Za-z]/g)?.length ?? 0;
    const cjk = t.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    return letters >= 16 && letters > cjk * 0.35;
}
/** True when the blob is mostly a writing plan or instruction echo. */
export function isPlanningDump(text) {
    const t = text.trim();
    if (!t)
        return false;
    if (/^(?:We need|Need obey|The user |用户让我|我们需要回应|我要推进|让我构思|我写正文)/i.test(t))
        return true;
    const paras = t.split(/\n\s*\n/);
    const plan = paras.filter((p) => isPlanningParagraph(p)).length;
    return plan >= 2 || (paras.length > 0 && plan / paras.length >= 0.5);
}
/** Keep only the story; drop planning dumps and instruction echoes. */
export function extractStoryBody(text) {
    const cleaned = cleanProse(text);
    if (!cleaned)
        return '';
    const runs = [];
    let current = [];
    for (const para of splitUnits(cleaned)) {
        if (isPlanningParagraph(para)) {
            if (current.length > 0) {
                runs.push(current);
                current = [];
            }
            continue;
        }
        current.push(para);
    }
    if (current.length > 0)
        runs.push(current);
    for (let i = runs.length - 1; i >= 0; i -= 1) {
        const body = runs[i].join('\n\n').trim();
        const cjk = body.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
        if (cjk >= 24 && !isPlanningDump(body))
            return body;
    }
    if (isPlanningDump(cleaned))
        return '';
    return cleaned;
}
/** Strip 歧路 and planning, but keep Markdown headings for a polished book. */
export function cleanManuscript(text) {
    const withoutFork = stripTrailingFork(text.replace(FENCE_BLOCK, ''));
    const kept = withoutFork
        .split(/\n\s*\n/)
        .filter((para) => !isPlanningParagraph(para) && !/^(?:亦可自己写一条)/.test(para.trim()))
        .join('\n\n')
        .replace(BODY_TAG, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return isPlanningDump(kept) ? '' : kept;
}
function splitUnits(text) {
    const chunks = [];
    for (const para of text.split(/\n\s*\n/)) {
        if (para.includes('\n') && (isPlanningParagraph(para) || /[A-Za-z]{16,}/.test(para))) {
            for (const line of para.split(/\n+/)) {
                if (line.trim())
                    chunks.push(line.trim());
            }
        }
        else if (para.trim()) {
            chunks.push(para);
        }
    }
    return chunks;
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
export function countCjk(text) {
    return text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
}
export function manuscriptHasBody(text) {
    return /##\s*第/.test(text) && countCjk(text) >= 24 && !text.includes('此稿尚无可以誊录');
}
/** Bind already-extracted prose into the same typeset Markdown shell. */
export function bindManuscript(title, protagonist, world, source) {
    const body = extractStoryBody(source) || source.trim();
    if (countCjk(body) < 24)
        return '';
    return [
        `# ${title}`,
        '',
        `> ${world ? `诸天万界 · ${world}` : '诸天万界'}`,
        ...(protagonist ? [`> 天命之人：${protagonist}`] : []),
        `> 誊录于 ${formatExportDate(new Date())}`,
        '',
        '---',
        '',
        `## ${chapterHeading(1, body)}`,
        '',
        body,
        '',
    ].join('\n');
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
export function formatExportDate(at = new Date()) {
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
