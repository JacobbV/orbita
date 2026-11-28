// =============================================================================
// Mapa da escola virtual: o Bloco 1 do IF Catolé do Rocha em pixel art
// original, todos os direitos reservados (veja LICENCA-ARTE.md).
//
// O prédio forma um H: um bloco em cima (salas 1 a 8), um embaixo (biblioteca,
// copas, cozinha) e, no meio, a escada que sobe. Dos lados da escada ficam os
// pátios abertos, com sol. No andar de cima, a passarela coberta liga os dois
// blocos e, dos lados dela, ficam os vazios dos pátios, com guarda-corpo.
//
// Tudo é medido em quadradinhos ("tiles") de 16×16 pixels. Cada sala guarda o
// retângulo de dentro (sem as paredes); as paredes ocupam um tile.
// O desenho é uma lista de retângulos coloridos ("pinta"), para servir tanto
// ao canvas da tela quanto ao script da folha de prévia.
//
// Este arquivo não importa nada.
// =============================================================================

export const TILE = 16
export const LARGURA_MAPA = 58
export const ALTURA_MAPA = 49

export type Andar = 'terreo' | 'superior'

export type TipoSala =
  | 'sala'
  | 'lab'
  | 'cad'
  | 'wc-f'
  | 'wc-m'
  | 'lavanderia'
  | 'copa'
  | 'cozinha'
  | 'coordenacao'
  | 'biblioteca'
  | 'leitura'
  | 'professores'

export interface Sala {
  id: string
  nome: string
  andar: Andar
  tipo: TipoSala
  /** Retângulo de dentro, em tiles. */
  x: number
  y: number
  w: number
  h: number
  /** Ativa: tem luz, porta aberta e dá para entrar. Inativa: escura e trancada. */
  ativa: boolean
  /** Lado da parede onde fica a porta. */
  porta: 'norte' | 'sul'
}

export interface Escada {
  id: string
  andar: Andar
  /** Tiles que levam ao outro andar. */
  x: number
  y: number
  w: number
  h: number
  /** Para onde vai: a escada com este id, no outro andar. */
  liga: string
  ativa: boolean
}

/**
 * Tipos de tile da grade de passagem:
 * "." chão de fora (grama), "#" parede, "c" corredor, "p" pátio, "f" calçada,
 * "n" chão coberto do meio, "s" escada, "w" passarela, "v" vazio do pátio,
 * "g" jardim, "r" dentro de sala, "d" porta, "x" portão, "a" árvore, "b" banco,
 * "o" móvel (não passa), "e" espaço de cima sem piso.
 */
export type Tile = '.' | '#' | 'c' | 'p' | 'f' | 'n' | 's' | 'w' | 'v' | 'g' | 'r' | 'd' | 'x' | 'a' | 'b' | 'o' | 'e'

// -----------------------------------------------------------------------------
// Salas
// -----------------------------------------------------------------------------
type Linha = { y: number; h: number; porta: 'norte' | 'sul' }
const A: Linha = { y: 1, h: 6, porta: 'sul' }
const B: Linha = { y: 12, h: 6, porta: 'norte' }
const C: Linha = { y: 31, h: 6, porta: 'sul' }
const D: Linha = { y: 42, h: 6, porta: 'norte' }

function s(andar: Andar, l: Linha, id: string, nome: string, tipo: TipoSala, x: number, w: number, ativa: boolean): Sala {
  return { id, nome, andar, tipo, x, y: l.y, w, h: l.h, ativa, porta: l.porta }
}

export const SALAS: Sala[] = [
  // Térreo, bloco de cima (salas 1 a 8)
  s('terreo', A, 'sala-8', 'Sala 8', 'sala', 9, 7, true),
  s('terreo', A, 'sala-7', 'Sala 7', 'sala', 17, 7, true),
  s('terreo', A, 'wc-fem', 'WC Feminino', 'wc-f', 25, 3, true),
  s('terreo', A, 'lavanderia', 'Lavanderia', 'lavanderia', 29, 2, false),
  s('terreo', A, 'wc-masc', 'WC Masculino', 'wc-m', 32, 3, true),
  s('terreo', A, 'sala-2', 'Sala 2', 'sala', 36, 7, false),
  s('terreo', A, 'sala-1', 'Sala 1', 'sala', 44, 7, false),
  s('terreo', B, 'sala-6', 'Sala 6', 'sala', 9, 7, false),
  s('terreo', B, 'sala-5', 'Sala 5', 'sala', 17, 7, false),
  s('terreo', B, 'coped', 'COPED', 'coordenacao', 25, 5, true),
  s('terreo', B, 'coord-info', 'Coord. Informática', 'coordenacao', 31, 4, true),
  s('terreo', B, 'sala-4', 'Sala 4', 'sala', 36, 7, false),
  s('terreo', B, 'sala-3', 'Sala 3', 'sala', 44, 7, false),
  // Térreo, bloco de baixo
  s('terreo', C, 'cozinha', 'Cozinha', 'cozinha', 9, 7, false),
  s('terreo', C, 'copa', 'Copa', 'copa', 17, 5, true),
  s('terreo', C, 'copa-2', 'Copa', 'copa', 23, 5, false),
  s('terreo', C, 'copa-3', 'Copa', 'copa', 29, 5, false),
  s('terreo', C, 'sala-b3', 'Sala', 'sala', 35, 8, false),
  s('terreo', C, 'sala-b4', 'Sala', 'sala', 44, 7, false),
  s('terreo', D, 'biblioteca', 'Biblioteca', 'biblioteca', 9, 10, true),
  s('terreo', D, 'leitura', 'Espaço de leitura', 'leitura', 20, 6, true),
  s('terreo', D, 'wc-fem-2', 'WC Feminino', 'wc-f', 27, 2, false),
  s('terreo', D, 'lavanderia-2', 'Lavanderia', 'lavanderia', 30, 2, false),
  s('terreo', D, 'wc-masc-2', 'WC Masculino', 'wc-m', 33, 2, false),
  s('terreo', D, 'coordenacao', 'Coordenação', 'coordenacao', 36, 15, false),

  // Andar de cima, bloco de cima (tudo trancado)
  s('superior', A, 'sala-9', 'Sala 9', 'sala', 9, 7, false),
  s('superior', A, 'sala-10', 'Sala 10', 'sala', 17, 7, false),
  s('superior', A, 'wc-fem-3', 'WC Feminino', 'wc-f', 25, 3, false),
  s('superior', A, 'lavanderia-3', 'Lavanderia', 'lavanderia', 29, 2, false),
  s('superior', A, 'wc-masc-3', 'WC Masculino', 'wc-m', 32, 3, false),
  s('superior', A, 'lab-6', 'Laboratório 6', 'lab', 36, 7, false),
  s('superior', A, 'lab-7', 'Laboratório 7', 'lab', 44, 7, false),
  s('superior', B, 'lab-8', 'Laboratório 8', 'lab', 9, 7, false),
  s('superior', B, 'professores', 'Sala dos professores', 'professores', 17, 7, false),
  s('superior', B, 'lab-9', 'Laboratório 9', 'lab', 36, 7, false),
  s('superior', B, 'lab-10', 'Laboratório 10', 'lab', 44, 7, false),
  // Andar de cima, bloco de baixo
  s('superior', C, 'lab-2', 'Laboratório 2', 'lab', 9, 7, true),
  s('superior', C, 'lab-cad', 'Lab. de Desenho CAD', 'cad', 17, 7, true),
  s('superior', C, 'lab-4', 'Laboratório 4', 'lab', 36, 7, false),
  s('superior', C, 'sala-12', 'Sala 12', 'sala', 44, 7, false),
  // O Laboratório 1 junta o 1 e o 3 (a parede do meio some): 27 lugares, para a turma toda.
  s('superior', D, 'lab-1', 'Laboratório 1', 'lab', 9, 15, true),
  s('superior', D, 'wc-fem-4', 'WC Feminino', 'wc-f', 25, 3, false),
  s('superior', D, 'lavanderia-4', 'Lavanderia', 'lavanderia', 29, 2, false),
  s('superior', D, 'wc-masc-4', 'WC Masculino', 'wc-m', 32, 3, false),
  s('superior', D, 'lab-5', 'Laboratório 5', 'lab', 36, 7, false),
  s('superior', D, 'sala-13', 'Sala 13', 'sala', 44, 7, false),
]

