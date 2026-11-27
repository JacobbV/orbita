// =============================================================================
// Arte do avatar do Órbita: pixel art original, todos os direitos reservados
// (veja LICENCA-ARTE.md). Cada peça é uma lista de retângulos numa grade de
// 48×52. As cores "p", "ps", "c" e "cs" mudam com o tom de pele e a cor do
// cabelo escolhidos. Este arquivo não importa nada, para que o script da folha
// de prévia também consiga usá-lo.
// =============================================================================

export const LADO = 48
export const ALTURA = 52

/** [x, y, largura, altura, cor] */
export type Ret = readonly [number, number, number, number, string]

export type Camada = 'corpo' | 'pele' | 'rosto' | 'cabelo' | 'cor-do-cabelo' | 'roupa' | 'acessorio'
export type Para = 'aluno' | 'professor' | 'ninja' | 'todos'

export type Escolhas = Partial<Record<Camada, string>>

type Corpo = { tronco: [number, number]; braco: number }

export interface Peca {
  id: string
  camada: Camada
  nome: string
  para: Para
  xpMinimo: number
  desenho?: (corpo: Corpo) => Ret[]
  cores?: Record<string, string>
}

const CONTORNO = '#0b0e1c'
const OLHO = '#1b1f33'
const BOCA = '#a8484f'
const BRANCO = '#f4f6fb'

// Modo Ninja do professor: tecido escuro e faixa vermelha.
const NINJA = '#232a3d'
const NINJA_SOMBRA = '#161b2a'
const NINJA_LUZ = '#3a4562'
const FAIXA = '#d23b43'
const FAIXA_SOMBRA = '#9c2930'
const METAL = '#c9ccd6'
const METAL_SOMBRA = '#8e92a6'

// -----------------------------------------------------------------------------
// Corpo: cabeça, pescoço, braços, calça e tênis. Três larguras de tronco.
// -----------------------------------------------------------------------------
const CORPOS_PADRAO: Corpo = { tronco: [16, 31], braco: 3 }

const CORPOS: Record<string, Corpo> = {
  'corpo-estreito': { tronco: [17, 30], braco: 3 },
  'corpo-medio': { tronco: [16, 31], braco: 3 },
  'corpo-largo': { tronco: [15, 32], braco: 4 },
}

function desenharCorpo(c: Corpo): Ret[] {
  const [t0, t1] = c.tronco
  const largura = t1 - t0 + 1
  const be = t0 - c.braco - 1
  const bd = t1 + 2
  return [
    // cabeça arredondada e orelhas
    [18, 8, 12, 1, 'p'], [17, 9, 14, 12, 'p'], [18, 21, 12, 1, 'p'],
    [16, 14, 1, 3, 'p'], [31, 14, 1, 3, 'p'],
    [17, 20, 14, 1, 'ps'],
    // pescoço
    [21, 22, 6, 2, 'ps'],
    // tronco (camiseta lisa por baixo da roupa)
    [t0, 24, largura, 14, '#3b4466'],
    // braços e mãos
    [be, 24, c.braco, 12, 'p'], [bd, 24, c.braco, 12, 'p'],
    [t0 - 1, 24, 1, 2, 'p'], [t1 + 1, 24, 1, 2, 'p'],
    [be, 36, c.braco, 2, 'ps'], [bd, 36, c.braco, 2, 'ps'],
    // calça
    [t0 + 1, 38, largura - 2, 2, '#26304f'],
    [17, 40, 6, 8, '#26304f'], [25, 40, 6, 8, '#26304f'],
    [22, 40, 1, 8, '#1d2540'], [30, 40, 1, 8, '#1d2540'],
    // tênis
    [16, 48, 7, 1, BRANCO], [25, 48, 7, 1, BRANCO],
    [16, 49, 7, 1, '#5b6280'], [25, 49, 7, 1, '#5b6280'],
  ]
}

// -----------------------------------------------------------------------------
// Tons de pele e cores de cabelo (base e sombra)
// -----------------------------------------------------------------------------
const PELES: [string, string, string][] = [
  ['pele-1', '#ffe0c7', '#efc3a3'],
  ['pele-2', '#f6cfa8', '#e2b088'],
  ['pele-3', '#e8b48a', '#d0976d'],
  ['pele-4', '#d69e6e', '#bb8256'],
  ['pele-5', '#b97f51', '#9c663d'],
  ['pele-6', '#9a6440', '#7f4f31'],
  ['pele-7', '#7a4b2e', '#623a22'],
  ['pele-8', '#5a3620', '#462917'],
]

