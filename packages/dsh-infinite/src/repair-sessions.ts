import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { constants, zstdCompressSync, zstdDecompressSync } from 'node:zlib'
import { resolveDshHome } from './paths.js'
import type { PluginConfig } from './types.js'

/** Custom type we used to append. DSH refuses it unless `ignorable: true`. */
export const LEGACY_BIND_TYPE = 'infinite/bind'

const BACKUP_SUFFIX = '.bak-infinite'
const TMP_SUFFIX = '.tmp-infinite'
const ZSTD_MAGIC = 4247762216
const CHECKSUM_OPTIONS = { params: { [constants.ZSTD_c_checksumFlag]: 1 } }

export interface RepairReport {
  readonly scanned: number
  readonly repaired: number
  readonly failed: number
  readonly files: readonly string[]
}

interface ZstdFrameRange {
  readonly start: number
  readonly end: number
}

interface ZstdFrameScan {
  readonly frames: ZstdFrameRange[]
  readonly tornStart?: number
}

export function isSessionLogName(name: string): boolean {
  return name === 'session.jsonl' || name === 'session.jsonl.zstd'
}

/** Walk `~/.dsh/sessions` (or this config's DSH home) and mark leftover bind events ignorable. */
export function repairLegacyBindEvents(config: Required<PluginConfig>): RepairReport {
  return repairSessionTree(join(resolveDshHome(config), 'sessions'))
}

export function repairSessionTree(root: string): RepairReport {
  const files: string[] = []
  const repaired: string[] = []
  let failed = 0
  collectSessionLogs(root, files)
  for (const file of files) {
    try {
      if (repairSessionLog(file) === 'repaired') repaired.push(file)
    } catch {
      failed += 1
    }
  }
  return { scanned: files.length, repaired: repaired.length, failed, files: repaired }
}

/** Patch one JSONL or JSONL+zstd session artifact. Returns whether the file changed. */
export function repairSessionLog(path: string): 'repaired' | 'clean' {
  const raw = readFileSync(path)
  if (path.endsWith('.zstd') || isZstd(raw)) {
    const next = patchZstd(raw)
    if (!next) return 'clean'
    replaceFile(path, next)
    return 'repaired'
  }
  const patched = patchJsonl(raw.toString('utf8'))
  if (patched.changed === 0) return 'clean'
  replaceFile(path, Buffer.from(patched.text, 'utf8'))
  return 'repaired'
}

export function patchJsonl(text: string): { text: string; changed: number } {
  const lines = text.split('\n')
  let changed = 0
  const next = lines.map((line) => {
    if (!line) return line
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>
      if (parsed.type === LEGACY_BIND_TYPE && parsed.ignorable !== true) {
        parsed.ignorable = true
        changed += 1
        return JSON.stringify(parsed)
      }
    } catch {
      // leave a corrupt line untouched
    }
    return line
  })
  return { text: next.join('\n'), changed }
}

function collectSessionLogs(root: string, acc: string[]): void {
  let names: import('node:fs').Dirent[]
  try {
    names = readdirSync(root, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of names) {
    const full = join(root, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      collectSessionLogs(full, acc)
      continue
    }
    if (entry.isFile() && isSessionLogName(entry.name)) acc.push(full)
  }
}

function isZstd(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.readUInt32LE(0) === ZSTD_MAGIC
}

function patchZstd(buffer: Buffer): Buffer | null {
  const { frames, tornStart } = scanZstdFrames(buffer)
  const out: Buffer[] = []
  let changed = 0
  for (const frame of frames) {
    const raw = buffer.subarray(frame.start, frame.end)
    const plain = zstdDecompressSync(raw).toString('utf8')
    const patched = patchJsonl(plain)
    if (patched.changed === 0) {
      out.push(Buffer.from(raw))
      continue
    }
    changed += patched.changed
    out.push(zstdCompressSync(Buffer.from(patched.text, 'utf8'), CHECKSUM_OPTIONS))
  }
  if (tornStart !== undefined) out.push(buffer.subarray(tornStart))
  if (changed === 0) return null
  return Buffer.concat(out)
}

/**
 * Locate complete Zstandard frames without decompressing blocks.
 * Same layout contract as `@deepseek-ai/dsh-session-persistence-jsonl`.
 */
export function scanZstdFrames(buffer: Buffer, maxFrames = Number.POSITIVE_INFINITY): ZstdFrameScan {
  const frames: ZstdFrameRange[] = []
  let offset = 0
  while (offset < buffer.length) {
    const start = offset
    if (buffer.length - offset < 4) return { frames, tornStart: start }
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) {
      throw new Error(`corrupt Zstandard session log: invalid frame magic at byte ${offset}`)
    }
    offset += 4
    if (offset === buffer.length) return { frames, tornStart: start }
    const descriptor = buffer.readUInt8(offset)
    offset += 1
    if ((descriptor & 24) !== 0) {
      throw new Error(`corrupt Zstandard session log: reserved frame-header bit at byte ${offset - 1}`)
    }
    const contentSizeFlag = descriptor >>> 6
    const singleSegment = (descriptor & 32) !== 0
    const checksum = (descriptor & 4) !== 0
    const dictionaryFlag = descriptor & 3
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag
    const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag
    const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes
    if (buffer.length - offset < remainingHeaderBytes) return { frames, tornStart: start }
    offset += remainingHeaderBytes
    for (;;) {
      if (buffer.length - offset < 3) return { frames, tornStart: start }
      const blockHeader = buffer.readUIntLE(offset, 3)
      offset += 3
      const lastBlock = (blockHeader & 1) !== 0
      const blockType = (blockHeader >>> 1) & 3
      const blockSize = blockHeader >>> 3
      if (blockType === 3) {
        throw new Error(`corrupt Zstandard session log: reserved block type at byte ${offset - 3}`)
      }
      const payloadBytes = blockType === 1 ? 1 : blockSize
      if (buffer.length - offset < payloadBytes) return { frames, tornStart: start }
      offset += payloadBytes
      if (lastBlock) break
    }
    if (checksum) {
      if (buffer.length - offset < 4) return { frames, tornStart: start }
      offset += 4
    }
    frames.push({ start, end: offset })
    if (frames.length === maxFrames) return { frames }
  }
  return { frames }
}

function replaceFile(path: string, data: Buffer): void {
  const backup = path + BACKUP_SUFFIX
  const tmp = path + TMP_SUFFIX
  writeFileSync(tmp, data)
  if (existsSync(path) && !existsSync(backup)) copyFileSync(path, backup)
  try {
    unlinkSync(path)
  } catch {
    // dest may already be gone
  }
  renameSync(tmp, path)
}