/** As três escadas: duas nas pontas da esquerda e a do meio do H. */
export const ESCADAS: Escada[] = [
  { id: 'norte-t', andar: 'terreo', x: 2, y: 1, w: 5, h: 4, liga: 'norte-s', ativa: true },
  { id: 'norte-s', andar: 'superior', x: 2, y: 1, w: 5, h: 4, liga: 'norte-t', ativa: true },
  { id: 'sul-t', andar: 'terreo', x: 2, y: 44, w: 5, h: 4, liga: 'sul-s', ativa: true },
  { id: 'sul-s', andar: 'superior', x: 2, y: 44, w: 5, h: 4, liga: 'sul-t', ativa: true },
  { id: 'meio-t', andar: 'terreo', x: 27, y: 21, w: 6, h: 7, liga: 'meio-s', ativa: true },
  { id: 'meio-s', andar: 'superior', x: 27, y: 22, w: 6, h: 6, liga: 'meio-t', ativa: true },
]

/** Coluna da porta de uma sala (a parede fica logo acima ou logo abaixo). */
export function portaDa(sala: Sala): [number, number] {
  const x = sala.w >= 6 ? sala.x + 1 : sala.x + Math.floor((sala.w - 1) / 2)
  return [x, sala.porta === 'norte' ? sala.y - 1 : sala.y + sala.h]
}

export function salasDo(andar: Andar): Sala[] {
  return SALAS.filter((sala) => sala.andar === andar)
}

// -----------------------------------------------------------------------------
// Grade de passagem
// -----------------------------------------------------------------------------
/** Árvores e bancos do térreo (tiles que não passam). */
const ARVORES: [number, number][] = [
  [53, 2], [56, 5], [53, 9], [56, 13], [54, 16],
  [12, 24], [20, 22], [41, 24], [47, 22],
  [55, 24], [55, 38], [55, 45],
]
const BANCOS: [number, number, number][] = [
  // [x, y, largura]
  [10, 19, 2], [15, 19, 2], [20, 19, 2], [38, 19, 2], [43, 19, 2], [48, 19, 2],
  [10, 29, 2], [15, 29, 2], [20, 29, 2], [38, 29, 2], [43, 29, 2], [48, 29, 2],
  [1, 14, 1], [1, 17, 1], [1, 31, 1], [1, 34, 1],
]

export function montarGrade(andar: Andar): Tile[][] {
  const g: Tile[][] = Array.from({ length: ALTURA_MAPA }, () => new Array<Tile>(LARGURA_MAPA).fill(andar === 'terreo' ? '.' : 'e'))
  const ret = (x: number, y: number, w: number, h: number, t: Tile) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const linha = g[j]
      if (linha && i >= 0 && i < LARGURA_MAPA) linha[i] = t
    }
  }
  const em = (x: number, y: number): Tile => g[y]?.[x] ?? 'e'

  // Cascas dos dois blocos (paredes), depois os vãos de dentro.
  ret(0, 0, 52, 12, '#')
  ret(8, 11, 44, 8, '#')
  ret(8, 30, 44, 8, '#')
  ret(0, 37, 52, 12, '#')
  // Corredores e patamares das escadas
  ret(1, 8, 50, 3, 'c')
  ret(1, 38, 50, 3, 'c')
  ret(1, 1, 7, 7, 'c')
  ret(1, 41, 7, 7, 'c')

  if (andar === 'terreo') {
    ret(52, 0, 6, 19, 'g')
    // Faixa coberta da esquerda e pátios abertos do meio
    ret(0, 12, 8, 25, 'f')
    ret(1, 11, 7, 1, '#')
    ret(1, 37, 7, 1, '#')
    ret(3, 11, 3, 1, 'd')
    ret(3, 37, 3, 1, 'd')
    ret(8, 19, 16, 11, 'p')
    ret(36, 19, 16, 11, 'p')
    ret(24, 19, 12, 11, 'n')
    // Portões de ferro na ponta dos corredores
    ret(51, 8, 1, 3, 'x')
    ret(51, 38, 1, 3, 'x')
  } else {
    // Vazios dos pátios e passarela do meio
    ret(8, 19, 17, 11, 'v')
    ret(35, 19, 17, 11, 'v')
    ret(25, 11, 10, 27, 'w')
    ret(25, 8, 10, 3, 'c')
    ret(25, 38, 10, 3, 'c')
  }

  for (const sala of salasDo(andar)) {
    ret(sala.x, sala.y, sala.w, sala.h, 'r')
    const [px, py] = portaDa(sala)
    ret(px, py, 1, 1, 'd')
  }
  for (const e of ESCADAS) if (e.andar === andar) ret(e.x, e.y, e.w, e.h, 's')

  if (andar === 'terreo') {
    for (const [x, y] of ARVORES) if (em(x, y) !== '#') ret(x, y, 1, 1, 'a')
    for (const [x, y, w] of BANCOS) ret(x, y, w, 1, 'b')
  }
  return g
}

