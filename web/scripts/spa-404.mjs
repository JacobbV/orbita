// O GitHub Pages não conhece as rotas do React. Quando alguém abre
// /orbita/creditos direto, o Pages devolve 404.html. Copiando o index.html
// para 404.html, o React carrega e mostra a página certa.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
console.log('dist/404.html criado para as rotas do GitHub Pages.')
