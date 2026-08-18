import { cleanManuscript, countCjk, formatExportDate } from 'infinite-core';
export function polishPrompt(title, world, protagonist, source) {
    const dated = formatExportDate();
    return [
        `【重誊成书】这一回合只输出完整 Markdown 书稿。`,
        `禁止调用任何工具，包括 bash、runshell、date、读文件。日期已经写好，照抄即可。`,
        `不要【歧路】，不要构思，不要英文，不要解释，不要 tool_calls。第一个字必须是 #。`,
        `书名《${title}》。诸天万界 · ${world}。天命之人：${protagonist}。`,
        `格式必须是：`,
        `# ${title}`,
        `> 诸天万界 · ${world}`,
        `> 天命之人：${protagonist}`,
        `> 誊录于 ${dated}`,
        ``,
        `---`,
        ``,
        `## 第一章　（从正文抽的短题）`,
        `（润色后的段落）`,
        ``,
        `后面按情节自然分章。按时间顺序重写素材里的故事，补上断裂，不要另起一本无关的书。`,
        ``,
        `【素材】`,
        source.slice(0, 12000),
    ].join('\n');
}
export function isFailedPolish(text) {
    const raw = text.trim();
    if (!raw)
        return true;
    if (/runshell|tool_calls|tool-call|<invoke\s|<\/tool/i.test(raw))
        return true;
    if (/^\s*(?:We need|Need |The user |用户让我)/i.test(raw))
        return true;
    return false;
}
export function finalizeManuscript(raw, title, world, protagonist) {
    if (isFailedPolish(raw))
        return '';
    const body = cleanManuscript(raw);
    if (!body || isFailedPolish(body) || countCjk(body) < 24)
        return '';
    if (/^#\s+\S/m.test(body))
        return `${body.trim()}\n`;
    return [
        `# ${title}`,
        '',
        `> 诸天万界 · ${world}`,
        `> 天命之人：${protagonist}`,
        `> 誊录于 ${formatExportDate()}`,
        '',
        '---',
        '',
        body,
        '',
    ].join('\n');
}