// -----------------------------------------------------------------------------
// Desenho
// -----------------------------------------------------------------------------
export type Pinta = (x: number, y: number, w: number, h: number, cor: string) => void

const COR = {
  paredeTopo: '#4a4560',
  paredeTopoLuz: '#5d5877',
  paredeFace: '#e6dfd0',
  paredeFaceSombra: '#cfc6b3',
  rodape: '#9c9079',
  corredor: '#cfd3dc',
  corredorJunta: '#bcc1cc',
  grama: '#6cb957',
  gramaEscura: '#579f46',
  gramaClara: '#8ad070',
  piso: '#dccaa2',
  pisoJunta: '#c4ad83',
  calcada: '#c9c3b7',
  calcadaJunta: '#b3ac9f',
  concreto: '#bab5ab',
  concretoJunta: '#a39d92',
  degrau: '#c4beb3',
  degrauSombra: '#8f897e',
  madeira: '#9a6a3d',
  madeiraClara: '#bf8853',
  madeiraEscura: '#6f4a2a',
  ferro: '#3b3f55',
  escuro: 'rgba(8, 10, 26, 0.74)',
  noite: 'rgba(8, 10, 26, 0.5)',
  sol: 'rgba(255, 236, 170, 0.10)',
} as const

const PISOS: Record<TipoSala, [string, string]> = {
  sala: ['#e8dfcc', '#d6cab2'],
  lab: ['#c9d2df', '#b5bfcf'],
  cad: ['#d0d8e4', '#bcc6d5'],
  'wc-f': ['#c3e4e1', '#a9d1cd'],
  'wc-m': ['#c3e4e1', '#a9d1cd'],
  lavanderia: ['#d3e3ec', '#bcd1dd'],
  copa: ['#ece5d8', '#d6ccb9'],
  cozinha: ['#ece5d8', '#d6ccb9'],
  coordenacao: ['#d9d0e8', '#c6bbdb'],
  biblioteca: ['#b98a5b', '#a17448'],
  leitura: ['#c39463', '#a97c4f'],
  professores: ['#d9d0e8', '#c6bbdb'],
}

/** Número pseudoaleatório fixo por posição (o desenho é sempre o mesmo). */
function sorte(x: number, y: number, k = 0): number {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function circulo(pinta: Pinta, cx: number, cy: number, r: number, cor: string) {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.round(Math.sqrt(r * r - dy * dy))
    pinta(cx - w, cy + dy, w * 2, 1, cor)
  }
}

function elipse(pinta: Pinta, cx: number, cy: number, rx: number, ry: number, cor: string) {
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)))
    pinta(cx - w, cy + dy, w * 2, 1, cor)
  }
}

// --- chãos -------------------------------------------------------------------
function chaoXadrez(pinta: Pinta, x: number, y: number, base: string, junta: string, lado = 8) {
  pinta(x, y, TILE, TILE, base)
  for (let k = 0; k < TILE; k += lado) {
    pinta(x + k + lado - 1, y, 1, TILE, junta)
    pinta(x, y + k + lado - 1, TILE, 1, junta)
  }
}

function grama(pinta: Pinta, tx: number, ty: number) {
  const x = tx * TILE
  const y = ty * TILE
  pinta(x, y, TILE, TILE, COR.grama)
  for (let k = 0; k < 4; k++) {
    const a = sorte(tx, ty, k)
    const b = sorte(tx, ty, k + 9)
    const cx = x + Math.floor(a * 14) + 1
    const cy = y + Math.floor(b * 13) + 1
    pinta(cx, cy, 1, 2, k % 2 ? COR.gramaEscura : COR.gramaClara)
    pinta(cx + 1, cy + 1, 1, 1, COR.gramaEscura)
  }
  if (sorte(tx, ty, 77) > 0.86) {
    // florzinha
    const cx = x + 4 + Math.floor(sorte(tx, ty, 5) * 8)
    const cy = y + 4 + Math.floor(sorte(tx, ty, 6) * 8)
    const cor = sorte(tx, ty, 8) > 0.5 ? '#fbbf24' : '#f9a8d4'
    pinta(cx - 1, cy, 3, 1, cor)
    pinta(cx, cy - 1, 1, 3, cor)
    pinta(cx, cy, 1, 1, '#fff7d6')
  }
}

function piso(pinta: Pinta, tx: number, ty: number) {
  // Lajotas de pátio, em fiadas desencontradas.
  const x = tx * TILE
  const y = ty * TILE
  pinta(x, y, TILE, TILE, COR.piso)
  for (let f = 0; f < 2; f++) {
    const yy = y + f * 8
    pinta(x, yy + 7, TILE, 1, COR.pisoJunta)
    const off = (ty * 2 + f) % 2 ? 4 : 12
    pinta(x + off, yy, 1, 7, COR.pisoJunta)
  }
  if (sorte(tx, ty, 3) > 0.8) pinta(x + 3 + Math.floor(sorte(tx, ty, 4) * 9), y + 3, 2, 1, '#e8dab8')
}

function degraus(pinta: Pinta, x: number, y: number, w: number, h: number, sobe: boolean) {
  pinta(x, y, w, h, COR.degrau)
  for (let k = 0; k < h; k += 4) {
    pinta(x, y + k, w, 1, '#d8d3c9')
    pinta(x, y + k + 3, w, 1, COR.degrauSombra)
  }
  // sombra que escurece para o lado que desce
  const passos = Math.floor(h / 4)
  for (let k = 0; k < passos; k++) {
    const a = sobe ? k / passos : 1 - k / passos
    pinta(x, y + k * 4, w, 4, `rgba(40, 36, 60, ${(0.28 * a).toFixed(3)})`)
  }
  // corrimãos
  pinta(x, y, 2, h, '#6b6f86')
  pinta(x + w - 2, y, 2, h, '#6b6f86')
}

function seta(pinta: Pinta, cx: number, cy: number, cima: boolean, cor: string) {
  for (let k = 0; k < 5; k++) {
    const yy = cima ? cy - 4 + k : cy + 4 - k
    pinta(cx - k, yy, k * 2 + 1, 1, cor)
  }
  pinta(cx - 1, cima ? cy + 1 : cy - 6, 3, 6, cor)
}

