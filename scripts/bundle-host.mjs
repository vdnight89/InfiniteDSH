#!/usr/bin/env node
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

await build({
  absWorkingDir: root,
  entryPoints: [join(root, 'packages/dsh-infinite/dist/index.js')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: join(root, 'packages/dsh-infinite/dist/index.bundle.js'),
  packages: 'bundle',
  logLevel: 'info',
})
