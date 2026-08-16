import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { apply } from '../src/index.ts'
import { handleCast, handleExport, handleNew } from '../src/commands.ts'
import { installUserPreset } from '../src/install-preset.ts'
import { onSessionEvent } from '../src/lifecycle.ts'
import { safeCoverName } from '../src/covers-host.ts'
import { defaultTemplatesDir, infiniteRoot, resolveSessionDir } from '../src/paths.ts'
import { loadArchive, loadMeta } from '../src/story-files.ts'
import type { CommandInvocation, DuckSession, InfiniteContext, PluginConfig } from '../src/types.ts'
import { resolveConfig } from '../src/types.ts'
import { buildWorldContext, parseLoreEntry } from 'infinite-core'
import { loadWorldbook } from '../src/story-files.ts'

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dsh-infinite-preset', 'templates')

function mockCtx(): InfiniteContext & { commandsList: string[] } {
  const commandsList: string[] = []
  const ctx = {
    commandsList,
    commands: {
      register(def: { name: string }) {
        commandsList.push(def.name)
        return () => undefined
      },
    },
    systemPrompt: {
      section() { return () => undefined },
      context() { return () => undefined },
    },
    effect(fn: () => (() => void) | void) { fn() },
    on() { return () => undefined },
  }
  return ctx as InfiniteContext & { commandsList: string[] }
}

function session(id: string, events: DuckSession['events'] = []): DuckSession {
  return { id, events }
}

function inv(sessionId: string, rawInput: string, events: DuckSession['events'] = []): CommandInvocation {
  return {
    agent: { session: session(sessionId, events) },
    rawInput,
    signal: new AbortController().signal,
  }
}

