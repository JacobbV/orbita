// Copia o Python do navegador (Pyodide) para public/pyodide, para o site
// servir os arquivos ele mesmo, sem depender de CDN de terceiros.
import { copyFileSync, mkdirSync } from 'node:fs'

const ARQUIVOS = ['pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']
mkdirSync('public/pyodide', { recursive: true })
for (const arquivo of ARQUIVOS) copyFileSync(`node_modules/pyodide/${arquivo}`, `public/pyodide/${arquivo}`)
console.log('Pyodide copiado para public/pyodide.')
