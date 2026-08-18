import {
  KEEP_DEFAULT_OPENING,
  KEEP_DEFAULT_PROTAGONIST,
  TOPIC_CHOICES,
  bookNameForTemplate,
  defaultProtagonist,
  bindManuscript,
  exportTranscript,
  isKeepDefaultChoice,
  manuscriptHasBody,
  safeBookFileName,
  suggestExportTitles,
  parseCommandArgs,
  resolveTemplateId,
  templateIdFromLabel,
  topicChoice,
  type TemplateId,
} from 'infinite-core'
import { askUser, pickAnswer } from './ask.js'
import {
  ASK_HEADER,
  BIND_QUESTION,
  CANCELLED,
  COMMANDS_COPY,
  EMBARK,
  FIRST_STEP_TEXT,
  isEmbarkChoice,
  OPENING_QUESTION,
  OVERWRITE_NO,
  OVERWRITE_QUESTION,
  OVERWRITE_YES,
  PROTAGONIST_QUESTION,
  REPICK_OPENING,
  REPICK_PROTAGONIST,
  TOPIC_DETAIL,
  TITLE_DETAIL,
  TITLE_QUESTION,
  TOPIC_QUESTION,
  boundTo,
  castDone,
  castNeedName,
  defaultBodyHint,
  embarkDetail,
  exportDone,
  exportNoProse,
  exportPolishing,
  needForceText,
  noWorldYet,
  openedEmbarked,
  openedWaiting,
  pickWorldHint,
  sessionTitle,
  unknownWorld,
} from './copy.js'
import { infiniteRoot, resolveSessionDir, templatesDir } from './paths.js'
import {
  applyOpening,
  applyProtagonistIdentity,
  hasStory,
  listTemplateCharacters,
  listTemplatePlots,
  loadCharacters,
  loadMeta,
  saveExport,
  saveMeta,
  saveNamedExport,
  seedStory,
} from './story-files.js'
import { collectExportSource, sessionMessages } from './transcript.js'
import { polishPrompt } from './polish.js'
import { revealFile } from './reveal.js'
import { wakeSoon } from './wake.js'
import type {
  AskItem,
  CommandInvocation,
  CommandResult,
  DuckSession,
  InfiniteContext,
  PluginConfig,
} from './types.js'
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
    header: ASK_HEADER,
    question: TOPIC_QUESTION,
    detail: TOPIC_DETAIL,
    options: TOPIC_CHOICES.map((item) => ({
      label: item.label,
      description: item.description,
    })),
  }
}

function protagonistQuestion(templateId: TemplateId, config: Required<PluginConfig>): AskItem {
  const fallback = defaultProtagonist(templateId)
  const cards = listTemplateCharacters(config, templateId)
  const seen = new Set<string>([KEEP_DEFAULT_PROTAGONIST])
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
    header: ASK_HEADER,
    question: PROTAGONIST_QUESTION,
    detail: defaultBodyHint(fallback),
    options,
  }
}