// --- paredes -----------------------------------------------------------------
function parede(pinta: Pinta, g: Tile[][], tx: number, ty: number) {
  const x = tx * TILE
  const y = ty * TILE
  const abaixo = g[ty + 1]?.[tx]
  const face = abaixo !== undefined && abaixo !== '#' && abaixo !== '.' && abaixo !== 'e' && abaixo !== 'g' && abaixo !== 'a'
  if (face) {
    pinta(x, y, TILE, 5, COR.paredeTopo)
    pinta(x, y, TILE, 1, COR.paredeTopoLuz)
    pinta(x, y + 5, TILE, 11, COR.paredeFace)
    pinta(x, y + 5, TILE, 1, COR.paredeFaceSombra)
    pinta(x, y + 14, TILE, 2, COR.rodape)
  } else {
    pinta(x, y, TILE, TILE, COR.paredeTopo)
    if (g[ty - 1]?.[tx] !== '#') pinta(x, y, TILE, 1, COR.paredeTopoLuz)
  }
}

function porta(pinta: Pinta, x: number, y: number, aberta: boolean, chao: string) {
  pinta(x, y, TILE, 5, COR.paredeTopo)
  pinta(x, y, TILE, 1, COR.paredeTopoLuz)
  if (aberta) {
    pinta(x + 2, y + 5, 12, 11, chao)
    pinta(x + 2, y + 5, 12, 2, 'rgba(0,0,0,0.18)')
    pinta(x, y + 4, 2, 12, COR.madeiraEscura)
    pinta(x + 14, y + 4, 2, 12, COR.madeiraEscura)
    pinta(x, y + 4, TILE, 2, COR.madeiraEscura)
    // folha da porta encostada na parede
    pinta(x + 2, y + 6, 2, 10, COR.madeiraClara)
  } else {
    pinta(x, y + 4, TILE, 12, COR.madeiraEscura)
    pinta(x + 2, y + 6, 12, 10, COR.madeira)
    pinta(x + 3, y + 7, 10, 3, COR.madeiraClara)
    pinta(x + 3, y + 11, 10, 4, COR.madeiraClara)
    pinta(x + 11, y + 11, 2, 2, '#e2c46a')
  }
}

// --- móveis ------------------------------------------------------------------
function quadroNaParede(pinta: Pinta, x: number, y: number, w: number, cor: string) {
  // y é o topo da face da parede
  pinta(x, y + 1, w, 8, '#7d6a52')
  pinta(x + 1, y + 2, w - 2, 6, cor)
}