const CORES_CABELO: [string, string, string, string][] = [
  ['cabelo-preto', 'Preto', '#2a2230', '#17121c'],
  ['cabelo-castanho', 'Castanho', '#6b4027', '#4d2c1a'],
  ['cabelo-loiro', 'Loiro', '#e8c15a', '#c79b37'],
  ['cabelo-ruivo', 'Ruivo', '#c4502a', '#99391b'],
  ['cabelo-grisalho', 'Grisalho', '#b9bccb', '#8e92a6'],
  ['cabelo-azul', 'Azul galáctico', '#3e7bf0', '#2a55b3'],
]

// -----------------------------------------------------------------------------
// Rostos
// -----------------------------------------------------------------------------
const NARIZ: Ret = [24, 16, 1, 1, 'ps']

function olhos(esqFechado = false): Ret[] {
  const esq: Ret[] = esqFechado
    ? [[20, 15, 2, 1, OLHO]]
    : [[20, 14, 2, 2, OLHO], [20, 14, 1, 1, BRANCO]]
  return [...esq, [26, 14, 2, 2, OLHO], [26, 14, 1, 1, BRANCO]]
}

const SORRISO: Ret[] = [[22, 18, 4, 1, BOCA], [21, 17, 1, 1, BOCA], [26, 17, 1, 1, BOCA]]
const SOBRANCELHAS: Ret[] = [[19, 12, 3, 1, 'cs'], [26, 12, 3, 1, 'cs']]
const BOCHECHAS: Ret[] = [[19, 17, 1, 1, '#e98f86'], [28, 17, 1, 1, '#e98f86']]

const OCULOS_GRANDES: Ret[] = [
  [18, 13, 5, 1, OLHO], [18, 16, 5, 1, OLHO], [18, 13, 1, 4, OLHO], [22, 13, 1, 4, OLHO],
  [25, 13, 5, 1, OLHO], [25, 16, 5, 1, OLHO], [25, 13, 1, 4, OLHO], [29, 13, 1, 4, OLHO],
  [23, 14, 2, 1, OLHO], [17, 14, 1, 1, OLHO], [30, 14, 1, 1, OLHO],
  [19, 14, 3, 2, '#bfe6f5'], [26, 14, 3, 2, '#bfe6f5'],
  [20, 14, 2, 2, OLHO], [26, 14, 2, 2, OLHO], [21, 14, 1, 1, BRANCO], [27, 14, 1, 1, BRANCO],
]

const BARBA: Ret[] = [
  [17, 13, 1, 5, 'c'], [30, 13, 1, 5, 'c'],
  [17, 18, 14, 3, 'c'], [18, 21, 12, 1, 'c'], [20, 22, 8, 1, 'cs'],
  [21, 17, 6, 1, 'cs'],
  [22, 18, 4, 1, BOCA],
]

// Máscara ninja: cobre nariz e boca, deixa os olhos e a testa de fora.
const MASCARA_NINJA: Ret[] = [
  [19, 12, 3, 1, 'cs'], [26, 12, 3, 1, 'cs'], [21, 13, 1, 1, 'cs'], [26, 13, 1, 1, 'cs'],
  ...olhos(),
  [17, 16, 14, 5, NINJA], [18, 21, 12, 1, NINJA], [17, 16, 14, 1, NINJA_LUZ],
  [20, 19, 8, 1, NINJA_SOMBRA], [24, 17, 1, 2, NINJA_SOMBRA],
]

// -----------------------------------------------------------------------------
// Cabelos (por cima do rosto)
// -----------------------------------------------------------------------------
const CURTO: Ret[] = [
  [19, 6, 10, 1, 'c'], [18, 7, 12, 1, 'c'], [17, 8, 14, 4, 'c'],
  [17, 12, 2, 3, 'c'], [29, 12, 2, 3, 'c'],
  [20, 12, 3, 1, 'cs'], [17, 15, 1, 1, 'cs'], [30, 15, 1, 1, 'cs'],
]

