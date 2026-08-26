import { readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const output = resolve(import.meta.dirname, '../../app/static/generated')
const files = await readdir(output)
const failures = []
for (const name of files) {
  if (!/\.(js|css)$/.test(name)) continue
  const bytes = (await stat(resolve(output, name))).size
  const limit = name.includes('ISBNScanner') ? 700_000 : name.endsWith('.css') ? 120_000 : name.startsWith('main-') ? 520_000 : 280_000
  if (bytes > limit) failures.push(`${name}: ${bytes} bayt > ${limit} bayt`)
}
if (failures.length) {
  console.error(`Bundle boyutu bütçesi aşıldı:\n${failures.join('\n')}`)
  process.exit(1)
}
console.log('Bundle boyutu bütçesi uygun.')
