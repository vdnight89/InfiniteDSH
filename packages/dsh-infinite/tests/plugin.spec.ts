import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { apply, inject, name as pluginName } from '../src/index.ts'
import { handleBind, handleCast, handleExport, handleNew } from '../src/commands.ts'
import { COMMANDS_COPY, isEmbarkChoice } from '../src/copy.ts'
import { offerForks } from '../src/forks-host.ts'
import { collectExportSource } from '../src/transcript.ts'
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

  it('writes type module so the preset restrict.js does not warn', () => {
    const { config } = setup()
    const dest = installUserPreset(config)
    expect(dest).toBeTruthy()
    expect(readFileSync(join(dest!, 'package.json'), 'utf8')).toMatch(/"type"\s*:\s*"module"/)
    rmSync(join(dest!, 'package.json'))
    installUserPreset(config)
    expect(readFileSync(join(dest!, 'package.json'), 'utf8')).toMatch(/"type"\s*:\s*"module"/)
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
    expect(manifest.description).toMatch(/诸天万界/)
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
    const dest = mkdtempSync(join(tmpdir(), 'infinite-export-'))
    dirs.push(dest)
    const followups: string[] = []
    const events = [
      { type: 'user/message', data: { message: { content: [{ type: 'text', text: '【开局】开始' }] } } },
      { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '【正文】电梯门开了。江澄站在灯下，走廊里有人咳嗽。他没有回头。' }] } } },
    ]
    const sess = { ...session('s2', events), header: { cwd: dest } }
    const exported = await handleExport(ctx, config, {
      agent: {
        session: sess,
        followup(message: { content: Array<{ text: string }> }) {
          followups.push(message.content[0]?.text ?? '')
        },
      },
      rawInput: '',
      signal: new AbortController().signal,
    })
    expect(exported.kind).toBe('success')
    expect(exported.text).toMatch(/草稿已落下/)
    expect(followups[0]).toMatch(/重誊成书/)
    expect(followups[0]).toMatch(/本地草稿/)
    expect(followups[0]).toMatch(/禁止调用任何工具/)
    expect(followups[0]).toContain('电梯门开了。')
    expect(followups[0]).not.toContain('今天的中文日期')
    const names = readdirSync(dest).filter((name) => name.endsWith('.md'))
    const draftName = names.find((name) => name.includes('草稿'))
    const bookName = names.find((name) => name.endsWith('.md') && !name.includes('草稿'))
    expect(draftName).toBeTruthy()
    expect(bookName).toBeTruthy()
    const draft = readFileSync(join(dest, draftName!), 'utf8')
    expect(draft).toContain('# 现代·江澄')
    expect(draft).toContain('电梯门开了。')
    expect(draft).not.toContain('【正文】')
    expect(loadMeta(infiniteRoot(resolveSessionDir(ctx, sess, config)))?.exportPending).toBe(true)

    sess.events = [
      ...events,
      { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '# 现代·江澄\n\n> 诸天万界 · 现代\n\n## 第一章　电梯门开了\n\n电梯门开了。江澄站在灯下，走廊深处有人咳嗽，他没有回头，只把袖口里的钥匙按进掌心。夜色从井道里涌上来。' }] } } },
    ]
    onSessionEvent(ctx, config, sess, { type: 'turn/end' })
    const txt = readFileSync(join(dest, bookName!), 'utf8')
    expect(txt).toContain('钥匙按进掌心')
    expect(txt).not.toContain('runshell')
    expect(readFileSync(join(dest, draftName!), 'utf8')).not.toContain('钥匙按进掌心')
    expect(loadMeta(infiniteRoot(resolveSessionDir(ctx, sess, config)))?.exportPending).toBeUndefined()
  })

  it('keeps the export draft when polish emits a tool call', async () => {
    const { ctx, config } = setup()
    await handleNew(ctx, config, inv('s2b', '都市'))
    const dest = mkdtempSync(join(tmpdir(), 'infinite-export-'))
    dirs.push(dest)
    const events = [
      { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '电梯门开了。江澄站在灯下，走廊里有人咳嗽。他没有回头。夜色从井道里涌上来。' }] } } },
    ]
    const sess = { ...session('s2b', events), header: { cwd: dest } }
    const exported = await handleExport(ctx, config, {
      agent: { session: sess, followup() { /* polish wake */ } },
      rawInput: '',
      signal: new AbortController().signal,
    })
    expect(exported.kind).toBe('success')
    sess.events = [
      ...events,
      { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '<tool_calls> <invoke name="runshell">date</invoke>' }] } } },
    ]
    onSessionEvent(ctx, config, sess, { type: 'turn/end' })
    const names = readdirSync(dest).filter((name) => name.endsWith('.md'))
    expect(names.some((name) => name.includes('草稿'))).toBe(true)
    const bookName = names.find((name) => name.endsWith('.md') && !name.includes('草稿'))
    const txt = readFileSync(join(dest, bookName!), 'utf8')
    expect(txt).toContain('电梯门开了。')
    expect(txt).not.toContain('runshell')
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

  it('does not write infinite/bind and still appends archive sections', async () => {
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
    expect(binds.some((item) => item.type === 'infinite/bind')).toBe(false)
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
    expect(readFileSync(join(dest!, 'preset.yml'), 'utf8')).toContain('诸天万界DSH')
    expect(readFileSync(join(dest!, 'agent.cordis.yml'), 'utf8')).toContain('诸天万界')
  })

  it('collects export source from deriveMessages when the event log has no assistant rows', () => {
    const sess = session('src')
    sess.events = [{ type: 'command/run', data: { name: 'export-story' } }]
    sess.deriveMessages = () => [
      { role: 'assistant', content: [{ type: 'text', text: '巷口的驴鸣突然断了。谢无妄把碗推过柜台，问谁的人头、谁的价。猎人没有立刻回答。' }] },
    ]
    const source = collectExportSource(sess)
    expect(source).toContain('谢无妄')
    expect(source).not.toContain('command')
  })

  it('ignores reasoning blocks when collecting export source', () => {
    const sess = session('reason')
    sess.events = [{
      type: 'assistant/message',
      data: {
        message: {
          role: 'assistant',
          content: [
            { type: 'reasoning', text: 'We need respond in Chinese. Need maybe include 【歧路】 later. Final.' },
            { type: 'text', text: '门轴在掌下发出枯骨般的响。\n\n谢无妄把歇业木牌翻了个面，又落回原位。老掌柜塞给他的钥匙还带着酒渍。\n\n【歧路】\n1. 先挪人进柜台后\n2. 捡起告示\n3. 卸他残甲' },
          ],
        },
      },
    }]
    const source = collectExportSource(sess)
    expect(source).toContain('门轴在掌下发出枯骨般的响')
    expect(source).toContain('歇业木牌')
    expect(source).not.toContain('We need respond')
    expect(source).not.toContain('先挪人进柜台后')
  })

  it('treats 启程 variants as embark', () => {
    expect(isEmbarkChoice('启程')).toBe(true)
    expect(isEmbarkChoice('启程。')).toBe(true)
    expect(isEmbarkChoice('启程 踏入')).toBe(true)
    expect(isEmbarkChoice('另择开局')).toBe(false)
  })

  it('offers parsed 歧路 as a clickable ask and wakes the chosen road', async () => {
    const { ctx, config } = setup()
    await handleNew(ctx, config, inv('forks', '修仙'))
    const followups: string[] = []
    const agent = {
      session: session('forks', [
        {
          type: 'assistant/message',
          data: {
            message: {
              content: [{ type: 'text', text: '山门开了。\n\n【歧路】\n1. 推门进去\n2. 先问守门人\n3. 绕到侧廊\n亦可自己写一条别的路。' }],
            },
          },
        },
      ]),
      followup(message: { content: Array<{ text: string }> }) {
        followups.push(message.content[0]?.text ?? '')
      },
    }
    const asking = {
      ...ctx,
      get(name: string) {
        if (name === 'agents') return { get: (id: string) => (id === 'forks' ? agent : undefined) }
        return undefined
      },
      userQuestions: {
        async ask(request: { questions: Array<{ options?: Array<{ label: string }> }> }) {
          const labels = request.questions[0]?.options?.map((item) => item.label) ?? []
          expect(labels).toHaveLength(3)
          expect(labels.join('')).not.toMatch(/自己写/)
          return { answers: [{ id: 'fork', selected: ['推门进去'] }] }
        },
      },
    }
    await offerForks(asking, agent.session)
    expect(followups).toEqual(['推门进去'])
    onSessionEvent(asking, config, agent.session, { type: 'turn/end' })
  })

  it('styles a single radio option as a cover card', () => {
    const js = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'static', 'cards.js'), 'utf8')
    expect(js).toContain('buttons.length < 1')
    expect(js).toContain('withCover >= 1')
    expect(js).toMatch(/默认之身|默认开局/)
  })
})