function desenharCabelo(id: string): Ret[] {
  switch (id) {
    case 'cabelo-curto':
      return CURTO
    case 'cabelo-arrepiado':
      return [
        ...CURTO,
        [18, 4, 2, 3, 'c'], [21, 3, 2, 4, 'c'], [24, 2, 2, 5, 'c'], [27, 3, 2, 4, 'c'],
        [16, 9, 1, 3, 'c'], [31, 9, 1, 3, 'c'],
      ]
    case 'cabelo-franja':
      return [...CURTO, [19, 12, 9, 1, 'c'], [19, 13, 3, 1, 'cs'], [25, 13, 3, 1, 'cs']]
    case 'cabelo-longo':
      return [
        ...CURTO,
        [15, 10, 2, 18, 'c'], [31, 10, 2, 18, 'c'], [17, 15, 1, 8, 'c'], [30, 15, 1, 8, 'c'],
        [15, 26, 2, 2, 'cs'], [31, 26, 2, 2, 'cs'],
      ]
    case 'cabelo-cacheado':
      return [
        [18, 2, 12, 1, 'c'], [16, 3, 16, 1, 'c'], [15, 4, 18, 2, 'c'], [14, 6, 20, 6, 'c'],
        [14, 12, 4, 6, 'c'], [30, 12, 4, 6, 'c'], [15, 18, 2, 1, 'c'], [31, 18, 2, 1, 'c'],
        [16, 5, 2, 1, 'cs'], [21, 4, 2, 1, 'cs'], [27, 5, 2, 1, 'cs'], [18, 8, 2, 1, 'cs'],
        [25, 7, 2, 1, 'cs'], [15, 14, 1, 2, 'cs'], [32, 13, 1, 2, 'cs'],
        [18, 12, 12, 1, 'cs'],
      ]
    case 'cabelo-rabo-de-cavalo':
      return [
        ...CURTO,
        [31, 9, 3, 3, 'cs'], [32, 12, 3, 8, 'c'], [33, 20, 2, 3, 'c'], [34, 23, 1, 1, 'cs'],
      ]
    case 'cabelo-raspado':
      return [[19, 7, 10, 1, 'cs'], [18, 8, 12, 3, 'cs'], [17, 9, 1, 4, 'cs'], [30, 9, 1, 4, 'cs']]
    case 'cabelo-capuz-ninja':
      // Capuz: cobre a cabeça e as orelhas, abre só a janela do rosto.
      return [
        [19, 5, 10, 1, NINJA], [17, 6, 14, 1, NINJA], [16, 7, 16, 5, NINJA],
        [15, 9, 1, 12, NINJA], [32, 9, 1, 12, NINJA],
        [16, 12, 3, 10, NINJA], [29, 12, 3, 10, NINJA], [17, 22, 14, 2, NINJA_SOMBRA],
        [19, 6, 8, 1, NINJA_LUZ], [17, 7, 2, 2, NINJA_LUZ],
        [16, 11, 16, 1, NINJA_SOMBRA], [18, 12, 1, 10, NINJA_SOMBRA], [29, 12, 1, 10, NINJA_SOMBRA],
      ]
    case 'cabelo-coque':
      return [...CURTO, [21, 1, 6, 1, 'c'], [20, 2, 8, 3, 'c'], [21, 5, 6, 1, 'cs'], [22, 2, 2, 1, 'cs']]
    default:
      return []
  }
}

// -----------------------------------------------------------------------------
// Roupas (sobre o tronco e os braços)
// -----------------------------------------------------------------------------
function tronco(c: Corpo, cor: string, mangaAte = 35): Ret[] {
  const [t0, t1] = c.tronco
  const be = t0 - c.braco - 1
  const bd = t1 + 2
  const altura = mangaAte - 24 + 1
  return [
    [t0, 24, t1 - t0 + 1, 14, cor],
    [be, 24, c.braco, altura, cor], [bd, 24, c.braco, altura, cor],
    [t0 - 1, 24, 1, 2, cor], [t1 + 1, 24, 1, 2, cor],
  ]
}