describe('dsh-infinite plugin', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  function setup(): { ctx: InfiniteContext; config: Required<PluginConfig> } {
    const dataDir = mkdtempSync(join(tmpdir(), 'infinite-'))
    dirs.push(dataDir)
    const ctx = mockCtx()
    const config = resolveConfig({ templatesDir: TEMPLATES, dataDir, dshHome: dataDir })
    return { ctx, config }
  }

  it('does not overwrite an existing user preset', () => {
    const { config } = setup()
    const first = installUserPreset(config)
    expect(first).toBeTruthy()
    const marker = join(first!, 'agent.cordis.yml')
    const before = readFileSync(marker, 'utf8')
    writeFileSync(marker, `${before}\n# user-edit\n`)
    const second = installUserPreset(config)
    expect(second).toBe(first)
    expect(readFileSync(marker, 'utf8')).toContain('# user-edit')
  })

  it('rejects unsafe cover paths', () => {
    expect(safeCoverName('cultivation.jpg')).toBe('cultivation.jpg')
    expect(safeCoverName('../etc/passwd')).toBeNull()
    expect(safeCoverName('a/b.jpg')).toBeNull()
  })

  it('serves cover manifest and injects card assets into index html', () => {
    const { ctx, config } = setup()
    const routes: Array<{ path: string; handler: Function }> = []
    let transform: ((html: string) => string) | undefined
    const web = {
      register(route: { path: string; handler: Function }) {
        routes.push(route)
        return () => undefined
      },
      tapIndex(fn: (html: string) => string) {
        transform = fn
        return () => undefined
      },
    }
    apply({ ...ctx, webServer: web } as never, config)
    expect(routes.some((route) => route.path === '/infinite')).toBe(true)
    const html = transform?.('<html><head></head><body></body></html>') ?? ''
    expect(html).toContain('/infinite/cards.css')
    expect(html).toContain('/infinite/cards.js')
    const res = { code: 0, body: '', writeHead(code: number) { this.code = code }, end(body?: string) { this.body = body ?? '' } }
    routes[0]?.handler({ url: '/infinite/manifest.json' }, res)
    expect(res.code).toBe(200)
    expect(res.body).toContain('修仙')
  })

  it('registers the four human commands', () => {
    const { ctx, config } = setup()
    apply(ctx, config)
    expect(ctx.commandsList.sort()).toEqual(['bind', 'cast', 'export', 'new'])
  })

  it('injects world context only after /new on that session', async () => {
    const { ctx, config } = setup()
    const sections: Array<(a: { agent?: { session: DuckSession } }) => string> = []
    const contexts: Array<(a: { agent?: { session: DuckSession } }) => string> = []
    const rich = {
      ...ctx,
      systemPrompt: {
        section(s: { text: string | ((a: { agent?: { session: DuckSession } }) => string) }) {
          if (typeof s.text === 'function') sections.push(s.text)
          return () => undefined
        },
        context(c: { text: string | ((a: { agent?: { session: DuckSession } }) => string) }) {
          if (typeof c.text === 'function') contexts.push(c.text)
          return () => undefined
        },
      },
    }
    apply(rich, config)
    const blank = { agent: { session: session('blank') } }
    expect(sections.map((fn) => fn(blank)).join('')).toBe('')
    expect(contexts.map((fn) => fn(blank)).join('')).toBe('')
    await handleNew(rich, config, inv('lit', '修仙'))
    const lit = { agent: { session: session('lit', [{ type: 'user/message', data: { message: { content: [{ type: 'text', text: '去宗门藏经阁' }] } } }]) } }
    const world = contexts.map((fn) => fn(lit)).join('\n')
    expect(world).toContain('【世界规则·修仙】')
    expect(world).toMatch(/宗门|藏经阁|境界/)
    expect(sections.map((fn) => fn(lit)).join('\n')).toContain('直接输出故事正文')
  })

  it('seeds a cultivation story and refuses a second /new without force', async () => {
    const { ctx, config } = setup()
    const first = await handleNew(ctx, config, inv('s1', '修仙'))
    expect(first.kind).toBe('success')
    const root = infiniteRoot(resolveSessionDir(ctx, session('s1'), config))
    const meta = loadMeta(root)
    expect(meta?.templateId).toBe('cultivation')
    expect(loadWorldbook(root).some((e) => e.title.includes('宗门') || e.id.includes('sect'))).toBe(true)
    const second = await handleNew(ctx, config, inv('s1', '末世'))
    expect(second.kind).toBe('error')
    expect(second.text).toMatch(/force/)
    const forced = await handleNew(ctx, config, inv('s1', '末世 force'))
    expect(forced.kind).toBe('success')
    expect(loadMeta(root)?.templateId).toBe('apocalypse')
  })

  it('does not leak worldbook across sessions', async () => {
    const { ctx, config } = setup()
    await handleNew(ctx, config, inv('cult', '修仙'))
    await handleNew(ctx, config, inv('apo', '末世'))
    const cult = loadWorldbook(infiniteRoot(resolveSessionDir(ctx, session('cult'), config)))
    const apo = loadWorldbook(infiniteRoot(resolveSessionDir(ctx, session('apo'), config)))
    const cultHit = buildWorldContext(cult, '夜闯宗门藏经阁', '修仙')
    const apoHit = buildWorldContext(apo, '夜闯宗门藏经阁', '末世')
    expect(cultHit.text).toMatch(/宗门|藏经阁|境界/)
    expect(apoHit.text).not.toContain('炼气期')
    expect(apoHit.text.length).toBeGreaterThan(0)
  })

  it('casts a new protagonist and exports only assistant prose', async () => {
    const { ctx, config } = setup()
    await handleNew(ctx, config, inv('s2', '都市'))
    const cast = await handleCast(ctx, config, inv('s2', '江澄'))
    expect(cast.kind).toBe('success')
    expect(loadMeta(infiniteRoot(resolveSessionDir(ctx, session('s2'), config)))?.protagonist).toBe('江澄')
    const exported = handleExport(ctx, config, inv('s2', '', [
      { type: 'user/message', data: { message: { content: [{ type: 'text', text: '【开局】开始' }] } } },
      { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '【正文】电梯门开了。' }] } } },
      { type: 'user/message', data: { message: { content: [{ type: 'text', text: '走进去' }] } } },
    ]))
    expect(exported.kind).toBe('success')
    const root = infiniteRoot(resolveSessionDir(ctx, session('s2'), config))
    const txt = readFileSync(join(root, 'export.txt'), 'utf8')
    expect(txt).toContain('电梯门开了。')
    expect(txt).not.toContain('【正文】')
    expect(txt).not.toContain('走进去')
    expect(txt).toContain('江澄')
  })

  it('draws a random event on turn/start and writes archive on compaction', async () => {
    const { ctx, config } = setup()
    await handleNew(ctx, config, inv('s3', '修仙'))
    const sess = session('s3')
    onSessionEvent(ctx, config, sess, { type: 'turn/start' })
    const pending = loadMeta(infiniteRoot(resolveSessionDir(ctx, sess, config)))?.pendingEventId
    expect(pending).toBeTruthy()
    onSessionEvent(ctx, config, sess, { type: 'turn/end' })
    const after = loadMeta(infiniteRoot(resolveSessionDir(ctx, sess, config)))
    expect(after?.pendingEventId).toBeNull()
    expect(after?.pickedEventIds).toContain(pending)
    onSessionEvent(ctx, config, sess, {
      type: 'compaction/summary',
      data: { summary: [{ type: 'text', text: '外门值日三日，钟声提前。' }] },
    })
    expect(loadArchive(infiniteRoot(resolveSessionDir(ctx, sess, config)))).toContain('外门值日三日')
  })

  it('resolves shipped templates without an explicit config path', () => {
    expect(normalize(defaultTemplatesDir())).toBe(normalize(TEMPLATES))
  })

  it('asks for topic and protagonist when /new has no args', async () => {
    const { ctx, config } = setup()
    const seen: unknown[] = []
    const asking = {
      ...ctx,
      userQuestions: {
        async ask(request: { questions: Array<{ id: string }> }) {
          seen.push(request.questions.map((q) => q.id))
          const id = request.questions[0]?.id
          if (id === 'topic') return { answers: [{ id: 'topic', selected: ['末世'] }] }
          if (id === 'protagonist') return { answers: [{ id: 'protagonist', selected: ['周慎'] }] }
          if (id === 'opening') return { answers: [{ id: 'opening', selected: ['用默认开篇'] }] }
          return { answers: [] }
        },
      },
    }
    const result = await handleNew(asking, config, inv('pick', ''))
    expect(result.kind).toBe('success')
    expect(seen[0]).toEqual(['topic'])
    expect(seen[1]).toEqual(['protagonist'])
    expect(seen.at(-1)).toEqual(['opening'])
    const meta = loadMeta(infiniteRoot(resolveSessionDir(asking, session('pick'), config)))
    expect(meta?.templateId).toBe('apocalypse')
    expect(meta?.protagonist).toBe('周慎')
  })

  it('asks before overwriting an existing story', async () => {
    const { ctx, config } = setup()
    await handleNew(ctx, config, inv('ow', '修仙'))
    const asking = {
      ...ctx,
      userQuestions: {
        async ask() {
          return { answers: [{ id: 'overwrite', selected: ['取消'] }] }
        },
      },
    }
    const result = await handleNew(asking, config, inv('ow', '末世'))
    expect(result.kind).toBe('success')
    expect(result.text).toMatch(/取消/)
    expect(loadMeta(infiniteRoot(resolveSessionDir(ctx, session('ow'), config)))?.templateId).toBe('cultivation')
  })

  it('lists selectable topics when /new has no args and no UI', async () => {
    const { ctx, config } = setup()
    const result = await handleNew(ctx, config, inv('bare', ''))
    expect(result.kind).toBe('error')
    expect(result.text).toMatch(/修仙/)
    expect(result.text).toMatch(/末世/)
  })

  it('ships the whale-lab template with Liang and whale-girl cards', () => {
    const dir = join(TEMPLATES, 'whale')
    const names = readdirSync(join(dir, 'characters')).join(' ')
    expect(names).toMatch(/whale|liang|alan/i)
    expect(readdirSync(join(dir, 'worldbook')).length).toBeGreaterThan(8)
    expect(readdirSync(join(dir, 'plots')).length).toBeGreaterThan(10)
    const liang = readdirSync(join(dir, 'characters')).find((name) => name.includes('liang'))
    expect(liang).toBeTruthy()
    const card = parseLoreEntry(readFileSync(join(dir, 'characters', liang!), 'utf8'), 'x')
    expect(card.keys).toEqual(expect.arrayContaining(['梁组', '梁圣', '牢梁', '梁子']))
  })

  it('imports a full cultivation worldbook from AIRP', () => {
    const files = readdirSync(join(TEMPLATES, 'cultivation', 'worldbook'))
    expect(files.length).toBeGreaterThan(10)
    expect(readdirSync(join(TEMPLATES, 'cultivation', 'plots')).length).toBeGreaterThan(10)
    expect(readdirSync(join(TEMPLATES, 'cultivation', 'characters')).length).toBeGreaterThan(0)
  })

  it('parses a template entry the same way the plugin will load it', () => {
    const file = readdirSync(join(TEMPLATES, 'cultivation', 'worldbook')).find((name) => name.includes('宗门'))
    expect(file).toBeTruthy()
    const entry = parseLoreEntry(readFileSync(join(TEMPLATES, 'cultivation', 'worldbook', file!), 'utf8'), 'x')
    expect(entry.keys.length).toBeGreaterThan(0)
    expect(entry.title.length).toBeGreaterThan(0)
  })
})
