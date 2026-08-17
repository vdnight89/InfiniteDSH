import {
  KEEP_DEFAULT_OPENING,
  KEEP_DEFAULT_PROTAGONIST,
  TOPIC_CHOICES,
  bookNameForTemplate,
  defaultProtagonist,
  exportTranscript,
  parseCommandArgs,
  resolveTemplateId,
  templateIdFromLabel,
  topicChoice,
  type TemplateId,
} from 'infinite-core'
import { askUser, pickAnswer } from './ask.js'
import { infiniteRoot, resolveSessionDir, templatesDir } from './paths.js'
import {
  appendStoryBind,
  applyOpening,
  applyProtagonistIdentity,
  hasStory,
  listTemplateCharacters,
  listTemplatePlots,
  loadCharacters,
  loadMeta,
  saveExport,
  saveMeta,
  seedStory,
} from './story-files.js'
import { sessionMessages } from './transcript.js'
import type { AskItem, CommandInvocation, CommandResult, DuckSession, InfiniteContext, PluginConfig } from './types.js'
import { readdirSync } from 'node:fs'

function sessionOf(inv: CommandInvocation) {
  return inv.agent.session
}

function knownTemplates(config: Required<PluginConfig>): string {
  try {
    return readdirSync(templatesDir(config)).join(', ')
  } catch {
    return TOPIC_CHOICES.map((item) => item.label).join(', ')
  }
}

function topicQuestion(): AskItem {
  return {
    id: 'topic',
    header: '开书',
    question: '选一个题材',
    detail: '规则书会按题材拷进本会话目录。也可以在命令里写成 /new 修仙。',
    options: TOPIC_CHOICES.map((item) => ({
      label: item.label,
      description: item.description,
    })),
  }
}

function protagonistQuestion(templateId: TemplateId, config: Required<PluginConfig>): AskItem {
  const fallback = defaultProtagonist(templateId)
  const cards = listTemplateCharacters(config, templateId)
  const seen = new Set<string>([KEEP_DEFAULT_PROTAGONIST, fallback])
  const options = [
    { label: `${KEEP_DEFAULT_PROTAGONIST}（推荐）`, description: fallback },
  ]
  for (const card of cards) {
    if (seen.has(card.title)) continue
    seen.add(card.title)
    options.push({ label: card.title, description: card.content.slice(0, 48) })
  }
  return {
    id: 'protagonist',
    header: '开书',
    question: '选一个主角',
    detail: `选「${KEEP_DEFAULT_PROTAGONIST}」即 ${fallback}。要自己起名，用界面里的 Other。`,
    options,
  }
}

function openingQuestion(templateId: TemplateId, config: Required<PluginConfig>): AskItem | null {
  const plots = listTemplatePlots(config, templateId).slice(0, 24)
  if (plots.length === 0) return null
  return {
    id: 'opening',
    header: '开书',
    question: '选一个开局',
    detail: '开局会写入本会话的开篇种子。也可以选默认。',
    options: [
      { label: `${KEEP_DEFAULT_OPENING}（推荐）`, description: '使用模板自带的开篇。' },
      ...plots.map((plot) => ({
        label: plot.title,
        description: plot.content.slice(0, 56),
      })),
    ],
  }
}

function overwriteQuestion(): AskItem {
  return {
    id: 'overwrite',
    header: '开书',
    question: '这个会话里已经有一本故事，要覆盖重开吗？',
    options: [
      { label: '覆盖重开', description: '删掉本会话目录里的旧设定，按新选题重拷。' },
      { label: '取消', description: '保留现有故事。' },
    ],
  }
}

function applyProtagonist(root: string, templateId: TemplateId, chosen: string): string {
  const name = !chosen || chosen === KEEP_DEFAULT_PROTAGONIST
    ? defaultProtagonist(templateId)
    : chosen
  const meta = loadMeta(root)
  if (meta) saveMeta(root, { ...meta, protagonist: name })
  return applyProtagonistIdentity(root, name)
}

function openedText(templateId: TemplateId, protagonist: string): string {
  return [
    `已开《${bookNameForTemplate(templateId)}》。`,
    `主角：${protagonist}。`,
    '会话请切到 Infinite Play。输入第一个行动即可开写。',
  ].join('')
}

