import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { apply, inject, name as pluginName } from '../src/index.ts'
import { handleBind, handleCast, handleExport, handleNew } from '../src/commands.ts'
import { COMMANDS_COPY } from '../src/copy.ts'
import { installUserPreset } from '../src/install-preset.ts'
import { onSessionEvent } from '../src/lifecycle.ts'
import { safeCoverName } from '../src/covers-host.ts'
import { defaultTemplatesDir, infiniteRoot, resolveSessionDir } from '../src/paths.ts'
import { loadArchive, loadCharacters, loadMeta, loadWorldbook } from '../src/story-files.ts'
import type { CommandInvocation, DuckSession, InfiniteContext, PluginConfig } from '../src/types.ts'
import { resolveConfig } from '../src/types.ts'
import { buildWorldContext, parseLoreEntry, resolveTemplateId, TEMPLATE_CATALOG } from 'infinite-core'

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

  it('exports inject as a named sibling of apply, not as default', async () => {
    expect(pluginName).toBe('dsh-infinite')
    expect(inject).toEqual(['commands', 'systemPrompt', 'userQuestions'])
    const mod = await import('../src/index.ts')
    expect(mod.default).toBeUndefined()
    expect(mod.apply).toBe(apply)
  })

  it('ships a root dsh.bundle so github/npm add can load the plugin', () => {
    const manifest = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'package.json'), 'utf8'))
    expect(manifest.name).toBe('dsh-infinite')
    expect(manifest.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(manifest.main).toContain('index.bundle.js')
    expect(manifest.dependencies ?? {}).toEqual({})
  })

  it('registers the four human commands', () => {
    const { ctx, config } = setup()
    apply(ctx, config)
    expect(ctx.commandsList.sort()).toEqual(['bind', 'cast', 'export-story', 'new'])
    expect(COMMANDS_COPY.new.description).toContain('进入新世界')
    expect(COMMANDS_COPY['export-story'].description).toMatch(/誊出|书稿/)
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
    expect(sections.map((fn) => fn(lit)).join('\n')).toMatch(/正文/)
    expect(sections.map((fn) => fn(lit)).join('\n')).toContain('【歧路】')
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
          if (id === 'opening') return { answers: [{ id: 'opening', selected: ['走此界默认开局'] }] }
          if (id === 'embark') return { answers: [{ id: 'embark', selected: ['启程'] }] }
          return { answers: [] }
        },
      },
    }
    const result = await handleNew(asking, config, inv('pick', ''))
    expect(result.kind).toBe('success')
    expect(seen[0]).toEqual(['topic'])
    expect(seen[1]).toEqual(['protagonist'])
    expect(seen).toContainEqual(['opening'])
    expect(seen.at(-1)).toEqual(['embark'])
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
          return { answers: [{ id: 'overwrite', selected: ['留在此界'] }] }
        },
      },
    }
    const result = await handleNew(asking, config, inv('ow', '末世'))
    expect(result.kind).toBe('success')
    expect(result.text).toMatch(/未改界/)
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

  it('maps 赛博 to the cyber template, not scifi', () => {
    expect(resolveTemplateId('赛博')).toBe('cyber')
    expect(resolveTemplateId('赛博朋克')).toBe('cyber')
    expect(resolveTemplateId('科幻')).toBe('scifi')
    expect(resolveTemplateId('都市')).toBe('modern')
    expect(resolveTemplateId('都市异能')).toBe('urban')
  })

  it('does not ship undefined style cards or cross-genre plot seeds', () => {
    const style = parseLoreEntry(
      readFileSync(join(TEMPLATES, 'cultivation', 'worldbook', 'style-tpl-opening.md'), 'utf8'),
      'style',
    )
    expect(style.title).not.toBe('undefined')
    expect(style.content).not.toMatch(/undefined/)
    const plots = readdirSync(join(TEMPLATES, 'cultivation', 'plots')).join(' ')
    expect(plots).not.toMatch(/apocalypse/)
  })

  it('keeps plots out of world-rule injection', async () => {
    const { ctx, config } = setup()
    await handleNew(ctx, config, inv('rules', '修仙'))
    const root = infiniteRoot(resolveSessionDir(ctx, session('rules'), config))
    const world = loadWorldbook(root)
    expect(world.some((entry) => entry.category === '剧情')).toBe(false)
    expect(world.some((entry) => entry.category === '写法')).toBe(false)
    const built = buildWorldContext(world, '尸潮围山挑战', '修仙')
    expect(built.text).not.toContain('尸潮')
  })

  it('demotes the template hero when /cast picks someone else', async () => {
    const { ctx, config } = setup()
    await handleNew(ctx, config, inv('cast', '修仙'))
    const root = infiniteRoot(resolveSessionDir(ctx, session('cast'), config))
    const before = loadCharacters(root).find((card) => card.title === '谢无妄')
    expect(before?.constant).toBe(true)
    await handleCast(ctx, config, inv('cast', '江澄'))
    const cards = loadCharacters(root)
    expect(cards.find((card) => card.title === '江澄')?.constant).toBe(true)
    expect(cards.find((card) => card.title === '谢无妄')?.constant).toBe(false)
  })

  it('asks before /bind replaces an existing story', async () => {
    const { ctx, config } = setup()
    await handleNew(ctx, config, inv('bind', '修仙'))
    const asking = {
      ...ctx,
      userQuestions: {
        async ask(request: { questions: Array<{ id: string }> }) {
          const id = request.questions[0]?.id
          if (id === 'bind') return { answers: [{ id: 'bind', selected: ['末世'] }] }
          return { answers: [{ id: 'overwrite', selected: ['留在此界'] }] }
        },
      },
    }
    const cancelled = await handleBind(asking, config, inv('bind', ''))
    expect(cancelled.text).toMatch(/未改界/)
    expect(loadMeta(infiniteRoot(resolveSessionDir(ctx, session('bind'), config)))?.templateId).toBe('cultivation')
    const refused = await handleBind(ctx, config, inv('bind', '末世'))
    expect(refused.kind).toBe('error')
    expect(refused.text).toMatch(/force/)
    const forced = await handleBind(ctx, config, inv('bind', '末世 force'))
    expect(forced.kind).toBe('success')
    expect(loadMeta(infiniteRoot(resolveSessionDir(ctx, session('bind'), config)))?.templateId).toBe('apocalypse')
  })

  it('treats NO_PROVIDER as no UI and still opens with /new 修仙', async () => {
    const { ctx, config } = setup()
    const headless = {
      ...ctx,
      userQuestions: {
        async ask() {
          const error = new Error('no user-questions provider is registered') as Error & { code: string }
          error.code = 'NO_PROVIDER'
          throw error
        },
      },
    }
    const result = await handleNew(headless, config, inv('hd', '修仙'))
    expect(result.kind).toBe('success')
    expect(loadMeta(infiniteRoot(resolveSessionDir(headless, session('hd'), config)))?.templateId).toBe('cultivation')
  })

  it('records infinite/bind on the session and appends archive sections', async () => {
    const { ctx, config } = setup()
    const binds: Array<{ type: string; data?: Record<string, unknown> }> = []
    const sess = session('ev')
    sess.append = (type, data) => {
      binds.push({ type, data })
    }
    await handleNew(ctx, config, {
      agent: { session: sess },
      rawInput: '修仙',
      signal: new AbortController().signal,
    })
    expect(binds.some((item) => item.type === 'infinite/bind' && item.data?.templateId === 'cultivation')).toBe(true)
    expect(binds.some((item) => item.type === 'session/title' && String(item.data?.title).includes('修仙'))).toBe(true)
    onSessionEvent(ctx, config, sess, {
      type: 'compaction/summary',
      data: { summary: [{ type: 'text', text: '第一段档案。' }] },
    })
    onSessionEvent(ctx, config, sess, {
      type: 'compaction/summary',
      data: { summary: [{ type: 'text', text: '第二段档案。' }] },
    })
    const archive = loadArchive(infiniteRoot(resolveSessionDir(ctx, sess, config)))
    expect(archive).toContain('第一段档案。')
    expect(archive).toContain('第二段档案。')
  })

  it('answers HEAD for static covers without a body', () => {
    const { ctx, config } = setup()
    const routes: Array<{ path: string; handler: Function }> = []
    apply({
      ...ctx,
      webServer: {
        register(route: { path: string; handler: Function }) {
          routes.push(route)
          return () => undefined
        },
      },
    } as never, config)
    const res = { code: 0, body: 'unset', writeHead(code: number) { this.code = code }, end(body?: string) { this.body = body ?? '' } }
    routes[0]?.handler({ url: '/infinite/cards.css', method: 'HEAD' }, res)
    expect(res.code).toBe(200)
    expect(res.body).toBe('')
  })

  it('hides original option markup once the card grid is on', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'static', 'cards.css'), 'utf8')
    expect(css).toContain(':not(.infinite-card-cover):not(.infinite-card-copy)')
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

  it('gives every world a default protagonist card and at least three openings', () => {
    for (const item of TEMPLATE_CATALOG) {
      const dir = join(TEMPLATES, item.id)
      const chars = readdirSync(join(dir, 'characters')).filter((name) => name.endsWith('.md'))
      expect(chars.length, item.id).toBeGreaterThan(0)
      const hit = chars.some((name) => {
        const raw = readFileSync(join(dir, 'characters', name), 'utf8')
        return raw.includes(`title: ${item.defaultProtagonist}`)
      })
      expect(hit, `${item.id} missing ${item.defaultProtagonist}`).toBe(true)
      const plots = readdirSync(join(dir, 'plots')).filter((name) => name.endsWith('.md'))
      expect(plots.length, `${item.id} plots`).toBeGreaterThanOrEqual(3)
    }
  })

  it('wakes the first turn with 启程 and uses 诸天万界 command copy', async () => {
    const { ctx, config } = setup()
    apply(ctx, config)
    expect(ctx.commandsList).toContain('new')
    const followups: Array<{ content: Array<{ text: string }> }> = []
    const asking = {
      ...ctx,
      userQuestions: {
        async ask(request: { questions: Array<{ id: string }> }) {
          const id = request.questions[0]?.id
          if (id === 'embark') return { answers: [{ id: 'embark', selected: ['启程'] }] }
          if (id === 'protagonist') return { answers: [{ id: 'protagonist', selected: ['以此界默认之身'] }] }
          if (id === 'opening') return { answers: [{ id: 'opening', selected: ['走此界默认开局'] }] }
          return { answers: [] }
        },
      },
    }
    const result = await handleNew(asking, config, {
      agent: {
        session: session('wake'),
        followup(message) {
          followups.push(message as { content: Array<{ text: string }> })
        },
      },
      rawInput: '修仙',
      signal: new AbortController().signal,
    })
    expect(result.kind).toBe('success')
    expect(result.text).toMatch(/已踏入|第一段正在落笔/)
    expect(followups[0]?.content[0]?.text).toBe('启程。')
  })

  it('refreshes an old Infinite Play copy into 诸天万界', () => {
    const { config } = setup()
    const dest = installUserPreset(config)
    expect(dest).toBeTruthy()
    writeFileSync(join(dest!, 'preset.yml'), 'name: Infinite Play\ndescription: Literary session.\n')
    writeFileSync(join(dest!, 'agent.cordis.yml'), 'old-english-persona\n')
    installUserPreset(config)
    expect(readFileSync(join(dest!, 'preset.yml'), 'utf8')).toContain('诸天万界')
    expect(readFileSync(join(dest!, 'agent.cordis.yml'), 'utf8')).toContain('诸天万界')
  })

  it('styles a single radio option as a cover card', () => {
    const js = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'static', 'cards.js'), 'utf8')
    expect(js).toContain('buttons.length < 1')
    expect(js).toContain('withCover >= 1')
    expect(js).toMatch(/默认之身|默认开局/)
  })
})
