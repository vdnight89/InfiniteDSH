import { createRequire } from 'node:module'
import { statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DuckSession, InfiniteContext, PluginConfig } from './types.js'

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

function firstExisting(candidates: readonly string[]): string {
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isDirectory()) return candidate
    } catch {
      // try the next location
    }
  }
  return candidates[candidates.length - 1] ?? ''
}

function presetPackageRoot(): string | null {
  try {
    return dirname(require.resolve('dsh-infinite-preset/package.json'))
  } catch {
    return null
  }
}

export function defaultTemplatesDir(): string {
  const pkg = presetPackageRoot()
  return firstExisting([
    ...(pkg ? [join(pkg, 'templates')] : []),
    join(PLUGIN_ROOT, 'templates'),
    join(PLUGIN_ROOT, '..', 'dsh-infinite-preset', 'templates'),
  ])
}

export function defaultPresetDir(): string {
  const pkg = presetPackageRoot()
  return firstExisting([
    ...(pkg ? [join(pkg, 'infinite-play')] : []),
    join(PLUGIN_ROOT, 'preset', 'infinite-play'),
    join(PLUGIN_ROOT, '..', 'dsh-infinite-preset', 'infinite-play'),
  ])
}

export function resolveDshHome(config: Required<PluginConfig>): string {
  if (config.dshHome) return config.dshHome
  if (process.env.DSH_HOME) return process.env.DSH_HOME
  return join(homedir(), '.dsh')
}

export function fallbackStoriesRoot(config: Required<PluginConfig>): string {
  if (config.dataDir) return config.dataDir
  return join(resolveDshHome(config), 'infinite', 'stories')
}

export function safeSessionId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'session'
}

/** Directory that owns this session's artifacts. */
export function resolveSessionDir(
  ctx: InfiniteContext,
  session: DuckSession,
  config: Required<PluginConfig>,
): string {
  try {
    const located = ctx.sessionPersistence?.locate?.(session.header ?? { id: session.id })
    if (located?.path) return dirname(located.path)
  } catch {
    // SQLite and missing backends have no per-session path.
  }
  return join(fallbackStoriesRoot(config), safeSessionId(session.id))
}

export function infiniteRoot(sessionDir: string): string {
  return join(sessionDir, 'infinite')
}

export function templatesDir(config: Required<PluginConfig>): string {
  return config.templatesDir || defaultTemplatesDir()
}

export function userPresetTarget(config: Required<PluginConfig>): string {
  return join(resolveDshHome(config), '.agent-presets', 'infinite-play')
}
