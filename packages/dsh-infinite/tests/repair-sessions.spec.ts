import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { constants, zstdCompressSync, zstdDecompressSync } from 'node:zlib'
import { afterEach, describe, expect, it } from 'vitest'
import { apply } from '../src/index.ts'
import { LEGACY_BIND_TYPE, patchJsonl, repairSessionLog, repairSessionTree, scanZstdFrames } from '../src/repair-sessions.ts'
import type { InfiniteContext, PluginConfig } from '../src/types.ts'
import { resolveConfig } from '../src/types.ts'

const CHECKSUM = { params: { [constants.ZSTD_c_checksumFlag]: 1 } }

function bindLine(seq: number, ignorable?: true): string {
  const event: Record<string, unknown> = {
    type: LEGACY_BIND_TYPE,
    seq,
    time: 1_700_000_000_000,
    data: { templateId: 'cultivation', dir: 'infinite' },
  }
  if (ignorable) event.ignorable = true
  return JSON.stringify(event)
}

function headerLine(): string {
  return JSON.stringify({
    type: 'session',
    version: 0,
    id: 'session-test',
    createdAt: 1,
    delegationDepth: 0,
  })
}

function knownLine(seq: number): string {
  return JSON.stringify({
    type: 'session/title',
    seq,
    time: 1_700_000_000_001,
    data: { title: '修仙', messageSeqs: [], source: { kind: 'user' } },
  })
}

function refusedByHarness(events: Array<Record<string, unknown>>): string[] {
  const known = new Set(['session/title', 'command/done', 'turn/start', 'turn/end'])
  return events
    .filter((event) => !known.has(String(event.type)) && event.ignorable !== true)
    .map((event) => String(event.type))
}

describe('repair leftover infinite/bind session events', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  function tmp(): string {
    const dir = mkdtempSync(join(tmpdir(), 'infinite-repair-'))
    dirs.push(dir)
    return dir
  }

  it('marks plaintext bind events ignorable without reseeding seqs', () => {
    const text = [headerLine(), knownLine(1), bindLine(5), knownLine(6)].join('\n') + '\n'
    const patched = patchJsonl(text)
    expect(patched.changed).toBe(1)
    const events = patched.text
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => JSON.parse(line) as Record<string, unknown>)
    expect(events[1]?.seq).toBe(5)
    expect(events[1]?.ignorable).toBe(true)
    expect(events[2]?.seq).toBe(6)
    expect(refusedByHarness(events)).toEqual([])
  })

  it('leaves already-ignorable bind events alone', () => {
    const text = `${bindLine(5, true)}\n`
    const patched = patchJsonl(text)
    expect(patched.changed).toBe(0)
    expect(patched.text).toBe(text)
  })

  it('rewrites a checksummed zstd session log so DSH can load it', () => {
    const dir = tmp()
    const path = join(dir, 'session.jsonl.zstd')
    const header = Buffer.from(`${headerLine()}\n`, 'utf8')
    const events = Buffer.from([bindLine(5), knownLine(6)].join('\n') + '\n', 'utf8')
    writeFileSync(path, Buffer.concat([
      zstdCompressSync(header, CHECKSUM),
      zstdCompressSync(events, CHECKSUM),
    ]))
    expect(repairSessionLog(path)).toBe('repaired')
    expect(repairSessionLog(path)).toBe('clean')
    const backup = readFileSync(`${path}.bak-infinite`)
    expect(backup.length).toBeGreaterThan(0)
    const frames = readFileSync(path)
    const plain = scanZstdFrames(frames).frames
      .map((frame) => zstdDecompressSync(frames.subarray(frame.start, frame.end)).toString('utf8'))
      .join('')
    expect(plain).toContain('"ignorable":true')
    expect(plain).toContain('"seq":5')
  })

  it('repairs every session log under a DSH home on apply', () => {
    const home = tmp()
    const log = join(home, 'sessions', 'proj', 'session-old', 'session.jsonl')
    mkdirSync(join(log, '..'), { recursive: true })
    writeFileSync(log, [headerLine(), bindLine(5), knownLine(6)].join('\n') + '\n')
    const ctx = {
      commands: { register() { return () => undefined } },
      systemPrompt: { section() { return () => undefined }, context() { return () => undefined } },
      effect(fn: () => (() => void) | void) { fn() },
      on() { return () => undefined },
    } as unknown as InfiniteContext
    const config = resolveConfig({ dshHome: home, dataDir: home, templatesDir: home } as PluginConfig)
    apply(ctx, config)
    const events = readFileSync(log, 'utf8')
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => JSON.parse(line) as Record<string, unknown>)
    expect(events[0]?.ignorable).toBe(true)
    expect(repairSessionTree(join(home, 'sessions')).repaired).toBe(0)
  })
})