function xadrez(x0: number, x1: number, y0: number, y1: number, a: string, b: string): Ret[] {
  const r: Ret[] = []
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      r.push([x, y, Math.min(2, x1 - x + 1), Math.min(2, y1 - y + 1), ((x - x0 + y - y0) / 2) % 2 === 0 ? a : b])
    }
  }
  return r
}

function desenharRoupa(id: string, c: Corpo): Ret[] {
  const [t0, t1] = c.tronco
  const be = t0 - c.braco - 1
  const bd = t1 + 2
  switch (id) {
    case 'roupa-uniforme':
      return [
        ...tronco(c, '#22c3dd'),
        [t0, 35, t1 - t0 + 1, 3, '#1a9ab0'], [23, 24, 2, 14, '#1a9ab0'],
        [t0, 33, t1 - t0 + 1, 1, '#13758a'],
        [t0 + 2, 26, 3, 2, '#f5c542'],
        [be, 34, c.braco, 2, '#1a9ab0'], [bd, 34, c.braco, 2, '#1a9ab0'],
      ]
    case 'roupa-moletom':
      return [
        ...tronco(c, '#8b5cf6'),
        [20, 23, 8, 2, '#6d3fd6'],
        [t0 + 3, 32, t1 - t0 - 5, 5, '#6d3fd6'],
        [22, 25, 1, 3, BRANCO], [25, 25, 1, 3, BRANCO],
        [be, 34, c.braco, 2, '#6d3fd6'], [bd, 34, c.braco, 2, '#6d3fd6'],
      ]
    case 'roupa-jaqueta-de-piloto':
      return [
        ...tronco(c, '#f08a24'),
        [t0, 35, t1 - t0 + 1, 3, '#c96a12'],
        [19, 24, 10, 2, '#f3e3c3'], [t0 + 1, 24, 3, 2, '#f3e3c3'], [t1 - 3, 24, 3, 2, '#f3e3c3'],
        [23, 26, 2, 12, '#c9ccd6'],
        [t0 + 2, 28, 3, 2, '#3e7bf0'], [t0 + 2, 28, 1, 1, BRANCO],
        [be, 34, c.braco, 2, '#c96a12'], [bd, 34, c.braco, 2, '#c96a12'],
      ]
    case 'roupa-camiseta-estrela':
      return [
        ...tronco(c, '#ec4899', 27),
        [t0, 36, t1 - t0 + 1, 2, '#c42f7a'],
        [23, 26, 2, 1, '#f5c542'], [21, 27, 6, 2, '#f5c542'], [22, 29, 4, 1, '#f5c542'],
        [21, 30, 2, 1, '#f5c542'], [25, 30, 2, 1, '#f5c542'],
        [be, 27, c.braco, 1, '#c42f7a'], [bd, 27, c.braco, 1, '#c42f7a'],
      ]
    case 'roupa-cardiga':
      return [
        ...tronco(c, '#5f7a45'),
        ...xadrez(20, 27, 24, 37, '#b8323a', '#6e1b22'),
        [19, 24, 1, 14, '#4a6035'], [28, 24, 1, 14, '#4a6035'],
        [17, 30, 1, 1, '#d7c79a'], [30, 30, 1, 1, '#d7c79a'], [17, 34, 1, 1, '#d7c79a'], [30, 34, 1, 1, '#d7c79a'],
        [be, 34, c.braco, 2, '#4a6035'], [bd, 34, c.braco, 2, '#4a6035'],
      ]
    case 'roupa-traje-ninja':
      return [
        ...tronco(c, NINJA),
        // gola cruzada
        [20, 24, 2, 1, NINJA_LUZ], [21, 25, 2, 1, NINJA_LUZ], [22, 26, 2, 1, NINJA_LUZ], [23, 27, 2, 1, NINJA_LUZ],
        [26, 24, 2, 1, NINJA_SOMBRA], [25, 25, 2, 1, NINJA_SOMBRA], [24, 26, 2, 1, NINJA_SOMBRA],
        [t0, 28, 1, 5, NINJA_SOMBRA], [t1, 28, 1, 5, NINJA_SOMBRA],
        // faixa da cintura com nó
        [t0, 33, t1 - t0 + 1, 2, FAIXA], [t0, 34, t1 - t0 + 1, 1, FAIXA_SOMBRA],
        [t0 + 2, 35, 2, 3, FAIXA], [t0 + 3, 36, 1, 2, FAIXA_SOMBRA],
        [t0, 35, 2, 3, NINJA_SOMBRA], [t0 + 4, 35, t1 - t0 - 3, 3, NINJA_SOMBRA],
        // punhos enfaixados
        [be, 32, c.braco, 1, NINJA_LUZ], [bd, 32, c.braco, 1, NINJA_LUZ],
        [be, 34, c.braco, 2, NINJA_SOMBRA], [bd, 34, c.braco, 2, NINJA_SOMBRA],
      ]
    case 'roupa-camisa-xadrez':
      return [
        ...tronco(c, '#2f5fb3'),
        ...xadrez(t0, t1, 24, 37, '#2f5fb3', '#1f3f7a'),
        ...xadrez(be, be + c.braco - 1, 24, 35, '#2f5fb3', '#1f3f7a'),
        ...xadrez(bd, bd + c.braco - 1, 24, 35, '#2f5fb3', '#1f3f7a'),
        [20, 24, 3, 2, '#dfe6f5'], [25, 24, 3, 2, '#dfe6f5'],
        [24, 26, 1, 1, BRANCO], [24, 29, 1, 1, BRANCO], [24, 32, 1, 1, BRANCO], [24, 35, 1, 1, BRANCO],
      ]
    default:
      return []
  }
}

