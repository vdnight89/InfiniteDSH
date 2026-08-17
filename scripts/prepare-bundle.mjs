#!/usr/bin/env node
/**
 * Git / npm installs run this as `prepare`.
 * It compiles infinite-core and the host plugin so `dsh plugin add`
 * can load the bundle without a prior local `npm run build`.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tscJs = join(root, 'node_modules', 'typescript', 'lib', 'tsc.js')
const tscBin = join(root, 'node_modules', 'typescript', 'bin', 'tsc')

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (existsSync(tscJs)) {
  run(process.execPath, [tscJs, '-b', '--pretty', 'false'])
} else if (existsSync(tscBin)) {
  run(process.execPath, [tscBin, '-b', '--pretty', 'false'])
} else {
  run('npx', ['--yes', 'typescript@5.8.3', 'tsc', '-b', '--pretty', 'false'])
}
