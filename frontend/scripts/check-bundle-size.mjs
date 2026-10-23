import { readdir, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const output = resolve(import.meta.dirname, '../../backend/app/static/generated')

async function* files(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else yield path
  }
}

/** Dosya başına üst sınır (bayt). Barkod tarayıcı ve React çekirdeği ayrı parçalardır. */
function limitFor(name) {
  if (name.includes('ISBNScanner')) return 700_000
  if (name.endsWith('.css')) return 120_000
  if (name.startsWith('react-')) return 300_000
  return 180_000
}

const failures = []
for await (const path of files(output)) {
  const name = relative(output, path)
  if (!/\.(js|css)$/.test(name)) continue
  const bytes = (await stat(path)).size
  const limit = limitFor(name.split('/').pop())
  if (bytes > limit) failures.push(`${name}: ${bytes} bayt > ${limit} bayt`)
}
if (failures.length) {
  console.error(`Bundle boyutu bütçesi aşıldı:\n${failures.join('\n')}`)
  process.exit(1)
}
console.log('Bundle boyutu bütçesi uygun.')