// -----------------------------------------------------------------------------
// Acessórios (por cima de tudo)
// -----------------------------------------------------------------------------
function desenharAcessorio(id: string, c: Corpo): Ret[] {
  const [t0, t1] = c.tronco
  switch (id) {
    case 'acessorio-oculos-redondos':
      return [
        [19, 13, 4, 1, OLHO], [19, 16, 4, 1, OLHO], [18, 14, 1, 2, OLHO], [23, 14, 1, 2, OLHO],
        [25, 13, 4, 1, OLHO], [25, 16, 4, 1, OLHO], [24, 14, 1, 2, OLHO], [29, 14, 1, 2, OLHO],
      ]
    case 'acessorio-fone':
      return [
        [17, 5, 14, 1, '#5b6280'], [16, 6, 1, 7, '#5b6280'], [31, 6, 1, 7, '#5b6280'],
        [14, 12, 3, 6, '#22c3dd'], [31, 12, 3, 6, '#22c3dd'], [14, 12, 1, 6, '#1a9ab0'], [33, 12, 1, 6, '#1a9ab0'],
      ]
    case 'acessorio-bone':
      return [
        [19, 4, 10, 1, '#e5484d'], [18, 5, 12, 2, '#e5484d'], [17, 7, 14, 3, '#e5484d'],
        [17, 10, 18, 2, '#b4343a'], [23, 6, 2, 2, BRANCO],
      ]
    case 'acessorio-visor':
      return [
        [16, 13, 16, 4, '#22c3dd'], [16, 13, 16, 1, '#7fe6f5'], [18, 14, 3, 1, BRANCO],
        [15, 14, 1, 2, '#5b6280'], [32, 14, 1, 2, '#5b6280'],
      ]
    case 'acessorio-broche':
      return [[t1 - 4, 26, 3, 3, '#f5c542'], [t1 - 3, 25, 1, 5, '#f5c542'], [t1 - 5, 27, 5, 1, '#f5c542'], [t1 - 3, 27, 1, 1, BRANCO]]
    case 'acessorio-capacete':
      return [
        [18, 1, 12, 1, '#c9ccd6'], [16, 2, 2, 1, '#c9ccd6'], [30, 2, 2, 1, '#c9ccd6'],
        [15, 3, 1, 2, '#c9ccd6'], [32, 3, 1, 2, '#c9ccd6'], [14, 5, 1, 16, '#c9ccd6'], [33, 5, 1, 16, '#c9ccd6'],
        [15, 21, 1, 1, '#c9ccd6'], [32, 21, 1, 1, '#c9ccd6'],
        [14, 22, 20, 2, '#8e92a6'], [16, 4, 1, 3, '#eef9fc'], [17, 3, 2, 1, '#eef9fc'],
      ]
    case 'acessorio-faixa-ninja':
      // Faixa na testa, com o nó e as pontas voando para o lado.
      return [
        [16, 10, 16, 2, FAIXA], [16, 11, 16, 1, FAIXA_SOMBRA],
        [32, 9, 2, 4, FAIXA], [33, 10, 1, 2, FAIXA_SOMBRA],
        [34, 10, 3, 1, FAIXA], [37, 11, 3, 1, FAIXA], [40, 12, 2, 1, FAIXA],
        [34, 12, 2, 1, FAIXA_SOMBRA], [36, 13, 3, 1, FAIXA_SOMBRA], [39, 14, 2, 1, FAIXA_SOMBRA],
      ]
    case 'acessorio-estrela-ninja': {
      // Estrela de quatro pontas na mão.
      const x = t1 + c.braco + 3
      return [
        [x + 1, 31, 3, 3, METAL], [x + 2, 28, 1, 3, METAL], [x + 2, 34, 1, 3, METAL],
        [x - 2, 32, 3, 1, METAL], [x + 4, 32, 3, 1, METAL],
        [x + 3, 33, 1, 1, METAL_SOMBRA], [x + 2, 35, 1, 2, METAL_SOMBRA], [x + 4, 32, 1, 1, METAL_SOMBRA],
        [x + 2, 32, 1, 1, CONTORNO],
      ]
    }
    case 'acessorio-caneca': {
      const x = t1 + c.braco + 2
      return [
        [x, 32, 5, 6, BRANCO], [x, 32, 5, 1, '#6b4027'], [x + 5, 33, 2, 1, BRANCO], [x + 6, 34, 1, 2, BRANCO],
        [x + 5, 36, 2, 1, BRANCO], [x + 1, 34, 3, 2, '#22c3dd'], [x + 1, 29, 1, 2, '#c9ccd6'], [x + 3, 28, 1, 2, '#c9ccd6'],
      ]
    }
    case 'acessorio-notebook': {
      const x = Math.max(1, t0 - c.braco - 10)
      return [
        [x, 30, 10, 8, '#8e92a6'], [x, 38, 10, 1, '#5b6280'],
        [x + 1, 31, 3, 2, '#ec4899'], [x + 5, 32, 2, 2, '#f5c542'], [x + 2, 34, 2, 2, '#22c3dd'], [x + 6, 35, 3, 2, '#8b5cf6'],
      ]
    }
    default:
      return []
  }
}

