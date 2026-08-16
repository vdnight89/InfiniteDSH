import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  defaultMeta,
  defaultProtagonist,
  formatStoryMeta,
  parseLoreEntry,
  parseStoryMeta,
  type LoreEntry,
  type StoryMeta,
  type TemplateId,
} from 'infinite-core'
import { templatesDir } from './paths.js'
import type { PluginConfig } from './types.js'

export const META_FILE = 'meta.yml'
export const WORLD_DIR = 'worldbook'
export const CHAR_DIR = 'characters'
export const PLOT_DIR = 'plots'
export const ARCHIVE_FILE = 'archive.md'
export const EXPORT_FILE = 'export.txt'

export function metaPath(root: string): string {
  return join(root, META_FILE)
}

export function hasStory(root: string): boolean {
  try {
    return statSync(metaPath(root)).isFile()
  } catch {
    return false
  }
}

export function loadMeta(root: string): StoryMeta | null {
  if (!hasStory(root)) return null
  return parseStoryMeta(readFileSync(metaPath(root), 'utf8'))
}

export function saveMeta(root: string, meta: StoryMeta): void {
  mkdirSync(root, { recursive: true })
  writeFileSync(metaPath(root), formatStoryMeta(meta), 'utf8')
}

function readMarkdownEntries(dir: string): LoreEntry[] {
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return []
  }
  const entries: LoreEntry[] = []
  for (const name of names) {
    if (!name.endsWith('.md')) continue
    const full = join(dir, name)
    try {
      if (!statSync(full).isFile()) continue
      entries.push(parseLoreEntry(readFileSync(full, 'utf8'), name.replace(/\.md$/i, '')))
    } catch {
      // skip unreadable files
    }
  }
  return entries
}

export function loadWorldbook(root: string): LoreEntry[] {
  return [...readMarkdownEntries(join(root, WORLD_DIR)), ...readMarkdownEntries(join(root, PLOT_DIR))]
}

export function loadCharacters(root: string): LoreEntry[] {
  return readMarkdownEntries(join(root, CHAR_DIR))
}

export function loadPlots(root: string): LoreEntry[] {
  return readMarkdownEntries(join(root, PLOT_DIR))
}

export function listTemplatePlots(config: Required<PluginConfig>, templateId: TemplateId): LoreEntry[] {
  return loadPlots(templatePath(config, templateId))
}

export function listTemplateCharacters(config: Required<PluginConfig>, templateId: TemplateId): LoreEntry[] {
  return loadCharacters(templatePath(config, templateId))
}

export function applyOpening(root: string, plot: LoreEntry): void {
  mkdirSync(join(root, WORLD_DIR), { recursive: true })
  writeFileSync(
    join(root, WORLD_DIR, 'opening.md'),
    [
      '---',
      'id: opening',
      `title: ${plot.title}`,
      'category: 开篇',
      'constant: true',
      'keys: [开篇]',
      'order: 1',
      '---',
      plot.content,
      '',
    ].join('\n'),
    'utf8',
  )
}

export function loadArchive(root: string): string {
  try {
    return readFileSync(join(root, ARCHIVE_FILE), 'utf8')
  } catch {
    return ''
  }
}

export function saveArchive(root: string, text: string): void {
  if (!text) return
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, ARCHIVE_FILE), text, 'utf8')
}

export function saveExport(root: string, text: string): string {
  mkdirSync(root, { recursive: true })
  const path = join(root, EXPORT_FILE)
  writeFileSync(path, text, 'utf8')
  return path
}

function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    const src = join(from, name)
    const dest = join(to, name)
    if (statSync(src).isDirectory()) copyTree(src, dest)
    else writeFileSync(dest, readFileSync(src))
  }
}

export function templatePath(config: Required<PluginConfig>, templateId: TemplateId): string {
  return join(templatesDir(config), templateId)
}

export function seedStory(
  root: string,
  templateId: TemplateId,
  config: Required<PluginConfig>,
  force: boolean,
): StoryMeta {
  const src = templatePath(config, templateId)
  try {
    if (!statSync(src).isDirectory()) throw new Error(`template missing: ${templateId}`)
  } catch {
    throw new Error(`unknown or missing template "${templateId}" at ${src}`)
  }
  if (hasStory(root) && !force) {
    throw new Error('this session already has a story; pass force to replace it')
  }
  if (force && hasStory(root)) rmSync(root, { recursive: true, force: true })
  copyTree(src, root)
  const seeded = loadMeta(root)
  const meta = {
    ...(seeded ?? defaultMeta(templateId, defaultProtagonist(templateId))),
    templateId,
    protagonist: seeded?.protagonist || defaultProtagonist(templateId),
    pickedEventIds: [],
    pendingEventId: null,
    createdAt: new Date().toISOString(),
  }
  saveMeta(root, meta)
  return meta
}

export function writeProtagonistCard(root: string, name: string): void {
  mkdirSync(join(root, CHAR_DIR), { recursive: true })
  const path = join(root, CHAR_DIR, 'protagonist.md')
  writeFileSync(
    path,
    [
      '---',
      'id: protagonist',
      `title: ${name}`,
      'category: 角色',
      'constant: true',
      `keys: [${name}, 主角]`,
      'order: 0',
      '---',
      `${name}是本故事的主角，由用户扮演。叙述以他（她）的感知为锚点。`,
      '',
    ].join('\n'),
    'utf8',
  )
}