function openingQuestion(templateId: TemplateId, config: Required<PluginConfig>): AskItem | null {
  const plots = listTemplatePlots(config, templateId).slice(0, 24)
  if (plots.length === 0) return null
  return {
    id: 'opening',
    header: ASK_HEADER,
    question: OPENING_QUESTION,
    detail: '点选一处落足。也可走此界默认开局。',
    options: [
      { label: `${KEEP_DEFAULT_OPENING}（推荐）`, description: '使用此界自带的开篇。' },
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
    header: ASK_HEADER,
    question: OVERWRITE_QUESTION,
    options: [
      { label: OVERWRITE_YES, description: '撕掉本会话旧天书，按新选之界重拷。' },
      { label: OVERWRITE_NO, description: '留在当前这一界。' },
    ],
  }
}

function embarkQuestion(world: string, protagonist: string): AskItem {
  return {
    id: 'embark',
    header: ASK_HEADER,
    question: '界门已开，如何落足？',
    detail: embarkDetail(world, protagonist),
    options: [
      { label: EMBARK, description: '按开篇写下第一段，踏入此界。' },
      { label: REPICK_OPENING, description: '换一个开场，尚未启程。' },
      { label: REPICK_PROTAGONIST, description: '换一个天命之人，尚未启程。' },
    ],
  }
}

function applyProtagonist(root: string, templateId: TemplateId, chosen: string): string {
  const name = isKeepDefaultChoice(chosen, KEEP_DEFAULT_PROTAGONIST)
    ? defaultProtagonist(templateId)
    : chosen
  const meta = loadMeta(root)
  if (meta) saveMeta(root, { ...meta, protagonist: name })
  return applyProtagonistIdentity(root, name)
}

function pinSessionTitle(session: DuckSession, world: string, protagonist: string): void {
  try {
    session.append?.('session/title', {
      title: sessionTitle(world, protagonist),
      messageSeqs: [],
      source: { kind: 'user' },
    })
  } catch {
    // title service may reject unknown writers
  }
}

function wakeEmbark(inv: CommandInvocation): boolean {
  return wakeSoon(inv.agent, FIRST_STEP_TEXT)
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
  return pickAnswer(answers, 'overwrite') === OVERWRITE_YES ? 'ok' : 'cancel'
}

async function afterGate(
  ctx: InfiniteContext,
  config: Required<PluginConfig>,
  inv: CommandInvocation,
  root: string,
  templateId: TemplateId,
  protagonist: string,
): Promise<CommandResult> {
  const world = bookNameForTemplate(templateId)
  pinSessionTitle(sessionOf(inv), world, protagonist)

  const answers = await askUser(ctx, inv, [embarkQuestion(world, protagonist)])
  if (!answers) {
    return { kind: 'success', text: openedWaiting(world, protagonist) }
  }

  const picked = pickAnswer(answers, 'embark')
  if (picked === REPICK_OPENING) {
    const ask = openingQuestion(templateId, config)
    if (ask) {
      const next = await askUser(ctx, inv, [ask])
      const opening = next ? pickAnswer(next, 'opening') : ''
      if (opening && !isKeepDefaultChoice(opening, KEEP_DEFAULT_OPENING)) {
        const plot = listTemplatePlots(config, templateId).find((item) => item.title === opening)
        if (plot) applyOpening(root, plot)
      }
    }
    return afterGate(ctx, config, inv, root, templateId, protagonist)
  }
  if (picked === REPICK_PROTAGONIST) {
    const next = await askUser(ctx, inv, [protagonistQuestion(templateId, config)])
    const name = next ? applyProtagonist(root, templateId, pickAnswer(next, 'protagonist')) : protagonist
    return afterGate(ctx, config, inv, root, templateId, name)
  }
  if (!isEmbarkChoice(picked)) {
    return { kind: 'success', text: openedWaiting(world, protagonist) }
  }

  const woke = wakeEmbark(inv)
  return {
    kind: 'success',
    text: woke ? openedEmbarked(world, protagonist) : openedWaiting(world, protagonist),
  }
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
  if (overwrite === 'cancel') return { kind: 'success', text: CANCELLED }
  if (overwrite === 'need-force') return { kind: 'error', text: needForceText() }

  let templateId: TemplateId | null = topic ? resolveTemplateId(topic) : null
  if (topic && !templateId) {
    return { kind: 'error', text: unknownWorld(`"${topic}". ${knownTemplates(config)}`) }
  }
  if (!templateId) {
    const answers = await askUser(ctx, inv, [topicQuestion()])
    if (!answers) return { kind: 'error', text: pickWorldHint() }
    templateId = templateIdFromLabel(pickAnswer(answers, 'topic'))
    if (!templateId) return { kind: 'error', text: '未选定一界。' }
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
    if (opening && !isKeepDefaultChoice(opening, KEEP_DEFAULT_OPENING)) {
      const plot = listTemplatePlots(config, templateId).find((item) => item.title === opening)
      if (plot) applyOpening(root, plot)
    }
    return afterGate(ctx, config, inv, root, templateId, name)
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
      question: BIND_QUESTION,
      detail: meta
        ? `当前立于「${topicChoice(meta.templateId as TemplateId).label}」。改投会覆盖本会话天书。`
        : '此会话尚无世界，选一界即入。',
    }])
    if (!answers) {
      if (!meta) return { kind: 'error', text: noWorldYet() }
      return {
        kind: 'success',
        text: `现界 ${meta.templateId}；天命之人 ${meta.protagonist || '（未定）'}。`,
      }
    }
    const picked = templateIdFromLabel(pickAnswer(answers, 'bind'))
    if (!picked) return { kind: 'error', text: '未选定一界。' }
    const overwrite = await confirmOverwrite(ctx, inv, root, force)
    if (overwrite === 'cancel') return { kind: 'success', text: CANCELLED }
    if (overwrite === 'need-force') return { kind: 'error', text: needForceText() }
    try {
      const next = seedStory(root, picked, config, true)
      return { kind: 'success', text: boundTo(bookNameForTemplate(next.templateId as TemplateId)) }
    } catch (error) {
      return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
    }
  }

  const templateId = resolveTemplateId(topic)
  if (!templateId) return { kind: 'error', text: unknownWorld(`"${topic}". ${knownTemplates(config)}`) }
  const overwrite = await confirmOverwrite(ctx, inv, root, force)
  if (overwrite === 'cancel') return { kind: 'success', text: CANCELLED }
  if (overwrite === 'need-force') return { kind: 'error', text: needForceText() }
  try {
    seedStory(root, templateId, config, true)
    return { kind: 'success', text: boundTo(bookNameForTemplate(templateId)) }
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
  if (!meta) return { kind: 'error', text: noWorldYet() }
  if (!name) {
    const answers = await askUser(ctx, inv, [protagonistQuestion(meta.templateId as TemplateId, config)])
    if (!answers) return { kind: 'error', text: castNeedName() }
    name = pickAnswer(answers, 'protagonist')
    if (!name) return { kind: 'error', text: '未选定天命之人。' }
  }
  const applied = applyProtagonist(root, meta.templateId as TemplateId, name)
  const cards = loadCharacters(root)
  return { kind: 'success', text: castDone(applied, cards.length) }
}