function bindSnapshot(root: string, session: DuckSession): void {
  const meta = loadMeta(root)
  if (!meta) return
  appendStoryBind(session, {
    templateId: meta.templateId,
    protagonist: meta.protagonist,
    narrativeGuard: meta.narrativeGuard,
    progressionGuard: meta.progressionGuard,
    randomEvent: meta.randomEvent,
    pendingEventId: meta.pendingEventId,
    pickedEventIds: meta.pickedEventIds,
    dir: 'infinite',
  })
}

async function confirmOverwrite(
  ctx: InfiniteContext,
  inv: CommandInvocation,
  root: string,
  force: boolean,
): Promise<'ok' | 'cancel' | 'need-force'> {
  if (!hasStory(root) || force) return 'ok'
  const answers = await askUser(ctx, inv, [overwriteQuestion()])
  if (!answers) return 'need-force'
  return pickAnswer(answers, 'overwrite') === '覆盖重开' ? 'ok' : 'cancel'
}

export async function handleNew(
  ctx: InfiniteContext,
  config: Required<PluginConfig>,
  inv: CommandInvocation,
): Promise<CommandResult> {
  const { topic, force, rest } = parseCommandArgs(inv.rawInput)
  const namedProtagonist = rest.slice(1).join(' ').trim()
  const root = infiniteRoot(resolveSessionDir(ctx, sessionOf(inv), config))

  const overwrite = await confirmOverwrite(ctx, inv, root, force)
  if (overwrite === 'cancel') return { kind: 'success', text: '已取消，仍使用当前故事。' }
  if (overwrite === 'need-force') {
    return { kind: 'error', text: 'this session already has a story; pass force to replace it' }
  }

  let templateId: TemplateId | null = topic ? resolveTemplateId(topic) : null
  if (topic && !templateId) {
    return { kind: 'error', text: `unknown topic "${topic}". try: ${knownTemplates(config)}` }
  }
  if (!templateId) {
    const answers = await askUser(ctx, inv, [topicQuestion()])
    if (!answers) {
      return {
        kind: 'error',
        text: `选择题材：/new ${TOPIC_CHOICES.map((item) => item.label).join(' | ')}`,
      }
    }
    templateId = templateIdFromLabel(pickAnswer(answers, 'topic'))
    if (!templateId) return { kind: 'error', text: '未选择题材。' }
  }

  let protagonist = namedProtagonist
  if (!protagonist) {
    const answers = await askUser(ctx, inv, [protagonistQuestion(templateId, config)])
    if (answers) protagonist = pickAnswer(answers, 'protagonist')
  }

  let opening = ''
  const openingAsk = openingQuestion(templateId, config)
  if (openingAsk) {
    const answers = await askUser(ctx, inv, [openingAsk])
    if (answers) opening = pickAnswer(answers, 'opening')
  }

  try {
    seedStory(root, templateId, config, true)
    const name = applyProtagonist(root, templateId, protagonist)
    if (opening && opening !== KEEP_DEFAULT_OPENING) {
      const plot = listTemplatePlots(config, templateId).find((item) => item.title === opening)
      if (plot) applyOpening(root, plot)
    }
    bindSnapshot(root, sessionOf(inv))
    return { kind: 'success', text: openedText(templateId, name) }
  } catch (error) {
    return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
  }
}

