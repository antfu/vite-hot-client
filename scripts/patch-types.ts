import { promises as fs } from 'node:fs'

const files = [
  'dist/index.d.ts',
  'dist/index.d.mts',
]

for (const path of files) {
  await fs.writeFile(
    path,
    await fs.readFile(path, 'utf-8')
      .then(r => `/// <reference types="vite/client" />\n${r}`),
    'utf-8',
  )
}
