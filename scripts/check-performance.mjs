import { readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`
const checks = [
  ['Lunch Box hero', 'assets/images/lunch-box/garett-grilling.webp', 500 * 1024, false],
  ['Featured lunch box', 'assets/images/lunch-box/branded-jerk-chicken-box.webp', 350 * 1024, false],
  ['Catering tray', 'assets/images/lunch-box/branded-jerk-chicken.webp', 450 * 1024, false],
  ['Transparent shared logo', 'assets/logo-transparent.webp', 80 * 1024, false],
  ['Public Convex client', 'vendor/convex-client.js', 30 * 1024, true]
]

let failed = false
for (const [label, file, budget, compressed] of checks) {
  const bytes = compressed ? gzipSync(readFileSync(file)).length : statSync(file).size
  const passes = bytes <= budget
  failed ||= !passes
  console.log(`${passes ? 'PASS' : 'FAIL'} ${label}: ${kb(bytes)} / ${kb(budget)}${compressed ? ' gzip' : ''}`)
}

if (failed) process.exitCode = 1
