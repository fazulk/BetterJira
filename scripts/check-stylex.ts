import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStylexPlugin } from '../stylex.config'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const plugin = createStylexPlugin({ test: true })
if (typeof plugin.transform !== 'function') {
  throw new TypeError('StyleX must provide a transform hook for the style check.')
}
const transform = plugin.transform

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await sourceFiles(path))
    }
    else if (/\.tsx?$/.test(entry.name)) {
      files.push(path)
    }
  }
  return files
}

const files = [join(root, 'app.tsx'), ...await sourceFiles(join(root, 'src')), ...await sourceFiles(join(root, 'pages'))]
let checked = 0
for (const file of files) {
  const source = await readFile(file, 'utf8')
  if (!source.includes('@stylexjs/stylex')) {
    continue
  }
  // Compile definitions only: no Vite server, bundles, or output assets.
  await Reflect.apply(transform, undefined, [source, file])
  checked += 1
}
console.log(`StyleX definitions compile in ${checked} source files.`)
