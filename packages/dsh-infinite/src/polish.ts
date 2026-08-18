import { cleanManuscript } from 'infinite-core'

export function polishPrompt(title: string, world: string, protagonist: string, source: string): string {
  return [
    `【重誊成书】这一回合只输出完整 Markdown 书稿，不要【歧路】，不要构思，不要英文，不要解释。`,
    `书名《${title}》。诸天万界 · ${world}。天命之人：${protagonist}。`,
    `格式必须是：`,
    `# ${title}`,
    `> 诸天万界 · ${world}`,
    `> 天命之人：${protagonist}`,
    `> 誊录于 ${new Date().getFullYear()}年${new Date().getMonth() + 1}月${new Date().getDate()}日`,
    ``,
    `---`,
    ``,
    `## 第一章　（从正文抽的短题）`,
    `（润色后的段落）`,
    ``,
    `后面按情节自然分章。丢掉素材里的英文、提纲、护栏、对自己说话。按时间顺序重写，补上断裂，不要另起一本无关的书。第一个字就是 #。`,
    ``,
    `【素材】`,
    source.slice(0, 12000),
  ].join('\n')
}

export function finalizeManuscript(raw: string, title: string, world: string, protagonist: string): string {
  const body = cleanManuscript(raw)
  if (!body) return ''
  if (/^#\s+\S/m.test(body) && /[\u4e00-\u9fff]{24,}/.test(body)) return `${body.trim()}\n`
  return [
    `# ${title}`,
    '',
    `> 诸天万界 · ${world}`,
    `> 天命之人：${protagonist}`,
    '',
    '---',
    '',
    body,
    '',
  ].join('\n')
}
