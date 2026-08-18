import { TEMPLATE_CATALOG } from './catalog.generated.js'

const CHARACTER_COVERS: Record<string, string> = {
  阿澜: 'alan.jpg',
  鲸鱼娘: 'whale-girl.jpg',
  小鲸: 'whale-girl.jpg',
  梁组: 'liang.jpg',
  梁圣: 'liang.jpg',
  牢梁: 'liang.jpg',
  梁子: 'liang.jpg',
  谢无妄: 'cultivation.jpg',
  陆沉舟: 'modern.jpg',
  顾晚棠: 'scifi.jpg',
  周慎: 'apocalypse.jpg',
  裴晏清: 'entertainment.jpg',
  沈昭宁: 'palace.jpg',
  白蘅: 'folklore.jpg',
  林晏: 'campus.jpg',
}

/** Map a selectable label to a cover filename in the covers directory. */
export function coverFileForLabel(label: string): string | undefined {
  const trimmed = label.replace(/\s*(?:\((?:recommended|推荐)\)|（(?:recommended|推荐)）)\s*$/i, '').trim()
  if (CHARACTER_COVERS[trimmed]) return CHARACTER_COVERS[trimmed]
  const lower = trimmed.toLowerCase()
  for (const item of TEMPLATE_CATALOG) {
    if (item.label === trimmed || item.id === lower) return `${item.id}.jpg`
    if (item.aliases.some((alias) => alias === trimmed || alias.toLowerCase() === lower)) {
      return `${item.id}.jpg`
    }
  }
  return undefined
}

/** Label → cover filename for the Web card picker. */
export function buildCoverManifest(): Record<string, string> {
  const out: Record<string, string> = { ...CHARACTER_COVERS }
  for (const item of TEMPLATE_CATALOG) {
    out[item.label] = `${item.id}.jpg`
    out[item.id] = `${item.id}.jpg`
    for (const alias of item.aliases) out[alias] = `${item.id}.jpg`
  }
  return out
}
