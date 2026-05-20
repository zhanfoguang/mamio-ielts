#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const checks = [
  ['npm', ['run', 'content:validate']],
  ['npm', ['run', 'build']],
  ['node', ['--check', 'server/index.js']],
  ['node', ['--check', 'server/routes/auth.js']],
  ['node', ['--check', 'server/routes/progress.js']],
  ['node', ['--check', 'server/routes/content.js']],
  ['node', ['--check', 'server/db.js']]
]

for (const [cmd, args] of checks) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

console.log('\nSmoke check passed.')