function moveis(pinta: Pinta, sala: Sala) {
  const px = sala.x * TILE
  const py = sala.y * TILE
  const pw = sala.w * TILE
  const ph = sala.h * TILE
  const face = py - 11
  switch (sala.tipo) {
    case 'sala': {
      quadroNaParede(pinta, px + 40, face, 56, '#2e6a50')
      pinta(px + 46, face + 4, 10, 1, '#cfe8da')
      pinta(px + 60, face + 5, 14, 1, '#cfe8da')
      // mesa do professor
      pinta(px + 48, py + 6, 28, 10, COR.madeira)
      pinta(px + 48, py + 6, 28, 3, COR.madeiraClara)
      // computador do professor em cima do birô: de frente para ele, o aluno vê só as costas do monitor
      pinta(px + 56, py + 6, 12, 8, '#262b40')
      pinta(px + 61, py + 10, 2, 1, '#8d93a8')
      // cadeira do professor: atrás do birô, entre o birô e o quadro
      pinta(px + 58, py + 1, 9, 5, '#3c4a6e')
      // carteiras
      const cols = Math.floor((pw - 8) / 34)
      for (let r = 0; r < 3; r++) for (let c = 0; c < cols; c++) {
        const x = px + 10 + c * 34
        const y = py + 30 + r * 21
        if (y + 16 > py + ph) continue
        pinta(x, y, 18, 7, '#c99560')
        pinta(x, y + 5, 18, 2, '#9c6e40')
        pinta(x + 4, y + 9, 10, 5, '#3f5d99')
        pinta(x + 4, y + 13, 10, 2, '#2c4374')
      }
      break
    }
    case 'lab':
    case 'professores': {
      if (sala.tipo === 'professores') {
        pinta(px + 16, py + 30, pw - 32, 30, COR.madeira)
        pinta(px + 16, py + 30, pw - 32, 4, COR.madeiraClara)
        for (let k = 0; k < 4; k++) {
          pinta(px + 22 + k * 18, py + 22, 10, 6, '#3f5d99')
          pinta(px + 22 + k * 18, py + 62, 10, 6, '#3f5d99')
        }
        pinta(px + 8, face + 2, 16, 8, '#9aa3b5')
        break
      }
      quadroNaParede(pinta, px + 30, face, 52, '#f4f6fa')
      if (pw > 160) quadroNaParede(pinta, px + pw - 90, face, 52, '#f4f6fa')
      // birô do professor, com computador, e a cadeira atrás dele
      pinta(px + pw - 40, py + 8, 34, 12, COR.madeira)
      pinta(px + pw - 40, py + 8, 34, 3, COR.madeiraClara)
      pinta(px + pw - 30, py + 3, 12, 9, '#262b40')
      pinta(px + pw - 25, py + 7, 2, 1, '#8d93a8')
      pinta(px + pw - 27, py + 1, 9, 4, '#3c4a6e')
      for (let r = 0; r < 3; r++) {
        const y = py + 10 + r * 28
        const larg = larguraDaBancada(pw, r)
        pinta(px + 6, y + 6, larg, 8, '#dfe3ea')
        pinta(px + 6, y + 12, larg, 2, '#aab1c0')
        for (let k = 0; k < Math.floor(larg / 24); k++) {
          const x = px + 12 + k * 24
          pinta(x, y, 13, 9, '#262b40')
          pinta(x + 1, y + 1, 11, 6, k % 2 ? '#3ad1e6' : '#6fe3f2')
          pinta(x + 5, y + 9, 3, 2, '#262b40')
          pinta(x + 2, y + 16, 9, 6, '#4c4f63')
        }
      }
      break
    }
    case 'cad': {
      quadroNaParede(pinta, px + 24, face, 64, '#f4f6fa')
      pinta(px + 30, face + 3, 18, 4, '#5b8def')
      pinta(px + 52, face + 4, 22, 1, '#5b8def')
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const x = px + 8 + c * 34
        const y = py + 14 + r * 38
        // prancheta inclinada com desenho técnico
        pinta(x, y, 26, 18, '#9aa3b5')
        pinta(x + 1, y + 1, 24, 15, '#f3efe4')
        pinta(x + 4, y + 4, 12, 1, '#5b8def')
        pinta(x + 4, y + 4, 1, 8, '#5b8def')
        pinta(x + 4, y + 11, 16, 1, '#5b8def')
        pinta(x + 16, y + 4, 1, 4, '#5b8def')
        pinta(x + 19, y + 6, 3, 3, '#f472b6')
        pinta(x + 6, y + 18, 14, 2, '#6b6f86')
        pinta(x + 9, y + 22, 8, 6, '#4c4f63')
      }
      break
    }
    case 'wc-f':
    case 'wc-m': {
      const n = Math.max(1, Math.floor(pw / 16))
      for (let k = 0; k < n; k++) {
        const x = px + k * 16
        pinta(x + 15, py, 1, 30, '#7fa9bb')
        elipse(pinta, x + 8, py + 10, 4, 5, '#f4f6f8')
        pinta(x + 4, py + 2, 8, 4, '#dde3ea')
        circulo(pinta, x + 8, py + 11, 2, '#c7d2dc')
      }
      pinta(px, py + 30, pw, 2, '#7fa9bb')
      // pias
      for (let k = 0; k < n; k++) {
        const x = px + k * 16
        pinta(x + 3, py + ph - 14, 10, 8, '#f4f6f8')
        pinta(x + 5, py + ph - 12, 6, 4, '#b8c8d6')
      }
      // placa da porta: rosa ou azul
      pinta(px + 2, py + 36, 8, 8, sala.tipo === 'wc-f' ? '#f472b6' : '#60a5fa')
      pinta(px + 5, py + 38, 2, 4, '#ffffff')
      break
    }
    case 'lavanderia': {
      pinta(px + 2, py + 4, 14, 14, '#eef2f6')
      pinta(px + 2, py + 4, 14, 3, '#cdd6e0')
      circulo(pinta, px + 9, py + 12, 4, '#5e7891')
      circulo(pinta, px + 9, py + 12, 2, '#9fd8ea')
      pinta(px + 18, py + 4, 12, 14, '#eef2f6')
      circulo(pinta, px + 24, py + 12, 4, '#5e7891')
      circulo(pinta, px + 24, py + 12, 2, '#9fd8ea')
      pinta(px + 4, py + 40, 24, 14, '#cfd8e3')
      pinta(px + 6, py + 42, 20, 9, '#9fb4c7')
      pinta(px + 6, py + 70, 10, 12, '#4f7fd0')
      pinta(px + 18, py + 74, 8, 8, '#fbbf24')
      break
    }
    case 'copa':
    case 'cozinha': {
      pinta(px, py, pw, 12, '#9aa0ad')
      pinta(px, py, pw, 4, '#c3c8d2')
      pinta(px + 8, py + 3, 12, 6, '#7f8fa3')
      if (sala.tipo === 'cozinha') {
        for (let k = 0; k < 2; k++) {
          const x = px + 40 + k * 30
          pinta(x, py, 24, 16, '#30333f')
          circulo(pinta, x + 6, py + 6, 3, '#55596b')
          circulo(pinta, x + 17, py + 6, 3, '#55596b')
        }
        pinta(px + 8, py + 50, pw - 16, 14, '#c3c8d2')
        break
      }
      pinta(px + 26, py + 1, 12, 7, '#3a3f52')
      pinta(px + 28, py + 3, 6, 3, '#87a2bb')
      pinta(px + pw - 16, py, 14, 26, '#e8edf3')
      pinta(px + pw - 16, py + 10, 14, 1, '#b5bfcc')
      pinta(px + pw - 5, py + 4, 1, 4, '#8f99a8')
      // mesa e cadeiras
      pinta(px + 18, py + 44, 40, 22, COR.madeira)
      pinta(px + 18, py + 44, 40, 4, COR.madeiraClara)
      for (const [cx, cy] of [[22, 36], [44, 36], [22, 68], [44, 68]] as const) {
        pinta(px + cx, py + cy, 10, 6, '#c2410c')
      }
      pinta(px + 34, py + 50, 6, 6, '#f4f6f8')
      pinta(px + 35, py + 51, 4, 2, '#7c4a2a')
      break
    }
    case 'coordenacao': {
      pinta(px + 8, py + 8, Math.min(40, pw - 22), 12, COR.madeira)
      pinta(px + 8, py + 8, Math.min(40, pw - 22), 3, COR.madeiraClara)
      pinta(px + 14, py + 2, 12, 9, '#262b40')
      pinta(px + 19, py + 6, 2, 1, '#8d93a8')
      // cadeira do professor, atrás da mesa
      pinta(px + 8 + Math.min(40, pw - 22) - 14, py + 1, 9, 5, '#3c4a6e')
      // armário
      pinta(px + pw - 16, py + 2, 14, 24, '#7d8597')
      for (let k = 0; k < 3; k++) {
        pinta(px + pw - 15, py + 4 + k * 8, 12, 6, '#9aa2b3')
        pinta(px + pw - 11, py + 6 + k * 8, 4, 1, '#5b6273')
      }
      // planta
      pinta(px + 4, py + ph - 14, 10, 10, '#a0522d')
      circulo(pinta, px + 9, py + ph - 18, 6, '#3f8f45')
      circulo(pinta, px + 8, py + ph - 20, 3, '#5fb35f')
      // cadeiras de visita
      pinta(px + 22, py + 46, 10, 8, '#7a5cc2')
      if (pw > 60) pinta(px + 38, py + 46, 10, 8, '#7a5cc2')
      // sofazinho e banquinho para esperar
      pinta(px + pw - 36, py + ph - 24, 30, 16, '#5b3fa0')
      pinta(px + pw - 36, py + ph - 24, 30, 5, '#7a5cc2')
      pinta(px + pw - 36, py + ph - 24, 4, 16, '#7a5cc2')
      pinta(px + pw - 10, py + ph - 24, 4, 16, '#7a5cc2')
      pinta(px + 6, py + 54, 9, 8, '#c2410c')
      pinta(px + 6, py + 54, 9, 3, '#e8703a')
      if (pw > 120) {
        for (let k = 0; k < 4; k++) {
          pinta(px + 70 + k * 36, py + 10, 26, 12, COR.madeira)
          pinta(px + 76 + k * 36, py + 24, 10, 6, '#3f5d99')
        }
      }
      break
    }
    case 'biblioteca': {
      const lombadas = ['#e05252', '#3e7bf0', '#fbbf24', '#22a06b', '#a78bfa', '#f472b6', '#e8edf3', '#c2410c']
      for (let r = 0; r < 3; r++) {
        const y = py + 6 + r * 30
        const x = px + 6
        const w = 82
        pinta(x, y, w, 14, COR.madeiraEscura)
        pinta(x + 1, y + 1, w - 2, 12, '#4a311b')
        for (let k = 0; k < w - 4; k += 3) {
          const cor = lombadas[Math.floor(sorte(k, r, 1) * lombadas.length)] ?? '#e05252'
          const alto = 8 + Math.floor(sorte(k, r, 2) * 4)
          pinta(x + 2 + k, y + 13 - alto, 2, alto, cor)
        }
        pinta(x, y + 13, w, 2, COR.madeira)
      }
      // mesas de leitura
      pinta(px + 100, py + 22, 48, 20, COR.madeira)
      pinta(px + 100, py + 22, 48, 3, COR.madeiraClara)
      pinta(px + 100, py + 58, 48, 20, COR.madeira)
      pinta(px + 100, py + 58, 48, 3, COR.madeiraClara)
      for (let k = 0; k < 3; k++) {
        pinta(px + 104 + k * 15, py + 14, 9, 6, '#22a06b')
        pinta(px + 104 + k * 15, py + 44, 9, 6, '#22a06b')
        pinta(px + 104 + k * 15, py + 80, 9, 6, '#22a06b')
      }
      // livros abertos nas mesas
      pinta(px + 108, py + 28, 10, 6, '#f8f4ea')
      pinta(px + 113, py + 28, 1, 6, '#c9c0ad')
      pinta(px + 130, py + 64, 10, 6, '#f8f4ea')
      pinta(px + 135, py + 64, 1, 6, '#c9c0ad')
      break
    }
    case 'leitura': {
      pinta(px + 8, py + 18, pw - 16, ph - 30, '#8e80e0')
      pinta(px + 10, py + 20, pw - 20, ph - 34, '#6f5fc7')
      for (let k = 0; k < pw - 24; k += 6) pinta(px + 12 + k, py + 22, 2, 1, '#8e80e0')
      circulo(pinta, px + 26, py + 40, 9, '#f472b6')
      circulo(pinta, px + 24, py + 38, 4, '#f9a8d4')
      circulo(pinta, px + 66, py + 46, 9, '#fbbf24')
      circulo(pinta, px + 64, py + 44, 4, '#fde68a')
      circulo(pinta, px + 44, py + 66, 9, '#22d3ee')
      circulo(pinta, px + 42, py + 64, 4, '#a5f3fc')
      // estante baixa
      pinta(px + 4, py + 2, 36, 10, COR.madeiraEscura)
      for (let k = 0; k < 32; k += 3) pinta(px + 6 + k, py + 4, 2, 6, ['#e05252', '#3e7bf0', '#fbbf24', '#22a06b'][k % 4] ?? '#e05252')
      // planta
      pinta(px + pw - 14, py + 4, 10, 10, '#a0522d')
      circulo(pinta, px + pw - 9, py + 2, 7, '#3f8f45')
      circulo(pinta, px + pw - 10, py, 3, '#5fb35f')
      break
    }
  }
}

