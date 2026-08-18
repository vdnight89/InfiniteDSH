import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { defaultPresetDir, userPresetTarget } from './paths.js'
import type { PluginConfig } from './types.js'

function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    const src = join(from, name)
    const dest = join(to, name)
    if (statSync(src).isDirectory()) copyTree(src, dest)
    else writeFileSync(dest, readFileSync(src))
  }
}

/** Copy infinite-play once. Refresh official name/persona if dest is still Infinite Play or 诸天万界. */
export function installUserPreset(config: Required<PluginConfig>): string | null {
  const src = defaultPresetDir()
  try {
    if (!statSync(src).isDirectory()) return null
  } catch {
    return null
  }
  const dest = userPresetTarget(config)
  try {
    if (statSync(join(dest, 'agent.cordis.yml')).isFile()) {
      let destPreset = ''
      try {
        destPreset = readFileSync(join(dest, 'preset.yml'), 'utf8')
      } catch {
        destPreset = ''
      }
      let destPersona = ''
      try {
        destPersona = readFileSync(join(dest, 'agent.cordis.yml'), 'utf8')
      } catch {
        destPersona = ''
      }
      if (!/诸天万界DSH/.test(destPreset)) {
        writeFileSync(join(dest, 'preset.yml'), readFileSync(join(src, 'preset.yml')))
      }
      if (!/禁止把思考/.test(destPersona)) {
        writeFileSync(join(dest, 'agent.cordis.yml'), readFileSync(join(src, 'agent.cordis.yml')))
      }
      return dest
    }
  } catch {
    // first install
  }
  mkdirSync(dirname(dest), { recursive: true })
  copyTree(src, dest)
  return dest
}
