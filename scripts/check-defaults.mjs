import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const cat = readFileSync('packages/infinite-core/src/catalog.generated.ts', 'utf8')
const names = [...cat.matchAll(/"id": "(\w+)"[\s\S]*?"defaultProtagonist": "([^"]+)"/g)].map((m) => ({
  id: m[1],
  p: m[2],
}))
for (const { id, p } of names) {
  const dir = join('packages/dsh-infinite-preset/templates', id, 'characters')
  let hit = false
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const t = readFileSync(join(dir, f), 'utf8')
      if (t.includes(`title: ${p}`)) hit = true
    }
  }
  console.log(id, p, hit ? 'ok' : 'MISSING')
}