function arvore(pinta: Pinta, tx: number, ty: number, noite: boolean) {
  const cx = tx * TILE + 8
  const cy = ty * TILE + 8
  elipse(pinta, cx, cy + 6, 9, 3, 'rgba(0,0,0,0.22)')
  pinta(cx - 2, cy - 2, 4, 9, '#6b4a2e')
  circulo(pinta, cx, cy - 8, 12, noite ? '#2c5e33' : '#3f8f45')
  circulo(pinta, cx - 3, cy - 11, 8, noite ? '#3b7340' : '#57a95a')
  circulo(pinta, cx - 5, cy - 13, 3, noite ? '#4a8550' : '#7cc66f')
  pinta(cx + 5, cy - 5, 2, 2, '#e05252')
  pinta(cx - 7, cy - 4, 2, 2, '#e05252')
}

function banco(pinta: Pinta, tx: number, ty: number, w: number) {
  const x = tx * TILE + 1
  const y = ty * TILE + 4
  const largura = w * TILE - 2
  if (w === 1) {
    // banco em pé (encostado na parede da faixa)
    pinta(x + 3, y - 4, 9, 14, '#7d5530')
    for (let k = 0; k < 3; k++) pinta(x + 4, y - 3 + k * 4, 7, 3, '#a0703f')
    return
  }
  pinta(x, y + 8, largura, 2, 'rgba(0,0,0,0.2)')
  pinta(x + 2, y + 6, 2, 4, '#5a3d22')
  pinta(x + largura - 4, y + 6, 2, 4, '#5a3d22')
  pinta(x, y, largura, 7, '#7d5530')
  for (let k = 0; k < 3; k++) pinta(x + 1, y + 1 + k * 2, largura - 2, 1, '#a0703f')
}

/**
 * Desenha um andar inteiro. As salas inativas ficam escuras; o resto do
 * andar de cima (onde não há piso) mostra o chão lá embaixo, mais escuro.
 */