export async function handleExport(
  ctx: InfiniteContext,
  config: Required<PluginConfig>,
  inv: CommandInvocation,
): Promise<CommandResult> {
  const includePlayer = /\bplayer\b/i.test(inv.rawInput)
  const session = sessionOf(inv)
  const root = infiniteRoot(resolveSessionDir(ctx, session, config))
  const meta = loadMeta(root)
  if (!meta) return { kind: 'error', text: noWorldYet() }
  const world = bookNameForTemplate(meta.templateId)
  const messages = sessionMessages(session)
  const prose = collectExportSource(session)
  if (!prose.trim()) return { kind: 'error', text: exportNoProse() }
  const suggestions = suggestExportTitles(world, meta.protagonist, prose)
  let title = suggestions[0] || sessionTitle(world, meta.protagonist)
  const answers = await askUser(ctx, inv, [{
    id: 'title',
    header: ASK_HEADER,
    question: TITLE_QUESTION,
    detail: TITLE_DETAIL,
    options: suggestions.map((label, index) => ({
      label,
      description: index === 0 ? '拟题（推荐）' : '另拟',
    })),
  }])
  if (answers) {
    const picked = pickAnswer(answers, 'title')
    if (picked) title = picked
  }
  const destDir = session.header?.cwd || process.cwd()
  let book = exportTranscript(title, meta.protagonist, messages, includePlayer, world)
  if (!manuscriptHasBody(book)) book = bindManuscript(title, meta.protagonist, world, prose)
  if (!manuscriptHasBody(book)) return { kind: 'error', text: exportNoProse() }
  saveExport(root, book)
  const dest = saveNamedExport(destDir, safeBookFileName(title), book)
  revealFile(dest)
  saveMeta(root, {
    ...meta,
    exportPending: true,
    exportTitle: title,
    exportCwd: destDir,
  })
  const woke = wakeSoon(inv.agent, polishPrompt(title, world, meta.protagonist, prose))
  if (!woke) return { kind: 'success', text: exportDone(book.length, title, dest, true) }
  return { kind: 'success', text: exportPolishing(title, dest) }
}

export function registerCommands(ctx: InfiniteContext, config: Required<PluginConfig>): void {
  for (const [name, copy] of Object.entries(COMMANDS_COPY)) {
    const handler = name === 'new'
      ? handleNew
      : name === 'bind'
        ? handleBind
        : name === 'cast'
          ? handleCast
          : handleExport
    ctx.effect(() => ctx.commands.register({
      name,
      description: copy.description,
      input: { hint: copy.hint },
      handler: (inv) => handler(ctx, config, inv),
    }), `infinite.cmd.${name}`)
  }
}