export async function handleBind(
  ctx: InfiniteContext,
  config: Required<PluginConfig>,
  inv: CommandInvocation,
): Promise<CommandResult> {
  const { topic, force } = parseCommandArgs(inv.rawInput)
  const root = infiniteRoot(resolveSessionDir(ctx, sessionOf(inv), config))

  if (!topic) {
    const meta = loadMeta(root)
    const answers = await askUser(ctx, inv, [{
      ...topicQuestion(),
      id: 'bind',
      question: '换一本规则书？',
      detail: meta
        ? `当前是「${topicChoice(meta.templateId as TemplateId).label}」。更换会覆盖本会话设定。`
        : '这个会话还没有故事，选一本即开书。',
    }])
    if (!answers) {
      if (!meta) return { kind: 'error', text: 'no story in this session. use /new [topic] first.' }
      return {
        kind: 'success',
        text: `bound template ${meta.templateId}; protagonist ${meta.protagonist || '(none)'}.`,
      }
    }
    const picked = templateIdFromLabel(pickAnswer(answers, 'bind'))
    if (!picked) return { kind: 'error', text: '未选择规则书。' }
    const overwrite = await confirmOverwrite(ctx, inv, root, force)
    if (overwrite === 'cancel') return { kind: 'success', text: '已取消，仍使用当前故事。' }
    if (overwrite === 'need-force') {
      return { kind: 'error', text: 'this session already has a story; pass force to replace it' }
    }
    try {
      const next = seedStory(root, picked, config, true)
      bindSnapshot(root, sessionOf(inv))
      return { kind: 'success', text: `已绑定「${bookNameForTemplate(next.templateId as TemplateId)}」。` }
    } catch (error) {
      return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
    }
  }

  const templateId = resolveTemplateId(topic)
  if (!templateId) return { kind: 'error', text: `unknown topic "${topic}". try: ${knownTemplates(config)}` }
  const overwrite = await confirmOverwrite(ctx, inv, root, force)
  if (overwrite === 'cancel') return { kind: 'success', text: '已取消，仍使用当前故事。' }
  if (overwrite === 'need-force') {
    return { kind: 'error', text: 'this session already has a story; pass force to replace it' }
  }
  try {
    const meta = seedStory(root, templateId, config, true)
    bindSnapshot(root, sessionOf(inv))
    return { kind: 'success', text: `rebound this session to ${bookNameForTemplate(templateId)} (${meta.templateId}).` }
  } catch (error) {
    return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
  }
}

export async function handleCast(
  ctx: InfiniteContext,
  config: Required<PluginConfig>,
  inv: CommandInvocation,
): Promise<CommandResult> {
  let name = inv.rawInput.trim()
  const root = infiniteRoot(resolveSessionDir(ctx, sessionOf(inv), config))
  const meta = loadMeta(root)
  if (!meta) return { kind: 'error', text: 'no story in this session. use /new [topic] first.' }
  if (!name) {
    const answers = await askUser(ctx, inv, [protagonistQuestion(meta.templateId as TemplateId, config)])
    if (!answers) return { kind: 'error', text: 'usage: /cast <protagonist name>' }
    name = pickAnswer(answers, 'protagonist')
    if (!name) return { kind: 'error', text: '未选择主角。' }
  }
  const applied = applyProtagonist(root, meta.templateId as TemplateId, name)
  bindSnapshot(root, sessionOf(inv))
  const cards = loadCharacters(root)
  return { kind: 'success', text: `protagonist is now ${applied} (${cards.length} character file(s)).` }
}

export function handleExport(
  ctx: InfiniteContext,
  config: Required<PluginConfig>,
  inv: CommandInvocation,
): CommandResult {
  const includePlayer = /\bplayer\b/i.test(inv.rawInput)
  const root = infiniteRoot(resolveSessionDir(ctx, sessionOf(inv), config))
  const meta = loadMeta(root)
  if (!meta) return { kind: 'error', text: 'no story in this session. use /new [topic] first.' }
  const title = bookNameForTemplate(meta.templateId)
  const text = exportTranscript(title, meta.protagonist, sessionMessages(sessionOf(inv)), includePlayer)
  const path = saveExport(root, text)
  return { kind: 'success', text: `wrote ${text.length} chars to ${path}` }
}

const COMMANDS = [
  {
    name: 'new',
    description: '开一本故事：弹出选题材/主角，或 /new 修仙 [主角] [force]',
    input: { hint: '修仙 | 末世 | 都市异能 | 现代  [主角]  [force]' },
    handler: handleNew,
  },
  {
    name: 'bind',
    description: '查看或选择更换本会话规则书',
    input: { hint: '[题材] [force]' },
    handler: handleBind,
  },
  {
    name: 'cast',
    description: '选择或输入主角名',
    input: { hint: '[名字]' },
    handler: handleCast,
  },
  {
    name: 'export-story',
    description: '把洗净正文写到本会话 export.txt（不占用 DSH Web 的 /export）',
    input: { hint: '[player]' },
    handler: handleExport,
  },
] as const

export function registerCommands(ctx: InfiniteContext, config: Required<PluginConfig>): void {
  for (const command of COMMANDS) {
    ctx.effect(() => ctx.commands.register({
      name: command.name,
      description: command.description,
      input: command.input,
      handler: (inv) => command.handler(ctx, config, inv),
    }), `infinite.cmd.${command.name}`)
  }
}
