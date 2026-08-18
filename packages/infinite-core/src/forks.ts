/** Pull up to three concrete actions from a trailing 【歧路】 block. */
export function parseForkOptions(text: string): string[] {
  const at = text.lastIndexOf('【歧路】')
  if (at < 0) return []
  const tail = text.slice(at + '【歧路】'.length)
  const out: string[] = []
  for (const line of tail.split(/\r?\n/)) {
    const row = line.match(/^\s*(?:[1-3][.)、]|[-*])\s+(.+?)\s*$/)
    if (!row) continue
    const label = row[1].replace(/亦可自己写.*$/, '').trim()
    if (label) out.push(label)
    if (out.length >= 3) break
  }
  return out
}
