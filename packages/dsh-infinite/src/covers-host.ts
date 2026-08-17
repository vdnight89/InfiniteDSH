import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { buildCoverManifest } from 'infinite-core'
import { templatesDir } from './paths.js'
import type { InfiniteContext, PluginConfig } from './types.js'

const STATIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'static')

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

export function coversRoot(config: Required<PluginConfig>): string {
  return join(dirname(templatesDir(config)), 'covers')
}

export function safeCoverName(name: string): string | null {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return null
  if (name.includes('..')) return null
  return name
}

function sendFile(
  res: { writeHead(code: number, headers?: Record<string, string>): void; end(body?: string | Buffer): void },
  file: string,
  method = 'GET',
): void {
  const ext = extname(file).toLowerCase()
  const type = MIME[ext] ?? 'application/octet-stream'
  const body = readFileSync(file)
  res.writeHead(200, {
    'content-type': type,
    'cache-control': 'public, max-age=86400',
    'content-length': String(body.length),
  })
  if (method === 'HEAD') {
    res.end()
    return
  }
  res.end(body as unknown as string)
}

function resolveUnder(root: string, name: string): string | null {
  const safe = safeCoverName(name)
  if (!safe) return null
  const full = normalize(join(root, safe))
  const prefix = normalize(root).toLowerCase() + sep
  const candidate = full.toLowerCase()
  if (!candidate.startsWith(prefix) && candidate !== normalize(root).toLowerCase()) return null
  return existsSync(full) && statSync(full).isFile() ? full : null
}

export function registerCoverServer(ctx: InfiniteContext, config: Required<PluginConfig>): void {
  const web = (typeof ctx.get === 'function' ? ctx.get('webServer') : ctx.webServer) as InfiniteContext['webServer'] | undefined
  if (!web?.register) return
  const pictures = coversRoot(config)
  const manifest = JSON.stringify(buildCoverManifest())

  ctx.effect(() => web.register({
    kind: 'prefix',
    path: '/infinite',
    handler(req, res) {
      const method = (req as { method?: string }).method ?? 'GET'
      if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405, { allow: 'GET, HEAD' })
        res.end()
        return
      }
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const rest = url.pathname.replace(/^\/infinite\/?/, '')
      if (rest === 'manifest.json') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        if (method === 'HEAD') {
          res.end()
          return
        }
        res.end(manifest)
        return
      }
      if (rest === 'cards.css' || rest === 'cards.js') {
        const file = resolveUnder(STATIC_DIR, rest)
        if (!file) {
          res.writeHead(404)
          res.end('missing')
          return
        }
        sendFile(res, file, method)
        return
      }
      if (rest.startsWith('covers/')) {
        const file = resolveUnder(pictures, rest.slice('covers/'.length))
        if (!file) {
          res.writeHead(404)
          res.end('missing cover')
          return
        }
        sendFile(res, file, method)
        return
      }
      res.writeHead(404)
      res.end('not found')
    },
  }), 'infinite.covers')

  const tapIndex = web.tapIndex
  if (typeof tapIndex === 'function') {
    ctx.effect(() => tapIndex((html) => {
      if (html.includes('data-infinite-cards')) return html
      const tags = '<link rel="stylesheet" href="/infinite/cards.css" data-infinite-cards><script type="module" src="/infinite/cards.js" data-infinite-cards></script>'
      return html.includes('</head>')
        ? html.replace('</head>', `${tags}</head>`)
        : `${html}${tags}`
    }), 'infinite.cards-html')
  }
}