export function desenharAndar(andar: Andar, pinta: Pinta): void {
  const g = montarGrade(andar)
  const salas = salasDo(andar)
  const salaEm = (tx: number, ty: number) => salas.find((sl) => tx >= sl.x && tx < sl.x + sl.w && ty >= sl.y && ty < sl.y + sl.h)
  const salaDaPorta = (tx: number, ty: number) => salas.find((sl) => {
    const [x, y] = portaDa(sl)
    return x === tx && y === ty
  })

  // 1) chãos
  for (let ty = 0; ty < ALTURA_MAPA; ty++) for (let tx = 0; tx < LARGURA_MAPA; tx++) {
    const t = g[ty]?.[tx] ?? '.'
    const x = tx * TILE
    const y = ty * TILE
    switch (t) {
      case '.':
      case 'g':
      case 'a':
        grama(pinta, tx, ty)
        break
      case 'e':
        // o que se vê lá embaixo: a faixa coberta da esquerda ou a grama
        if (tx < 8 && ty >= 12 && ty <= 36) chaoXadrez(pinta, x, y, COR.calcada, COR.calcadaJunta, 16)
        else grama(pinta, tx, ty)
        pinta(x, y, TILE, TILE, 'rgba(8, 10, 26, 0.55)')
        break
      case 'c':
      case 'x':
        chaoXadrez(pinta, x, y, COR.corredor, COR.corredorJunta)
        break
      case 'p':
      case 'b':
        if (tx < 8) chaoXadrez(pinta, x, y, COR.calcada, COR.calcadaJunta, 16)
        else piso(pinta, tx, ty)
        break
      case 'f':
        chaoXadrez(pinta, x, y, COR.calcada, COR.calcadaJunta, 16)
        break
      case 'n':
        chaoXadrez(pinta, x, y, COR.concreto, COR.concretoJunta, 16)
        break
      case 'w':
        chaoXadrez(pinta, x, y, COR.corredor, COR.corredorJunta)
        break
      case 'v':
        piso(pinta, tx, ty)
        pinta(x, y, TILE, TILE, 'rgba(8, 10, 26, 0.45)')
        break
      case 'r':
      case 'o': {
        const sl = salaEm(tx, ty)
        const [base, junta] = PISOS[sl?.tipo ?? 'sala']
        if (sl?.tipo === 'biblioteca' || sl?.tipo === 'leitura') {
          pinta(x, y, TILE, TILE, base)
          pinta(x, y + ((tx % 2) ? 5 : 11), TILE, 1, junta)
          pinta(x + TILE - 1, y, 1, TILE, junta)
        } else chaoXadrez(pinta, x, y, base, junta, sl?.tipo === 'wc-f' || sl?.tipo === 'wc-m' ? 4 : 8)
        break
      }
      case 's':
      case 'd':
      case '#':
        chaoXadrez(pinta, x, y, COR.corredor, COR.corredorJunta)
        break
    }
  }

  // 2) escadas
  for (const e of ESCADAS) {
    if (e.andar !== andar) continue
    const x = e.x * TILE
    const y = e.y * TILE
    const w = e.w * TILE
    const h = e.h * TILE
    if (andar === 'superior' && e.id === 'meio-s') {
      // vão da escada na passarela, com guarda-corpo dos lados
      degraus(pinta, x, y, w, h, false)
      pinta(x - 3, y - 2, 3, h + 2, '#59607a')
      pinta(x + w, y - 2, 3, h + 2, '#59607a')
      pinta(x - 3, y + h, w + 6, 3, '#59607a')
      seta(pinta, x + w / 2, y + h / 2, false, 'rgba(255,255,255,0.75)')
    } else {
      degraus(pinta, x, y, w, h, andar === 'terreo')
      seta(pinta, x + w / 2, y + h / 2, andar === 'terreo', 'rgba(255,255,255,0.75)')
    }
  }

  // 3) paredes, portas e portões
  for (let ty = 0; ty < ALTURA_MAPA; ty++) for (let tx = 0; tx < LARGURA_MAPA; tx++) {
    const t = g[ty]?.[tx]
    const x = tx * TILE
    const y = ty * TILE
    if (t === '#') parede(pinta, g, tx, ty)
    else if (t === 'd') {
      const sl = salaDaPorta(tx, ty)
      if (sl) {
        const piso0 = PISOS[sl.tipo][0]
        porta(pinta, x, y, sl.ativa, sl.porta === 'norte' ? piso0 : COR.corredor)
      } else {
        // passagem sempre aberta (sem folha)
        pinta(x, y, TILE, 5, COR.paredeTopo)
        pinta(x, y + 5, TILE, 11, COR.calcada)
        pinta(x, y + 5, TILE, 2, 'rgba(0,0,0,0.15)')
      }
    } else if (t === 'x') {
      pinta(x, y, TILE, TILE, 'rgba(59,63,85,0.25)')
      for (let k = 1; k < TILE; k += 4) pinta(x + 6, y + k, 4, 2, COR.ferro)
      pinta(x + 7, y, 2, TILE, COR.ferro)
    }
  }

  // 4) móveis das salas
  for (const sala of salas) moveis(pinta, sala)

  // 5) pátio: sol, árvores e bancos (térreo); guarda-corpo (andar de cima)
  if (andar === 'terreo') {
    pinta(8 * TILE, 19 * TILE, 16 * TILE, 11 * TILE, COR.sol)
    pinta(36 * TILE, 19 * TILE, 16 * TILE, 11 * TILE, COR.sol)
    // muretas com plantas na ponta direita dos pátios
    pinta(51 * TILE + 4, 19 * TILE, 12, 11 * TILE, '#8a8270')
    for (let k = 0; k < 11; k++) circulo(pinta, 51 * TILE + 10, (19 + k) * TILE + 8, 5, k % 2 ? '#3f8f45' : '#57a95a')
    // rampa de entrada pela esquerda
    for (let k = 0; k < 5; k++) pinta(0, (22 + k) * TILE, 6, TILE, k % 2 ? '#b3ac9f' : '#c9c3b7')
    for (let ty = 0; ty < ALTURA_MAPA; ty++) for (let tx = 0; tx < LARGURA_MAPA; tx++) {
      const t = g[ty]?.[tx]
      if (t === 'a') arvore(pinta, tx, ty, false)
    }
    const vistos = new Set<string>()
    for (let ty = 0; ty < ALTURA_MAPA; ty++) for (let tx = 0; tx < LARGURA_MAPA; tx++) {
      if (g[ty]?.[tx] !== 'b' || vistos.has(`${tx},${ty}`)) continue
      let w = 1
      while (g[ty]?.[tx + w] === 'b') {
        vistos.add(`${tx + w},${ty}`)
        w++
      }
      banco(pinta, tx, ty, Math.min(w, 2))
    }
    // muretas da escada do meio
    pinta(26 * TILE + 10, 21 * TILE, 6, 7 * TILE, '#8f897e')
    pinta(33 * TILE, 21 * TILE, 6, 7 * TILE, '#8f897e')
  } else {
    // guarda-corpo dos vazios, colado na passarela e nos blocos
    const grade = (x: number, y: number, w: number, h: number) => {
      pinta(x, y, w, h, '#59607a')
      if (w > h) for (let k = 0; k < w; k += 8) pinta(x + k, y - 2, 2, h + 4, '#3d4258')
      else for (let k = 0; k < h; k += 8) pinta(x - 2, y + k, w + 4, 2, '#3d4258')
    }
    grade(8 * TILE, 19 * TILE, 17 * TILE, 3)
    grade(8 * TILE, 30 * TILE - 3, 17 * TILE, 3)
    grade(25 * TILE - 3, 19 * TILE, 3, 11 * TILE)
    grade(35 * TILE, 19 * TILE, 17 * TILE, 3)
    grade(35 * TILE, 30 * TILE - 3, 17 * TILE, 3)
    grade(35 * TILE, 19 * TILE, 3, 11 * TILE)
    // telhado da passarela: sombra nas bordas
    pinta(25 * TILE, 11 * TILE, 3, 27 * TILE, 'rgba(0,0,0,0.12)')
    pinta(35 * TILE - 3, 11 * TILE, 3, 27 * TILE, 'rgba(0,0,0,0.12)')
    // árvores do térreo vistas de cima
    for (const [tx, ty] of ARVORES) if (tx > 51 || (ty >= 19 && ty <= 29)) arvore(pinta, tx, ty, true)
  }

  // 6) salas inativas ficam escuras (com as paredes de volta e a porta)
  for (const sala of salas) {
    if (sala.ativa) continue
    pinta((sala.x - 1) * TILE, (sala.y - 1) * TILE + 5, (sala.w + 2) * TILE, (sala.h + 1) * TILE - 5, COR.escuro)
    const [dx, dy] = portaDa(sala)
    pinta(dx * TILE, dy * TILE + 5, TILE, 11, 'rgba(8, 10, 26, 0.35)')
  }
}

