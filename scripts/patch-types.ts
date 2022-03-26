import { promises as fs } from 'fs'

const path = 'dist/index.d.ts'
await fs.writeFile(
  path,
  await fs.readFile('dist/index.d.ts', 'utf-8')
    .then(r => `/// <reference types="vite/client" />\n${r}`),
  'utf-8',
)