// -----------------------------------------------------------------------------
// Catálogo
// -----------------------------------------------------------------------------
export const PECAS: Peca[] = [
  { id: 'corpo-estreito', camada: 'corpo', nome: 'Estreito', para: 'todos', xpMinimo: 0 },
  { id: 'corpo-medio', camada: 'corpo', nome: 'Médio', para: 'todos', xpMinimo: 0 },
  { id: 'corpo-largo', camada: 'corpo', nome: 'Largo', para: 'todos', xpMinimo: 0 },
  ...PELES.map(([id, p, ps], i): Peca => ({
    id, camada: 'pele', nome: `Tom ${i + 1}`, para: 'todos', xpMinimo: 0, cores: { p, ps },
  })),
  { id: 'rosto-sorridente', camada: 'rosto', nome: 'Sorridente', para: 'todos', xpMinimo: 0, desenho: () => [...SOBRANCELHAS, ...olhos(), NARIZ, ...SORRISO, ...BOCHECHAS] },
  { id: 'rosto-serio', camada: 'rosto', nome: 'Concentrado', para: 'todos', xpMinimo: 0, desenho: () => [[19, 12, 3, 1, 'cs'], [26, 12, 3, 1, 'cs'], [21, 11, 1, 1, 'cs'], [26, 11, 1, 1, 'cs'], ...olhos(), NARIZ, [22, 18, 4, 1, BOCA]] },
  { id: 'rosto-piscando', camada: 'rosto', nome: 'Piscando', para: 'todos', xpMinimo: 0, desenho: () => [...SOBRANCELHAS, ...olhos(true), NARIZ, ...SORRISO, ...BOCHECHAS] },
  { id: 'rosto-surpreso', camada: 'rosto', nome: 'Surpreso', para: 'todos', xpMinimo: 100, desenho: () => [[19, 11, 3, 1, 'cs'], [26, 11, 3, 1, 'cs'], ...olhos(), NARIZ, [23, 17, 2, 1, BOCA], [22, 18, 1, 1, BOCA], [25, 18, 1, 1, BOCA], [23, 19, 2, 1, BOCA]] },
  { id: 'rosto-barba-e-oculos', camada: 'rosto', nome: 'Barba e óculos', para: 'professor', xpMinimo: 0, desenho: () => [...SOBRANCELHAS, NARIZ, ...BARBA, ...OCULOS_GRANDES] },
  { id: 'rosto-barba', camada: 'rosto', nome: 'Barba', para: 'professor', xpMinimo: 0, desenho: () => [...SOBRANCELHAS, ...olhos(), NARIZ, ...BARBA] },
  { id: 'rosto-ninja-mascara', camada: 'rosto', nome: 'Máscara ninja', para: 'ninja', xpMinimo: 0, desenho: () => MASCARA_NINJA },
  { id: 'rosto-oculos', camada: 'rosto', nome: 'Óculos de nerd', para: 'professor', xpMinimo: 0, desenho: () => [...SOBRANCELHAS, NARIZ, ...SORRISO, ...OCULOS_GRANDES] },
  ...([
    ['cabelo-curto', 'Curto', 0],
    ['cabelo-franja', 'Franja', 0],
    ['cabelo-longo', 'Longo', 0],
    ['cabelo-cacheado', 'Cacheado', 0],
    ['cabelo-raspado', 'Raspado', 0],
    ['cabelo-rabo-de-cavalo', 'Rabo de cavalo', 0],
    ['cabelo-coque', 'Coque', 100],
    ['cabelo-arrepiado', 'Arrepiado', 250],
  ] as const).map(([id, nome, xp]): Peca => ({
    id, camada: 'cabelo', nome, para: 'todos', xpMinimo: xp, desenho: () => desenharCabelo(id),
  })),
  { id: 'cabelo-capuz-ninja', camada: 'cabelo', nome: 'Capuz ninja', para: 'ninja', xpMinimo: 0, desenho: () => desenharCabelo('cabelo-capuz-ninja') },
  ...CORES_CABELO.map(([id, nome, c, cs]): Peca => ({
    id, camada: 'cor-do-cabelo', nome, para: 'todos', xpMinimo: id === 'cabelo-azul' ? 500 : 0, cores: { c, cs },
  })),
  ...([
    ['roupa-uniforme', 'Uniforme da nave', 'aluno', 0],
    ['roupa-moletom', 'Moletom roxo', 'aluno', 0],
    ['roupa-camiseta-estrela', 'Camiseta estrela', 'aluno', 100],
    ['roupa-jaqueta-de-piloto', 'Jaqueta de piloto', 'aluno', 250],
    ['roupa-cardiga', 'Cardigã e camisa xadrez', 'professor', 0],
    ['roupa-camisa-xadrez', 'Camisa xadrez azul', 'professor', 0],
    ['roupa-traje-ninja', 'Traje ninja', 'ninja', 0],
  ] as const).map(([id, nome, para, xp]): Peca => ({
    id, camada: 'roupa', nome, para, xpMinimo: xp, desenho: (c) => desenharRoupa(id, c),
  })),
  ...([
    ['acessorio-oculos-redondos', 'Óculos redondos', 'aluno', 0],
    ['acessorio-fone', 'Fone de ouvido', 'aluno', 0],
    ['acessorio-bone', 'Boné', 'aluno', 0],
    ['acessorio-broche', 'Broche de estrela', 'aluno', 100],
    ['acessorio-visor', 'Visor de piloto', 'aluno', 250],
    ['acessorio-capacete', 'Capacete espacial', 'aluno', 900],
    ['acessorio-caneca', 'Caneca de café', 'professor', 0],
    ['acessorio-notebook', 'Notebook com adesivos', 'professor', 0],
    ['acessorio-faixa-ninja', 'Faixa ninja', 'ninja', 0],
    ['acessorio-estrela-ninja', 'Estrela ninja', 'ninja', 0],
  ] as const).map(([id, nome, para, xp]): Peca => ({
    id, camada: 'acessorio', nome, para, xpMinimo: xp, desenho: (c) => desenharAcessorio(id, c),
  })),
]