/** Centro de cada sala, em pixels, para escrever o nome por cima. */
export function centroDa(sala: Sala): [number, number] {
  return [(sala.x + sala.w / 2) * TILE, (sala.y + sala.h / 2) * TILE]
}

// -----------------------------------------------------------------------------
// Móveis que barram o boneco e lugares para sentar (mesmas medidas do desenho)
// -----------------------------------------------------------------------------
export type DirecaoAssento = 'baixo' | 'cima' | 'esquerda' | 'direita'

export interface Assento {
  id: string
  /** Posição dos pés quando sentado, em pixels do mapa. */
  x: number
  y: number
  direcao: DirecaoAssento
  /** Cadeira atrás do birô: só o professor senta. */
  professor?: boolean
}

export interface LayoutDaSala {
  /** Retângulos [x, y, largura, altura] em pixels do mapa. */
  solidos: [number, number, number, number][]
  assentos: Assento[]
}

/** Largura da bancada de cada fila do laboratório: a primeira cede lugar ao birô do professor. */
function larguraDaBancada(pw: number, fila: number): number {
  return pw - 12 - (fila === 0 ? 40 : 0)
}

export function layoutDaSala(sala: Sala): LayoutDaSala {
  const px = sala.x * TILE
  const py = sala.y * TILE
  const pw = sala.w * TILE
  const ph = sala.h * TILE
  const solidos: LayoutDaSala['solidos'] = []
  const assentos: Assento[] = []
  const lugar = (x: number, y: number, direcao: DirecaoAssento) => assentos.push({ id: `${sala.id}-${assentos.length}`, x, y, direcao })
  // A cadeira do professor vem sempre por último: os números das outras não mudam.
  const lugarDoProfessor = (x: number, y: number) => assentos.push({ id: `${sala.id}-prof`, x, y, direcao: 'baixo', professor: true })
  switch (sala.tipo) {
    case 'sala': {
      solidos.push([px + 48, py + 6, 28, 10])
      const cols = Math.floor((pw - 8) / 34)
      for (let r = 0; r < 3; r++) for (let c = 0; c < cols; c++) {
        const x = px + 10 + c * 34
        const y = py + 30 + r * 21
        if (y + 16 > py + ph) continue
        solidos.push([x, y, 18, 7])
        lugar(x + 9, y + 15, 'cima')
      }
      lugarDoProfessor(px + 62, py + 5)
      break
    }
    case 'lab': {
      for (let r = 0; r < 3; r++) {
        const y = py + 10 + r * 28
        const larg = larguraDaBancada(pw, r)
        solidos.push([px + 6, y, larg, 14])
        for (let k = 0; k < Math.floor(larg / 24); k++) lugar(px + 12 + k * 24 + 6, y + 22, 'cima')
      }
      solidos.push([px + pw - 40, py + 8, 34, 12])
      lugarDoProfessor(px + pw - 23, py + 5)
      break
    }
    case 'cad': {
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const x = px + 8 + c * 34
        const y = py + 14 + r * 38
        solidos.push([x, y, 26, 20])
        lugar(x + 13, y + 28, 'cima')
      }
      break
    }
    case 'biblioteca': {
      for (let r = 0; r < 3; r++) solidos.push([px + 6, py + 6 + r * 30, 82, 14])
      solidos.push([px + 100, py + 22, 48, 20], [px + 100, py + 58, 48, 20])
      for (let k = 0; k < 3; k++) {
        const x = px + 108 + k * 15
        lugar(x, py + 21, 'baixo')
        lugar(x, py + 50, 'cima')
        lugar(x, py + 86, 'cima')
      }
      break
    }
    case 'leitura': {
      solidos.push([px + 4, py + 2, 36, 10])
      lugar(px + 26, py + 44, 'baixo')
      lugar(px + 66, py + 50, 'baixo')
      lugar(px + 44, py + 70, 'baixo')
      break
    }
    case 'coordenacao': {
      solidos.push([px + 8, py + 8, Math.min(40, pw - 22), 12], [px + pw - 16, py + 2, 14, 26], [px + 4, py + ph - 14, 10, 10])
      lugar(px + 27, py + 54, 'cima')
      if (pw > 60) lugar(px + 43, py + 54, 'cima')
      lugar(px + pw - 28, py + ph - 10, 'baixo')
      lugar(px + pw - 16, py + ph - 10, 'baixo')
      lugar(px + 10, py + 62, 'direita')
      lugarDoProfessor(px + 8 + Math.min(40, pw - 22) - 10, py + 5)
      break
    }
    case 'copa': {
      solidos.push([px, py, pw, 12], [px + pw - 16, py, 14, 26], [px + 18, py + 44, 40, 22])
      lugar(px + 27, py + 42, 'baixo')
      lugar(px + 49, py + 42, 'baixo')
      lugar(px + 27, py + 74, 'cima')
      lugar(px + 49, py + 74, 'cima')
      break
    }
    case 'wc-f':
    case 'wc-m':
      solidos.push([px, py, pw, 32])
      break
    default:
      break
  }
  return { solidos, assentos }
}