const POR_ID = new Map(PECAS.map((p) => [p.id, p]))

export const PADRAO_ALUNO: Escolhas = {
  corpo: 'corpo-medio', pele: 'pele-3', rosto: 'rosto-sorridente', cabelo: 'cabelo-curto',
  'cor-do-cabelo': 'cabelo-castanho', roupa: 'roupa-uniforme',
}

export const PADRAO_PROFESSOR: Escolhas = {
  corpo: 'corpo-medio', pele: 'pele-3', rosto: 'rosto-barba-e-oculos', cabelo: 'cabelo-curto',
  'cor-do-cabelo': 'cabelo-castanho', roupa: 'roupa-cardiga', acessorio: 'acessorio-caneca',
}

/** O boneco do Modo Ninja do professor, antes de ele mudar qualquer coisa. */
export const PADRAO_NINJA: Escolhas = {
  corpo: 'corpo-medio', pele: 'pele-3', rosto: 'rosto-ninja-mascara', cabelo: 'cabelo-capuz-ninja',
  'cor-do-cabelo': 'cabelo-preto', roupa: 'roupa-traje-ninja', acessorio: 'acessorio-faixa-ninja',
}

const ORDEM: Camada[] = ['rosto', 'roupa', 'cabelo', 'acessorio']

/** Monta a grade 48×52 de cores (null = transparente), com contorno escuro. */
export function montarPixels(escolhas: Escolhas): (string | null)[][] {
  const corpo = CORPOS[escolhas.corpo ?? ''] ?? CORPOS_PADRAO
  const cores: Record<string, string> = {
    ...POR_ID.get('pele-3')?.cores, ...POR_ID.get('cabelo-castanho')?.cores,
    ...POR_ID.get(escolhas.pele ?? '')?.cores, ...POR_ID.get(escolhas['cor-do-cabelo'] ?? '')?.cores,
  }
  // grade plana: posição = y * LADO + x
  const grade: (string | null)[] = new Array<string | null>(LADO * ALTURA).fill(null)
  const em = (x: number, y: number) => (x >= 0 && x < LADO && y >= 0 && y < ALTURA ? grade[y * LADO + x] ?? null : null)
  const pintar = (rets: Ret[]) => {
    for (const [x, y, w, h, cor] of rets) {
      const valor = cores[cor] ?? cor
      for (let j = Math.max(0, y); j < Math.min(ALTURA, y + h); j++) {
        for (let i = Math.max(0, x); i < Math.min(LADO, x + w); i++) grade[j * LADO + i] = valor
      }
    }
  }
  pintar(desenharCorpo(corpo))
  for (const camada of ORDEM) {
    const peca = POR_ID.get(escolhas[camada] ?? '')
    if (peca?.camada === camada && peca.desenho) pintar(peca.desenho(corpo))
  }
  // contorno: pixel vazio encostado (em cruz) em um pixel pintado
  const contorno: number[] = []
  for (let y = 0; y < ALTURA; y++) for (let x = 0; x < LADO; x++) {
    if (em(x, y)) continue
    if (em(x, y - 1) || em(x, y + 1) || em(x - 1, y) || em(x + 1, y)) contorno.push(y * LADO + x)
  }
  for (const i of contorno) grade[i] = CONTORNO
  return Array.from({ length: ALTURA }, (_, y) => grade.slice(y * LADO, (y + 1) * LADO))
}

/** Corpo do SVG (retângulos juntados por linha), sem a tag <svg>. */
export function retangulosSvg(escolhas: Escolhas): string {
  let saida = ''
  montarPixels(escolhas).forEach((linha, y) => {
    let x = 0
    while (x < LADO) {
      const cor = linha[x]
      let fim = x + 1
      while (fim < LADO && linha[fim] === cor) fim++
      if (cor) saida += `<rect x="${x}" y="${y}" width="${fim - x}" height="1" fill="${cor}"/>`
      x = fim
    }
  })
  return saida
}

export function avatarSvg(escolhas: Escolhas, tamanho = 144): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${ALTURA}" width="${tamanho}" height="${Math.round((tamanho * ALTURA) / LADO)}" shape-rendering="crispEdges">${retangulosSvg(escolhas)}</svg>`
}
