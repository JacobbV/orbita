// =============================================================================
// Arte do avatar do Órbita: pixel art original, todos os direitos reservados
// (veja LICENCA-ARTE.md). Cada peça é uma lista de retângulos desenhada sobre
// a geometria do corpo escolhido (base, altura e tipo). As cores "p", "ps",
// "c" e "cs" mudam com o tom de pele e a cor do cabelo escolhidos.
//
// Grade: 48 de largura. A altura passou de 52 para 56 em 27/11/2026 para caber
// o corpo alto: as 4 linhas novas ficam em cima (folga), então o boneco de
// altura média é exatamente o mesmo de antes, só desenhado 4 linhas abaixo.
// As coordenadas das peças continuam as da grade antiga (pés na linha 48).
//
// Este arquivo não importa nada, para que o script da folha de prévia também
// consiga usá-lo.
// =============================================================================

export const LADO = 48
export const ALTURA = 56
/** Folga em cima: as coordenadas das peças são somadas a este valor. */
const FOLGA = 4

/** [x, y, largura, altura, cor] */
export type Ret = readonly [number, number, number, number, string]

export type Camada =
  | 'base'
  | 'altura'
  | 'corpo'
  | 'pele'
  | 'rosto'
  | 'barba'
  | 'cabelo'
  | 'cor-do-cabelo'
  /** Parte de cima da roupa (o nome antigo da camada foi mantido). */
  | 'roupa'
  | 'parte-de-baixo'
  | 'pes'
  | 'acessorio-cabeca'
  | 'acessorio-rosto'
  | 'acessorio-corpo'
export type Para = 'aluno' | 'professor' | 'ninja' | 'todos'

export const CAMADAS: Camada[] = [
  'base', 'altura', 'corpo', 'pele', 'rosto', 'barba', 'cabelo', 'cor-do-cabelo',
  'roupa', 'parte-de-baixo', 'pes', 'acessorio-cabeca', 'acessorio-rosto', 'acessorio-corpo',
]

/** Camadas que podem ficar vazias ("Nenhum"). */
export const CAMADAS_OPCIONAIS: Camada[] = ['barba', 'acessorio-cabeca', 'acessorio-rosto', 'acessorio-corpo']

/** Cor livre do cabelo, usada quando "cor-do-cabelo" é "cabelo-cor-livre". */
export const COR_LIVRE = 'cor-livre'
export const CABELO_COR_LIVRE = 'cabelo-cor-livre'

export type Escolhas = Partial<Record<Camada | typeof COR_LIVRE, string>>

export type Base = 'masculina' | 'feminina'
export type Fisico = 'magro' | 'medio' | 'gordinho' | 'forte'
export type Estatura = 'baixa' | 'media' | 'alta'

/** Geometria do corpo, na grade antiga (pés nas linhas 48 e 49). */
export interface Geo {
  base: Base
  fisico: Fisico
  estatura: Estatura
  /** Quanto a cabeça sobe (negativo) ou desce (positivo) em relação ao corpo médio. */
  dy: number
  /** Primeira e última linha do tronco. */
  ombro: number
  fim: number
  /** Borda esquerda e direita do tronco em cada linha (índice = y - ombro). */
  linhas: [number, number][]
  braco: number
  /** x do braço esquerdo e do direito. */
  be: number
  bd: number
  /** Última linha do braço; a mão fica nas duas linhas seguintes. */
  fimBraco: number
  /** Primeira linha da mão. */
  mao: number
  /** Meia largura do pescoço. */
  pescoco: number
  /** Duas linhas do quadril (logo abaixo do tronco). */
  quadril: [number, number]
  /** Primeira linha das pernas (a última é a 47). */
  topoPerna: number
  /** Borda de fora da perna esquerda; a direita é espelhada (47 - x). */
  perna: number
}

export interface Peca {
  id: string
  camada: Camada
  nome: string
  para: Para
  xpMinimo: number
  desenho?: (g: Geo) => Ret[]
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
// Geometria: base (masculina ou feminina), tipo de corpo e altura
// -----------------------------------------------------------------------------
/** Meia largura do tronco em cada trecho; o centro do boneco fica entre x 23 e 24. */
interface Perfil {
  ombro: number
  peito: number
  cintura: number
  quadril: number
  braco: number
  perna: number
  pescoco: number
}

// Masculina: tronco reto. Magro, médio e forte são os corpos antigos
// (estreito, médio e largo), pixel por pixel.
// Feminina: ombros mais estreitos, cintura marcada e quadril mais largo.
const PERFIS: Record<Base, Record<Fisico, Perfil>> = {
  masculina: {
    magro: { ombro: 7, peito: 7, cintura: 7, quadril: 7, braco: 3, perna: 17, pescoco: 3 },
    medio: { ombro: 8, peito: 8, cintura: 8, quadril: 8, braco: 3, perna: 17, pescoco: 3 },
    forte: { ombro: 9, peito: 9, cintura: 9, quadril: 9, braco: 4, perna: 17, pescoco: 3 },
    gordinho: { ombro: 8, peito: 9, cintura: 10, quadril: 9, braco: 4, perna: 16, pescoco: 3 },
  },
  feminina: {
    magro: { ombro: 6, peito: 6, cintura: 4, quadril: 7, braco: 2, perna: 18, pescoco: 2 },
    medio: { ombro: 7, peito: 7, cintura: 5, quadril: 8, braco: 3, perna: 17, pescoco: 2 },
    forte: { ombro: 8, peito: 8, cintura: 6, quadril: 9, braco: 4, perna: 17, pescoco: 2 },
    gordinho: { ombro: 8, peito: 9, cintura: 9, quadril: 10, braco: 3, perna: 16, pescoco: 2 },
  },
}

/** Linhas do tronco, quanto a cabeça se move e linhas a menos (ou a mais) na perna. */
const ESTATURAS: Record<Estatura, { linhas: number; dy: number }> = {
  baixa: { linhas: 12, dy: 4 },
  media: { linhas: 14, dy: 0 },
  alta: { linhas: 15, dy: -3 },
}

const FISICO_DO_CORPO: Record<string, Fisico> = {
  'corpo-estreito': 'magro',
  'corpo-medio': 'medio',
  'corpo-largo': 'forte',
  'corpo-gordinho': 'gordinho',
}

export function geometria(escolhas: Escolhas): Geo {
  const base: Base = escolhas.base === 'base-feminina' ? 'feminina' : 'masculina'
  const fisico = FISICO_DO_CORPO[escolhas.corpo ?? ''] ?? 'medio'
  const estatura: Estatura = escolhas.altura === 'altura-baixa' ? 'baixa' : escolhas.altura === 'altura-alta' ? 'alta' : 'media'
  const perfil = PERFIS[base][fisico]
  const { linhas: n, dy } = ESTATURAS[estatura]
  const ombro = 24 + dy
  const fim = ombro + n - 1
  const peitoAte = 2 + Math.floor((n - 5) / 2)
  const linhas: [number, number][] = []
  for (let i = 0; i < n; i++) {
    let meia = i < 2 ? perfil.ombro : i >= n - 3 ? perfil.quadril : i < peitoAte ? perfil.peito : perfil.cintura
    // feminino: ombro arredondado na primeira linha
    if (base === 'feminina') {
      if (i === 0) meia -= 1
      // cintura afinando aos poucos: a primeira e a última linha ficam no meio do caminho
      if (i >= peitoAte && i < n - 3 && (i === peitoAte || i === n - 4) && perfil.cintura < perfil.peito) meia += 1
    }
    linhas.push([24 - meia, 23 + meia])
  }
  // Os braços descem rentes ao ombro e ao peito; barriga e quadril podem encostar neles.
  const maior = Math.max(perfil.ombro, perfil.peito)
  const be = 23 - maior - perfil.braco
  return {
    base, fisico, estatura, dy, ombro, fim, linhas,
    braco: perfil.braco, be, bd: 25 + maior,
    fimBraco: fim - 2, mao: fim - 1, pescoco: perfil.pescoco,
    quadril: [fim + 1, fim + 2], topoPerna: fim + 3, perna: perfil.perna,
  }
}

/** Bordas do tronco na linha y (fora do tronco, usa a linha mais próxima). */
function bordas(g: Geo, y: number): [number, number] {
  const i = Math.min(g.linhas.length - 1, Math.max(0, y - g.ombro))
  return g.linhas[i] ?? [16, 31]
}
const T = (g: Geo, k: number) => g.ombro + k
const B = (g: Geo, k: number) => g.fim - k

/** Pinta as linhas y..y+h-1 do tronco de borda a borda. */
function faixa(g: Geo, y: number, h: number, cor: string): Ret[] {
  const r: Ret[] = []
  for (let j = y; j < y + h; j++) {
    const [x0, x1] = bordas(g, j)
    r.push([x0, j, x1 - x0 + 1, 1, cor])
  }
  return r
}

/** Mangas (ou braços) da linha do ombro até `ate`. */
function mangas(g: Geo, ate: number, cor: string): Ret[] {
  const h = ate - g.ombro + 1
  return [[g.be, g.ombro, g.braco, h, cor], [g.bd, g.ombro, g.braco, h, cor]]
}

/** Liga o braço ao tronco nas duas linhas do ombro. */
function ombros(g: Geo, cor: string): Ret[] {
  const [x0, x1] = bordas(g, g.ombro)
  const ge = x0 - (g.be + g.braco)
  if (ge <= 0) return []
  return [[g.be + g.braco, g.ombro, ge, 2, cor], [x1 + 1, g.ombro, ge, 2, cor]]
}

/** Tronco inteiro, mangas até `ate` e ombros, numa cor só. */
function camiseta(g: Geo, cor: string, ate = g.fimBraco): Ret[] {
  return [...faixa(g, g.ombro, g.fim - g.ombro + 1, cor), ...mangas(g, ate, cor), ...ombros(g, cor)]
}

/** Punhos: as duas últimas linhas da manga longa. */
function punhos(g: Geo, cor: string): Ret[] {
  return [[g.be, g.fimBraco - 1, g.braco, 2, cor], [g.bd, g.fimBraco - 1, g.braco, 2, cor]]
}

/** Xadrez de quadradinhos 2×2, ancorado em (ax, ay) e recortado em [x0, x1] na linha y. */
function xadrezLinha(y: number, x0: number, x1: number, ax: number, ay: number, a: string, b: string): Ret[] {
  const r: Ret[] = []
  let x = x0
  while (x <= x1) {
    const celula = Math.floor((x - ax) / 2)
    const fimCelula = Math.min(x1, ax + celula * 2 + 1)
    const par = (celula + Math.floor((y - ay) / 2)) % 2 === 0
    r.push([x, y, fimCelula - x + 1, 1, par ? a : b])
    x = fimCelula + 1
  }
  return r
}

function xadrezTronco(g: Geo, xa: number | null, xb: number | null, a: string, b: string): Ret[] {
  const ax = xa ?? bordas(g, g.ombro)[0]
  const r: Ret[] = []
  for (let y = g.ombro; y <= g.fim; y++) {
    const [x0, x1] = bordas(g, y)
    r.push(...xadrezLinha(y, xa ?? x0, xb ?? x1, ax, g.ombro, a, b))
  }
  return r
}

function xadrezMangas(g: Geo, a: string, b: string): Ret[] {
  const r: Ret[] = []
  for (let y = g.ombro; y <= g.fimBraco; y++) {
    r.push(...xadrezLinha(y, g.be, g.be + g.braco - 1, g.be, g.ombro, a, b))
    r.push(...xadrezLinha(y, g.bd, g.bd + g.braco - 1, g.bd, g.ombro, a, b))
  }
  return r
}

// -----------------------------------------------------------------------------
// Corpo: cabeça, pescoço, tronco, braços, pernas e pés (a roupa vem por cima)
// -----------------------------------------------------------------------------
function desenharCorpo(g: Geo): Ret[] {
  const d = g.dy
  const pd = 47 - g.perna
  const larguraPerna = 22 - g.perna + 1
  // Feminino: queixo afilado; masculino: o rosto arredondado de sempre.
  const cabeca: Ret[] = g.base === 'feminina'
    ? [
        [18, 8 + d, 12, 1, 'p'], [17, 9 + d, 14, 10, 'p'], [18, 19 + d, 12, 1, 'p'], [19, 20 + d, 10, 1, 'p'],
        [21, 21 + d, 6, 1, 'ps'], [18, 19 + d, 1, 1, 'ps'], [29, 19 + d, 1, 1, 'ps'], [19, 20 + d, 2, 1, 'ps'], [27, 20 + d, 2, 1, 'ps'],
      ]
    : [[18, 8 + d, 12, 1, 'p'], [17, 9 + d, 14, 12, 'p'], [18, 21 + d, 12, 1, 'p'], [17, 20 + d, 14, 1, 'ps']]
  return [
    // cabeça e orelhas
    ...cabeca,
    [16, 14 + d, 1, 3, 'p'], [31, 14 + d, 1, 3, 'p'],
    // pescoço
    [24 - g.pescoco, 22 + d, g.pescoco * 2, 2, 'ps'],
    // tronco (camiseta lisa por baixo da roupa)
    ...faixa(g, g.ombro, g.fim - g.ombro + 1, '#3b4466'),
    // braços e mãos
    ...mangas(g, g.fimBraco, 'p'), ...ombros(g, 'p'),
    [g.be, g.mao, g.braco, 2, 'ps'], [g.bd, g.mao, g.braco, 2, 'ps'],
    // quadril, pernas e pés (cobertos pela parte de baixo e pelos calçados)
    [bordas(g, g.fim)[0] + 1, g.quadril[0], bordas(g, g.fim)[1] - bordas(g, g.fim)[0] - 1, 2, 'p'],
    [g.perna, g.topoPerna, larguraPerna, 48 - g.topoPerna, 'p'], [25, g.topoPerna, larguraPerna, 48 - g.topoPerna, 'p'],
    [g.perna, 48, larguraPerna, 2, 'ps'], [25, 48, pd - 25 + 1, 2, 'ps'],
  ]
}

// -----------------------------------------------------------------------------
// Tons de pele e cores de cabelo (base e sombra; degradê com uma segunda cor)
// -----------------------------------------------------------------------------
const PELES: [string, string, string, string, number][] = [
  ['pele-1', 'Tom 1', '#ffe0c7', '#efc3a3', 0],
  ['pele-2', 'Tom 2', '#f6cfa8', '#e2b088', 0],
  ['pele-3', 'Tom 3', '#e8b48a', '#d0976d', 0],
  ['pele-4', 'Tom 4', '#d69e6e', '#bb8256', 0],
  ['pele-5', 'Tom 5', '#b97f51', '#9c663d', 0],
  ['pele-6', 'Tom 6', '#9a6440', '#7f4f31', 0],
  ['pele-7', 'Tom 7', '#7a4b2e', '#623a22', 0],
  ['pele-8', 'Tom 8', '#5a3620', '#462917', 0],
  ['pele-9', 'Tom 9', '#fbd9d0', '#ebbcb0', 0],
  ['pele-10', 'Tom 10', '#e3b98f', '#c99e70', 0],
  ['pele-11', 'Tom 11', '#c48a63', '#a8714c', 0],
  ['pele-12', 'Tom 12', '#3f2617', '#2f1c10', 0],
  ['pele-alienigena', 'Verde alienígena', '#8fd694', '#6bb672', 250],
  ['pele-estelar', 'Azul estelar', '#8fb8f0', '#6a95d4', 500],
]

/** [id, nome, cor, sombra, xp, cor de baixo do degradê, sombra de baixo] */
const CORES_CABELO: [string, string, string, string, number, string?, string?][] = [
  ['cabelo-preto', 'Preto', '#2a2230', '#17121c', 0],
  ['cabelo-castanho', 'Castanho', '#6b4027', '#4d2c1a', 0],
  ['cabelo-loiro', 'Loiro', '#e8c15a', '#c79b37', 0],
  ['cabelo-ruivo', 'Ruivo', '#c4502a', '#99391b', 0],
  ['cabelo-grisalho', 'Grisalho', '#b9bccb', '#8e92a6', 0],
  ['cabelo-azul', 'Azul galáctico', '#3e7bf0', '#2a55b3', 500],
  ['cabelo-castanho-claro', 'Castanho claro', '#9a6a43', '#7a5030', 0],
  ['cabelo-acaju', 'Acaju', '#7d2f2a', '#5c1f1b', 0],
  ['cabelo-platinado', 'Platinado', '#f1e7c8', '#d2c49c', 0],
  ['cabelo-branco', 'Branco', '#eef0f6', '#c9ccd6', 0],
  ['cabelo-rosa', 'Rosa', '#f472b6', '#c94f8d', 100],
  ['cabelo-roxo', 'Roxo', '#8b5cf6', '#6a3fd0', 100],
  ['cabelo-verde', 'Verde', '#34c27a', '#22915a', 100],
  ['cabelo-vermelho', 'Vermelho', '#e5484d', '#b4343a', 100],
  ['cabelo-ciano', 'Ciano', '#22d3ee', '#129bb4', 100],
  ['cabelo-pontas-loiras', 'Pontas loiras', '#4d2c1a', '#33190d', 100, '#e8c15a', '#c79b37'],
  ['cabelo-por-do-sol', 'Pôr do sol', '#f08a24', '#c96a12', 250, '#f472b6', '#c94f8d'],
  ['cabelo-galaxia', 'Galáxia', '#6a3fd0', '#4a2a9a', 250, '#22d3ee', '#129bb4'],
  ['cabelo-oceano', 'Oceano', '#2a55b3', '#1d3d85', 250, '#34c27a', '#22915a'],
  ['cabelo-algodao-doce', 'Algodão-doce', '#f9a8d4', '#e07fb6', 250, '#93c5fd', '#6aa2e6'],
  ['cabelo-fogo', 'Fogo', '#d23b43', '#9c2930', 250, '#fbbf24', '#d69a10'],
]

// -----------------------------------------------------------------------------
// Rostos e barbas (desenhados na cabeça; sobem e descem com a altura)
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

const MASCARA: Ret[] = [
  [17, 16, 14, 5, NINJA], [18, 21, 12, 1, NINJA], [17, 16, 14, 1, NINJA_LUZ],
  [20, 19, 8, 1, NINJA_SOMBRA], [24, 17, 1, 2, NINJA_SOMBRA],
]

// Máscara ninja: cobre nariz e boca, deixa os olhos e a testa de fora.
const MASCARA_NINJA: Ret[] = [
  [19, 12, 3, 1, 'cs'], [26, 12, 3, 1, 'cs'], [21, 13, 1, 1, 'cs'], [26, 13, 1, 1, 'cs'],
  ...olhos(),
  ...MASCARA,
]

const SARDA = 'sarda'

function desenharBarba(id: string): Ret[] {
  switch (id) {
    case 'barba-cheia':
      return BARBA
    case 'barba-curta':
      return [
        [17, 15, 1, 1, 'cs'], [17, 17, 1, 1, 'cs'], [18, 18, 1, 1, 'cs'], [17, 19, 1, 1, 'cs'], [19, 19, 1, 1, 'cs'],
        [30, 15, 1, 1, 'cs'], [30, 17, 1, 1, 'cs'], [29, 18, 1, 1, 'cs'], [30, 19, 1, 1, 'cs'], [28, 19, 1, 1, 'cs'],
        [18, 20, 1, 1, 'cs'], [20, 20, 1, 1, 'cs'], [21, 19, 1, 1, 'cs'], [22, 20, 1, 1, 'cs'], [23, 19, 2, 1, 'cs'],
        [25, 20, 1, 1, 'cs'], [26, 19, 1, 1, 'cs'], [27, 20, 1, 1, 'cs'], [29, 20, 1, 1, 'cs'], [24, 21, 1, 1, 'cs'],
        [22, 17, 1, 1, 'cs'], [25, 17, 1, 1, 'cs'],
      ]
    case 'barba-cavanhaque':
      return [[21, 17, 6, 1, 'c'], [22, 19, 4, 2, 'c'], [23, 21, 2, 1, 'cs']]
    case 'barba-bigode':
      return [[20, 17, 8, 1, 'c'], [20, 18, 1, 1, 'c'], [27, 18, 1, 1, 'c'], [21, 17, 6, 1, 'cs'], [22, 17, 4, 1, 'c']]
    default:
      return []
  }
}

// -----------------------------------------------------------------------------
// Cabelos (por cima do rosto e da roupa)
// -----------------------------------------------------------------------------
const CURTO: Ret[] = [
  [19, 6, 10, 1, 'c'], [18, 7, 12, 1, 'c'], [17, 8, 14, 4, 'c'],
  [17, 12, 2, 3, 'c'], [29, 12, 2, 3, 'c'],
  [20, 12, 3, 1, 'cs'], [17, 15, 1, 1, 'cs'], [30, 15, 1, 1, 'cs'],
]

const RASPADO: Ret[] = [[19, 7, 10, 1, 'cs'], [18, 8, 12, 3, 'cs'], [17, 9, 1, 4, 'cs'], [30, 9, 1, 4, 'cs']]

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
      return RASPADO
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
    // ---- lote de 27/11/2026 ----
    case 'cabelo-moicano':
      // Laterais raspadas e a crista alta no meio, com três pontas.
      return [
        ...RASPADO,
        [20, 4, 8, 7, 'c'], [20, 1, 2, 3, 'c'], [23, 0, 2, 4, 'c'], [26, 1, 2, 3, 'c'],
        [22, 2, 1, 2, 'c'], [25, 2, 1, 2, 'c'],
        [22, 5, 1, 5, 'cs'], [25, 5, 1, 5, 'cs'], [20, 10, 8, 1, 'cs'],
      ]
    case 'cabelo-black-power':
      return [
        [19, 0, 10, 1, 'c'], [16, 1, 16, 1, 'c'], [14, 2, 20, 2, 'c'], [13, 4, 22, 2, 'c'],
        [12, 6, 24, 6, 'c'], [12, 12, 5, 6, 'c'], [31, 12, 5, 6, 'c'], [13, 18, 3, 1, 'c'], [32, 18, 3, 1, 'c'],
        [17, 11, 14, 1, 'c'],
        [17, 2, 2, 1, 'cs'], [24, 1, 2, 1, 'cs'], [29, 3, 2, 1, 'cs'], [14, 7, 2, 1, 'cs'], [20, 5, 2, 1, 'cs'],
        [27, 7, 2, 1, 'cs'], [32, 9, 2, 1, 'cs'], [13, 14, 1, 2, 'cs'], [34, 13, 1, 2, 'cs'], [17, 11, 14, 1, 'cs'],
      ]
    case 'cabelo-trancas':
      return [
        ...CURTO,
        [14, 10, 3, 22, 'c'], [31, 10, 3, 22, 'c'], [17, 14, 1, 6, 'c'], [30, 14, 1, 6, 'c'],
        [14, 13, 3, 1, 'cs'], [14, 17, 3, 1, 'cs'], [14, 21, 3, 1, 'cs'], [14, 25, 3, 1, 'cs'], [14, 29, 3, 1, 'cs'],
        [31, 13, 3, 1, 'cs'], [31, 17, 3, 1, 'cs'], [31, 21, 3, 1, 'cs'], [31, 25, 3, 1, 'cs'], [31, 29, 3, 1, 'cs'],
        [15, 10, 1, 22, 'cs'], [32, 10, 1, 22, 'cs'],
        [14, 32, 3, 1, '#f5c542'], [31, 32, 3, 1, '#f5c542'],
      ]
    case 'cabelo-chanel':
      return [
        ...CURTO,
        [18, 11, 12, 2, 'c'], [15, 10, 2, 11, 'c'], [31, 10, 2, 11, 'c'], [17, 12, 1, 9, 'c'], [30, 12, 1, 9, 'c'],
        [19, 12, 2, 1, 'cs'], [24, 12, 2, 1, 'cs'], [15, 20, 3, 1, 'cs'], [30, 20, 3, 1, 'cs'],
      ]
    case 'cabelo-maria-chiquinha':
      return [
        ...CURTO,
        [14, 11, 3, 2, '#ec4899'], [31, 11, 3, 2, '#ec4899'],
        [12, 13, 4, 9, 'c'], [32, 13, 4, 9, 'c'], [13, 22, 2, 2, 'c'], [33, 22, 2, 2, 'c'],
        [12, 16, 1, 3, 'cs'], [35, 16, 1, 3, 'cs'], [14, 20, 1, 2, 'cs'], [33, 20, 1, 2, 'cs'],
      ]
    case 'cabelo-topete':
      return [
        ...CURTO,
        [19, 3, 10, 1, 'c'], [18, 4, 14, 2, 'c'], [17, 5, 2, 2, 'c'], [27, 2, 5, 2, 'c'], [30, 4, 3, 3, 'c'],
        [20, 3, 6, 1, 'cs'], [28, 2, 3, 1, 'cs'], [31, 6, 2, 1, 'cs'],
      ]
    case 'cabelo-careca':
      return [[21, 9, 2, 1, 'pl'], [20, 10, 1, 1, 'pl']]
    default:
      return []
  }
}

// -----------------------------------------------------------------------------
// Parte de cima da roupa (sobre o tronco e os braços)
// -----------------------------------------------------------------------------
function desenharRoupa(id: string, g: Geo): Ret[] {
  const { be, bd, braco } = g
  switch (id) {
    case 'roupa-uniforme': {
      const [b0] = bordas(g, T(g, 2))
      return [
        ...camiseta(g, '#22c3dd'),
        ...faixa(g, B(g, 2), 3, '#1a9ab0'), [23, g.ombro, 2, g.fim - g.ombro + 1, '#1a9ab0'],
        ...faixa(g, B(g, 4), 1, '#13758a'),
        [b0 + 2, T(g, 2), 3, 2, '#f5c542'],
        ...punhos(g, '#1a9ab0'),
      ]
    }
    case 'roupa-moletom': {
      const bolso: Ret[] = []
      for (let y = B(g, 5); y <= B(g, 1); y++) {
        const [x0, x1] = bordas(g, y)
        bolso.push([x0 + 3, y, x1 - x0 - 5, 1, '#6d3fd6'])
      }
      return [
        ...camiseta(g, '#8b5cf6'),
        [20, g.ombro - 1, 8, 2, '#6d3fd6'],
        ...bolso,
        [22, T(g, 1), 1, 3, BRANCO], [25, T(g, 1), 1, 3, BRANCO],
        ...punhos(g, '#6d3fd6'),
      ]
    }
    case 'roupa-jaqueta-de-piloto': {
      const [a0, a1] = bordas(g, g.ombro)
      const [b0] = bordas(g, T(g, 4))
      return [
        ...camiseta(g, '#f08a24'),
        ...faixa(g, B(g, 2), 3, '#c96a12'),
        [19, g.ombro, 10, 2, '#f3e3c3'], [a0 + 1, g.ombro, 3, 2, '#f3e3c3'], [a1 - 3, g.ombro, 3, 2, '#f3e3c3'],
        [23, T(g, 2), 2, g.fim - T(g, 2) + 1, '#c9ccd6'],
        [b0 + 2, T(g, 4), 3, 2, '#3e7bf0'], [b0 + 2, T(g, 4), 1, 1, BRANCO],
        ...punhos(g, '#c96a12'),
      ]
    }
    case 'roupa-camiseta-estrela':
      return [
        ...camiseta(g, '#ec4899', T(g, 3)),
        ...faixa(g, B(g, 1), 2, '#c42f7a'),
        [23, T(g, 2), 2, 1, '#f5c542'], [21, T(g, 3), 6, 2, '#f5c542'], [22, T(g, 5), 4, 1, '#f5c542'],
        [21, T(g, 6), 2, 1, '#f5c542'], [25, T(g, 6), 2, 1, '#f5c542'],
        [be, T(g, 3), braco, 1, '#c42f7a'], [bd, T(g, 3), braco, 1, '#c42f7a'],
      ]
    case 'roupa-cardiga': {
      const botao = (y: number): Ret[] => {
        const [x0, x1] = bordas(g, y)
        return [[Math.max(17, x0), y, 1, 1, '#d7c79a'], [Math.min(30, x1), y, 1, 1, '#d7c79a']]
      }
      return [
        ...camiseta(g, '#5f7a45'),
        ...xadrezTronco(g, 20, 27, '#b8323a', '#6e1b22'),
        [19, g.ombro, 1, g.fim - g.ombro + 1, '#4a6035'], [28, g.ombro, 1, g.fim - g.ombro + 1, '#4a6035'],
        ...botao(T(g, 6)), ...botao(B(g, 3)),
        ...punhos(g, '#4a6035'),
      ]
    }
    case 'roupa-traje-ninja': {
      const lado: Ret[] = []
      for (let y = T(g, 4); y <= T(g, 8); y++) {
        const [x0, x1] = bordas(g, y)
        lado.push([x0, y, 1, 1, NINJA_SOMBRA], [x1, y, 1, 1, NINJA_SOMBRA])
      }
      const no: Ret[] = []
      for (let y = B(g, 2); y <= g.fim; y++) {
        const [x0, x1] = bordas(g, y)
        no.push([x0 + 2, y, 2, 1, FAIXA], [x0, y, 2, 1, NINJA_SOMBRA], [x0 + 4, y, x1 - x0 - 3, 1, NINJA_SOMBRA])
        if (y >= B(g, 1)) no.push([x0 + 3, y, 1, 1, FAIXA_SOMBRA])
      }
      return [
        ...camiseta(g, NINJA),
        // gola cruzada
        [20, T(g, 0), 2, 1, NINJA_LUZ], [21, T(g, 1), 2, 1, NINJA_LUZ], [22, T(g, 2), 2, 1, NINJA_LUZ], [23, T(g, 3), 2, 1, NINJA_LUZ],
        [26, T(g, 0), 2, 1, NINJA_SOMBRA], [25, T(g, 1), 2, 1, NINJA_SOMBRA], [24, T(g, 2), 2, 1, NINJA_SOMBRA],
        ...lado,
        // faixa da cintura com nó
        ...faixa(g, B(g, 4), 1, FAIXA), ...faixa(g, B(g, 3), 1, FAIXA_SOMBRA),
        ...no,
        // punhos enfaixados
        [be, g.fimBraco - 3, braco, 1, NINJA_LUZ], [bd, g.fimBraco - 3, braco, 1, NINJA_LUZ],
        ...punhos(g, NINJA_SOMBRA),
      ]
    }
    case 'roupa-camisa-xadrez':
      return [
        ...camiseta(g, '#2f5fb3'),
        ...xadrezTronco(g, null, null, '#2f5fb3', '#1f3f7a'),
        ...xadrezMangas(g, '#2f5fb3', '#1f3f7a'),
        ...ombros(g, '#2f5fb3'),
        [20, g.ombro, 3, 2, '#dfe6f5'], [25, g.ombro, 3, 2, '#dfe6f5'],
        [24, T(g, 2), 1, 1, BRANCO], [24, T(g, 5), 1, 1, BRANCO], [24, T(g, 8), 1, 1, BRANCO], [24, T(g, 11), 1, 1, BRANCO],
      ]
    // ---- lote de 27/11/2026 ----
    case 'roupa-farda-if': {
      // Farda do IF sem o logotipo: camisa branca, mangas e gola verdes.
      const lados: Ret[] = []
      for (let y = g.ombro + 2; y <= g.fim; y++) {
        const [x0, x1] = bordas(g, y)
        lados.push([x0, y, 1, 1, '#d5dbe7'], [x1, y, 1, 1, '#d5dbe7'])
      }
      return [
        ...faixa(g, g.ombro, g.fim - g.ombro + 1, '#eef1f6'),
        ...lados,
        ...faixa(g, g.fim, 1, '#d5dbe7'),
        ...mangas(g, T(g, 4), '#2f9e4f'), ...ombros(g, '#2f9e4f'),
        [be, T(g, 4), braco, 1, '#1f7a3a'], [bd, T(g, 4), braco, 1, '#1f7a3a'],
        // gola polo
        [19, g.ombro, 10, 1, '#2f9e4f'], [20, T(g, 1), 3, 1, '#2f9e4f'], [25, T(g, 1), 3, 1, '#2f9e4f'],
        [19, g.ombro, 1, 1, '#1f7a3a'], [28, g.ombro, 1, 1, '#1f7a3a'],
        [23, T(g, 1), 2, 4, '#d5dbe7'], [23, T(g, 2), 1, 1, '#9aa3b8'], [23, T(g, 4), 1, 1, '#9aa3b8'],
      ]
    }
    case 'roupa-camiseta-programador':
      return [
        ...camiseta(g, '#2a2c35', T(g, 3)),
        [be, T(g, 3), braco, 1, '#1d1e25'], [bd, T(g, 3), braco, 1, '#1d1e25'],
        [21, g.ombro, 6, 1, '#3a3d4a'],
        // "</>" em ciano
        [21, T(g, 4), 1, 1, '#22d3ee'], [20, T(g, 5), 1, 1, '#22d3ee'], [21, T(g, 6), 1, 1, '#22d3ee'],
        [25, T(g, 4), 1, 1, '#22d3ee'], [24, T(g, 5), 1, 1, '#22d3ee'], [23, T(g, 6), 1, 1, '#22d3ee'],
        [26, T(g, 4), 1, 1, '#22d3ee'], [27, T(g, 5), 1, 1, '#22d3ee'], [26, T(g, 6), 1, 1, '#22d3ee'],
      ]
    case 'roupa-regata': {
      const [a0, a1] = bordas(g, g.ombro)
      return [
        ...faixa(g, g.ombro, 2, 'p'), ...ombros(g, 'p'),
        ...faixa(g, g.ombro + 2, g.fim - g.ombro - 1, '#f5c542'),
        [a0 + 2, g.ombro, 3, 2, '#f5c542'], [a1 - 4, g.ombro, 3, 2, '#f5c542'],
        [a0 + 2, T(g, 1), 21 - a0, 1, '#f5c542'], [26, T(g, 1), a1 - 27, 1, '#f5c542'],
        ...faixa(g, B(g, 1), 2, '#c79b37'),
      ]
    }
    case 'roupa-blusa-listrada': {
      const listras: Ret[] = []
      for (let y = g.ombro; y <= g.fim; y++) {
        const cor = Math.floor((y - g.ombro) / 2) % 2 === 0 ? '#1f3f7a' : '#eef1f6'
        listras.push(...faixa(g, y, 1, cor))
        if (y <= g.fimBraco) listras.push([be, y, braco, 1, cor], [bd, y, braco, 1, cor])
      }
      return [...camiseta(g, '#1f3f7a'), ...listras, [21, g.ombro, 6, 1, '#16305e'], ...punhos(g, '#16305e')]
    }
    default:
      return []
  }
}

// -----------------------------------------------------------------------------
// Parte de baixo e calçados
// -----------------------------------------------------------------------------
function quadril(g: Geo, cor: string): Ret[] {
  const [x0, x1] = bordas(g, g.fim)
  return [[x0 + 1, g.quadril[0], x1 - x0 - 1, 2, cor]]
}

function pernas(g: Geo, ate: number, cor: string, sombra: string): Ret[] {
  const pd = 47 - g.perna
  const h = ate - g.topoPerna + 1
  const l = 22 - g.perna + 1
  return [
    [g.perna, g.topoPerna, l, h, cor], [25, g.topoPerna, l, h, cor],
    [22, g.topoPerna, 1, h, sombra], [pd, g.topoPerna, 1, h, sombra],
  ]
}

function calca(g: Geo, cor: string, sombra: string, luz?: string): Ret[] {
  const extra: Ret[] = luz
    ? [
        [g.perna + 1, g.quadril[0], 3, 1, luz], [44 - g.perna, g.quadril[0], 3, 1, luz],
        [g.perna + 1, g.topoPerna + 3, 1, 2, luz], [26, g.topoPerna + 3, 1, 2, luz],
      ]
    : []
  return [...quadril(g, cor), ...pernas(g, 47, cor, sombra), ...extra]
}

function desenharBaixo(id: string, g: Geo): Ret[] {
  const pd = 47 - g.perna
  switch (id) {
    case 'baixo-calca-marinho':
      return calca(g, '#26304f', '#1d2540')
    case 'baixo-jeans-azul':
      return calca(g, '#3d5f9c', '#2c4677', '#6a8bc4')
    case 'baixo-jeans-preta':
      return calca(g, '#2b2d36', '#1d1e25', '#4a4d5c')
    case 'baixo-bermuda': {
      const ate = g.topoPerna + 3
      return [
        ...quadril(g, '#b39a6b'), ...pernas(g, ate, '#b39a6b', '#8f7a52'),
        [g.perna, ate, 22 - g.perna + 1, 1, '#8f7a52'], [25, ate, pd - 25 + 1, 1, '#8f7a52'],
        [g.perna + 1, g.topoPerna + 1, 2, 1, '#8f7a52'], [pd - 2, g.topoPerna + 1, 2, 1, '#8f7a52'],
      ]
    }
    case 'baixo-saia': {
      const r: Ret[] = [...quadril(g, '#8b5cf6')]
      for (let i = 0; i < 4; i++) {
        const y = g.topoPerna + i
        const x0 = g.perna - (i >= 1 ? 1 : 0) - (i >= 3 ? 1 : 0)
        r.push([x0, y, 47 - x0 - x0 + 1, 1, i === 3 ? '#6d3fd6' : '#8b5cf6'])
      }
      for (let x = g.perna + 1; x < 24; x += 3) r.push([x, g.topoPerna, 1, 3, '#6d3fd6'], [47 - x, g.topoPerna, 1, 3, '#6d3fd6'])
      return r
    }
    default:
      return []
  }
}

function desenharPes(id: string, g: Geo): Ret[] {
  const x0 = g.perna - 1
  const l = 22 - x0 + 1
  const par = (y: number, h: number, cor: string): Ret[] => [[x0, y, l, h, cor], [25, y, l, h, cor]]
  switch (id) {
    case 'pes-tenis-branco':
      return [...par(48, 1, BRANCO), ...par(49, 1, '#5b6280')]
    case 'pes-tenis-preto':
      return [...par(48, 1, '#2a2c35'), ...par(49, 1, BRANCO), [x0 + 2, 48, 2, 1, '#4a4d5c'], [27, 48, 2, 1, '#4a4d5c']]
    case 'pes-cano-alto':
      return [
        [g.perna, 45, 22 - g.perna + 1, 3, '#e5484d'], [25, 45, 22 - g.perna + 1, 3, '#e5484d'],
        [g.perna, 46, 22 - g.perna + 1, 1, BRANCO], [25, 46, 22 - g.perna + 1, 1, BRANCO],
        ...par(48, 1, '#e5484d'), ...par(49, 1, BRANCO),
      ]
    case 'pes-bota':
      return [
        [g.perna, 44, 22 - g.perna + 1, 4, '#6b4027'], [25, 44, 22 - g.perna + 1, 4, '#6b4027'],
        [g.perna, 44, 22 - g.perna + 1, 1, '#8a5a38'], [25, 44, 22 - g.perna + 1, 1, '#8a5a38'],
        ...par(48, 1, '#6b4027'), ...par(49, 1, '#3a2416'),
      ]
    case 'pes-chinelo':
      return [...par(49, 1, '#3e7bf0'), [g.perna + 2, 48, 2, 1, '#22d3ee'], [27, 48, 2, 1, '#22d3ee']]
    default:
      return []
  }
}

// -----------------------------------------------------------------------------
// Acessórios: cabeça, rosto e corpo (por cima de tudo)
// -----------------------------------------------------------------------------
const OCULOS_REDONDOS: Ret[] = [
  [19, 13, 4, 1, OLHO], [19, 16, 4, 1, OLHO], [18, 14, 1, 2, OLHO], [23, 14, 1, 2, OLHO],
  [25, 13, 4, 1, OLHO], [25, 16, 4, 1, OLHO], [24, 14, 1, 2, OLHO], [29, 14, 1, 2, OLHO],
]

function desenharAcessorio(id: string, g: Geo): Ret[] {
  const [, t1] = bordas(g, T(g, 2))
  switch (id) {
    // ---- cabeça ----
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
    case 'acessorio-tiara':
      return [
        [19, 6, 10, 1, '#ec4899'], [17, 7, 2, 1, '#ec4899'], [29, 7, 2, 1, '#ec4899'],
        [16, 8, 1, 4, '#ec4899'], [31, 8, 1, 4, '#ec4899'],
        [23, 5, 2, 1, '#f5c542'], [22, 6, 4, 1, '#f5c542'], [23, 6, 2, 1, BRANCO],
      ]
    case 'acessorio-laco':
      return [
        [25, 3, 4, 4, '#e5484d'], [30, 3, 4, 4, '#e5484d'], [29, 4, 1, 2, '#b4343a'],
        [26, 4, 2, 2, '#f47b80'], [31, 4, 2, 2, '#f47b80'], [27, 7, 2, 1, '#b4343a'], [31, 7, 2, 1, '#b4343a'],
      ]
    case 'acessorio-chifres':
      return [
        [18, 5, 3, 2, '#d23b43'], [17, 3, 2, 2, '#d23b43'], [17, 2, 1, 1, '#d23b43'],
        [27, 5, 3, 2, '#d23b43'], [29, 3, 2, 2, '#d23b43'], [30, 2, 1, 1, '#d23b43'],
        [18, 4, 1, 1, '#f47b80'], [29, 4, 1, 1, '#f47b80'],
      ]
    case 'acessorio-chapeu-viking':
      return [
        [19, 2, 10, 1, METAL], [17, 3, 14, 1, METAL], [16, 4, 16, 6, METAL],
        [16, 4, 16, 1, '#e3e5ec'], [18, 5, 3, 2, '#e3e5ec'], [23, 3, 2, 7, METAL_SOMBRA],
        [15, 9, 18, 2, '#8a6a3a'], [16, 9, 1, 1, '#c9a25a'], [20, 9, 1, 1, '#c9a25a'], [27, 9, 1, 1, '#c9a25a'], [31, 9, 1, 1, '#c9a25a'],
        [13, 6, 3, 2, '#f3e3c3'], [12, 3, 2, 3, '#f3e3c3'], [12, 2, 1, 1, '#f3e3c3'],
        [32, 6, 3, 2, '#f3e3c3'], [34, 3, 2, 3, '#f3e3c3'], [35, 2, 1, 1, '#f3e3c3'],
      ]
    case 'acessorio-gorro':
      return [
        [19, 3, 10, 1, '#3e7bf0'], [17, 4, 14, 4, '#3e7bf0'], [16, 8, 16, 3, '#2a55b3'],
        [19, 4, 1, 4, '#2a55b3'], [23, 4, 1, 4, '#2a55b3'], [27, 4, 1, 4, '#2a55b3'],
        [22, 0, 4, 3, BRANCO], [23, 1, 1, 1, '#c9ccd6'],
      ]
    case 'acessorio-bandana-azul':
      return [
        [16, 10, 16, 2, '#3e7bf0'], [16, 11, 16, 1, '#2a55b3'], [19, 10, 1, 1, BRANCO], [24, 10, 1, 1, BRANCO], [28, 10, 1, 1, BRANCO],
        [32, 9, 2, 4, '#3e7bf0'], [34, 12, 2, 2, '#2a55b3'], [33, 13, 1, 2, '#3e7bf0'],
      ]
    // ---- rosto ----
    case 'acessorio-oculos-redondos':
      return OCULOS_REDONDOS
    case 'acessorio-visor':
      return [
        [16, 13, 16, 4, '#22c3dd'], [16, 13, 16, 1, '#7fe6f5'], [18, 14, 3, 1, BRANCO],
        [15, 14, 1, 2, '#5b6280'], [32, 14, 1, 2, '#5b6280'],
      ]
    case 'acessorio-oculos-quadrados':
      return [
        [18, 13, 5, 1, '#7a3e1f'], [18, 16, 5, 1, '#7a3e1f'], [18, 13, 1, 4, '#7a3e1f'], [22, 13, 1, 4, '#7a3e1f'],
        [25, 13, 5, 1, '#7a3e1f'], [25, 16, 5, 1, '#7a3e1f'], [25, 13, 1, 4, '#7a3e1f'], [29, 13, 1, 4, '#7a3e1f'],
        [23, 14, 2, 1, '#7a3e1f'], [17, 14, 1, 1, '#7a3e1f'], [30, 14, 1, 1, '#7a3e1f'],
      ]
    case 'acessorio-oculos-escuros':
      return [
        [18, 13, 5, 3, '#14161f'], [25, 13, 5, 3, '#14161f'], [19, 16, 3, 1, '#14161f'], [26, 16, 3, 1, '#14161f'],
        [23, 13, 2, 1, '#14161f'], [17, 13, 1, 1, '#14161f'], [30, 13, 1, 1, '#14161f'],
        [19, 14, 2, 1, '#5b6280'], [26, 14, 2, 1, '#5b6280'],
      ]
    case 'acessorio-oculos-coracao':
      return [
        [18, 13, 2, 1, '#ec4899'], [21, 13, 2, 1, '#ec4899'], [18, 14, 5, 1, '#ec4899'], [19, 15, 3, 1, '#ec4899'], [20, 16, 1, 1, '#ec4899'],
        [25, 13, 2, 1, '#ec4899'], [28, 13, 2, 1, '#ec4899'], [25, 14, 5, 1, '#ec4899'], [26, 15, 3, 1, '#ec4899'], [27, 16, 1, 1, '#ec4899'],
        [18, 13, 1, 1, '#f9a8d4'], [25, 13, 1, 1, '#f9a8d4'], [23, 14, 2, 1, OLHO],
      ]
    case 'acessorio-bandana-rosto':
      return [
        [17, 16, 14, 4, '#d23b43'], [18, 20, 12, 1, '#d23b43'], [20, 21, 8, 1, '#d23b43'], [22, 22, 4, 1, '#b4343a'],
        [17, 16, 14, 1, '#e5484d'],
        [19, 18, 1, 1, BRANCO], [23, 17, 1, 1, BRANCO], [27, 18, 1, 1, BRANCO], [21, 20, 1, 1, BRANCO], [25, 20, 1, 1, BRANCO],
      ]
    case 'acessorio-mascara-ninja':
      return MASCARA
    // ---- corpo e mãos ----
    case 'acessorio-broche':
      return [
        [t1 - 4, T(g, 2), 3, 3, '#f5c542'], [t1 - 3, T(g, 1), 1, 5, '#f5c542'], [t1 - 5, T(g, 3), 5, 1, '#f5c542'],
        [t1 - 3, T(g, 3), 1, 1, BRANCO],
      ]
    case 'acessorio-estrela-ninja': {
      // Estrela de quatro pontas na mão.
      const x = g.bd + g.braco + 1
      const m = g.mao - 8
      return [
        [x + 1, m + 3, 3, 3, METAL], [x + 2, m, 1, 3, METAL], [x + 2, m + 6, 1, 3, METAL],
        [x - 2, m + 4, 3, 1, METAL], [x + 4, m + 4, 3, 1, METAL],
        [x + 3, m + 5, 1, 1, METAL_SOMBRA], [x + 2, m + 7, 1, 2, METAL_SOMBRA], [x + 4, m + 4, 1, 1, METAL_SOMBRA],
        [x + 2, m + 4, 1, 1, CONTORNO],
      ]
    }
    case 'acessorio-caneca': {
      const x = g.bd + g.braco
      const m = g.mao - 4
      return [
        [x, m, 5, 6, BRANCO], [x, m, 5, 1, '#6b4027'], [x + 5, m + 1, 2, 1, BRANCO], [x + 6, m + 2, 1, 2, BRANCO],
        [x + 5, m + 4, 2, 1, BRANCO], [x + 1, m + 2, 3, 2, '#22c3dd'], [x + 1, m - 3, 1, 2, '#c9ccd6'], [x + 3, m - 4, 1, 2, '#c9ccd6'],
      ]
    }
    case 'acessorio-notebook': {
      const x = Math.max(1, g.be - 9)
      const m = g.mao - 6
      return [
        [x, m, 10, 8, '#8e92a6'], [x, m + 8, 10, 1, '#5b6280'],
        [x + 1, m + 1, 3, 2, '#ec4899'], [x + 5, m + 2, 2, 2, '#f5c542'], [x + 2, m + 4, 2, 2, '#22c3dd'], [x + 6, m + 5, 3, 2, '#8b5cf6'],
      ]
    }
    case 'acessorio-cachecol': {
      const y = g.ombro - 2
      return [
        [19, y, 10, 3, '#d23b43'], [19, y, 10, 1, '#e5484d'], [21, y + 1, 1, 2, '#9c2930'], [25, y + 1, 1, 2, '#9c2930'],
        [25, y + 3, 4, 6, '#d23b43'], [25, y + 5, 4, 1, BRANCO], [25, y + 7, 4, 1, BRANCO], [28, y + 3, 1, 6, '#9c2930'],
      ]
    }
    case 'acessorio-mochila': {
      const [a0, a1] = bordas(g, g.ombro)
      const ate = T(g, 9)
      return [
        [a0 + 2, g.ombro - 1, 2, ate - g.ombro + 2, '#f08a24'], [a1 - 3, g.ombro - 1, 2, ate - g.ombro + 2, '#f08a24'],
        [a0 + 2, T(g, 5), 2, 1, '#c9ccd6'], [a1 - 3, T(g, 5), 2, 1, '#c9ccd6'],
        [a0 + 3, g.ombro - 1, 1, ate - g.ombro + 2, '#c96a12'], [a1 - 2, g.ombro - 1, 1, ate - g.ombro + 2, '#c96a12'],
      ]
    }
    case 'acessorio-livro': {
      const x = g.be - 5
      const m = g.mao - 5
      return [
        [x, m, 5, 7, '#2f5fb3'], [x, m, 1, 7, '#1f3f7a'], [x + 4, m + 1, 1, 6, BRANCO],
        [x + 1, m + 2, 3, 1, '#f5c542'], [x + 1, m + 4, 2, 1, '#f5c542'],
      ]
    }
    default:
      return []
  }
}

// -----------------------------------------------------------------------------
// Catálogo
// -----------------------------------------------------------------------------
type Linha = readonly [string, string, Para, number]
const lista = (camada: Camada, linhas: readonly Linha[], desenho: (id: string, g: Geo) => Ret[]): Peca[] =>
  linhas.map(([id, nome, para, xp]) => ({ id, camada, nome, para, xpMinimo: xp, desenho: (g: Geo) => desenho(id, g) }))

const rosto = (id: string, nome: string, para: Para, xp: number, desenho: () => Ret[]): Peca => ({
  id, camada: 'rosto', nome, para, xpMinimo: xp, desenho,
})

export const PECAS: Peca[] = [
  { id: 'base-masculina', camada: 'base', nome: 'Masculino', para: 'todos', xpMinimo: 0 },
  { id: 'base-feminina', camada: 'base', nome: 'Feminino', para: 'todos', xpMinimo: 0 },
  { id: 'altura-baixa', camada: 'altura', nome: 'Baixinho', para: 'todos', xpMinimo: 0 },
  { id: 'altura-media', camada: 'altura', nome: 'Médio', para: 'todos', xpMinimo: 0 },
  { id: 'altura-alta', camada: 'altura', nome: 'Alto', para: 'todos', xpMinimo: 0 },
  { id: 'corpo-estreito', camada: 'corpo', nome: 'Magro', para: 'todos', xpMinimo: 0 },
  { id: 'corpo-medio', camada: 'corpo', nome: 'Médio', para: 'todos', xpMinimo: 0 },
  { id: 'corpo-gordinho', camada: 'corpo', nome: 'Gordinho', para: 'todos', xpMinimo: 0 },
  { id: 'corpo-largo', camada: 'corpo', nome: 'Forte', para: 'todos', xpMinimo: 0 },
  ...PELES.map(([id, nome, p, ps, xp]): Peca => ({
    id, camada: 'pele', nome, para: 'todos', xpMinimo: xp, cores: { p, ps },
  })),
  rosto('rosto-sorridente', 'Sorridente', 'todos', 0, () => [...SOBRANCELHAS, ...olhos(), NARIZ, ...SORRISO, ...BOCHECHAS]),
  rosto('rosto-serio', 'Concentrado', 'todos', 0, () => [[19, 12, 3, 1, 'cs'], [26, 12, 3, 1, 'cs'], [21, 11, 1, 1, 'cs'], [26, 11, 1, 1, 'cs'], ...olhos(), NARIZ, [22, 18, 4, 1, BOCA]]),
  rosto('rosto-piscando', 'Piscando', 'todos', 0, () => [...SOBRANCELHAS, ...olhos(true), NARIZ, ...SORRISO, ...BOCHECHAS]),
  rosto('rosto-surpreso', 'Surpreso', 'todos', 100, () => [[19, 11, 3, 1, 'cs'], [26, 11, 3, 1, 'cs'], ...olhos(), NARIZ, [23, 17, 2, 1, BOCA], [22, 18, 1, 1, BOCA], [25, 18, 1, 1, BOCA], [23, 19, 2, 1, BOCA]]),
  rosto('rosto-cilios', 'Cílios', 'todos', 0, () => [...SOBRANCELHAS, ...olhos(), [19, 13, 1, 1, OLHO], [20, 13, 1, 1, OLHO], [27, 13, 1, 1, OLHO], [28, 13, 1, 1, OLHO], NARIZ, ...SORRISO, ...BOCHECHAS]),
  rosto('rosto-feliz', 'Muito feliz', 'todos', 0, () => [...SOBRANCELHAS, [20, 14, 2, 1, OLHO], [19, 15, 1, 1, OLHO], [22, 15, 1, 1, OLHO], [26, 14, 2, 1, OLHO], [25, 15, 1, 1, OLHO], [28, 15, 1, 1, OLHO], NARIZ, [21, 17, 6, 2, BOCA], [22, 19, 4, 1, BOCA], [22, 17, 4, 1, BRANCO], ...BOCHECHAS]),
  rosto('rosto-lingua', 'Língua de fora', 'todos', 0, () => [...SOBRANCELHAS, ...olhos(true), NARIZ, ...SORRISO, [24, 19, 2, 1, '#e06b80'], [24, 20, 2, 1, '#c24f66']]),
  rosto('rosto-bravo', 'Bravo', 'todos', 0, () => [[19, 11, 1, 1, 'cs'], [20, 12, 2, 1, 'cs'], [22, 13, 1, 1, 'cs'], [28, 11, 1, 1, 'cs'], [26, 12, 2, 1, 'cs'], [25, 13, 1, 1, 'cs'], ...olhos(), NARIZ, [22, 17, 4, 1, BOCA], [21, 18, 1, 1, BOCA], [26, 18, 1, 1, BOCA]]),
  rosto('rosto-sardas', 'Sardas', 'todos', 0, () => [...SOBRANCELHAS, ...olhos(), NARIZ, ...SORRISO, [19, 16, 1, 1, SARDA], [21, 16, 1, 1, SARDA], [20, 17, 1, 1, SARDA], [26, 16, 1, 1, SARDA], [28, 16, 1, 1, SARDA], [27, 17, 1, 1, SARDA]]),
  rosto('rosto-barba-e-oculos', 'Barba e óculos', 'professor', 0, () => [...SOBRANCELHAS, NARIZ, ...BARBA, ...OCULOS_GRANDES]),
  rosto('rosto-barba', 'Barba', 'professor', 0, () => [...SOBRANCELHAS, ...olhos(), NARIZ, ...BARBA]),
  rosto('rosto-ninja-mascara', 'Máscara ninja', 'ninja', 0, () => MASCARA_NINJA),
  rosto('rosto-oculos', 'Óculos de nerd', 'professor', 0, () => [...SOBRANCELHAS, NARIZ, ...SORRISO, ...OCULOS_GRANDES]),
  ...lista('barba', [
    ['barba-curta', 'Barba rala', 'todos', 0],
    ['barba-bigode', 'Bigode', 'todos', 0],
    ['barba-cavanhaque', 'Cavanhaque', 'todos', 0],
    ['barba-cheia', 'Barba cheia', 'todos', 0],
  ], (id) => desenharBarba(id)),
  ...lista('cabelo', [
    ['cabelo-curto', 'Curto', 'todos', 0],
    ['cabelo-franja', 'Franja', 'todos', 0],
    ['cabelo-longo', 'Longo', 'todos', 0],
    ['cabelo-cacheado', 'Cacheado', 'todos', 0],
    ['cabelo-raspado', 'Raspado', 'todos', 0],
    ['cabelo-rabo-de-cavalo', 'Rabo de cavalo', 'todos', 0],
    ['cabelo-coque', 'Coque', 'todos', 100],
    ['cabelo-arrepiado', 'Arrepiado', 'todos', 250],
    ['cabelo-capuz-ninja', 'Capuz ninja', 'ninja', 0],
    ['cabelo-moicano', 'Moicano punk', 'todos', 0],
    ['cabelo-black-power', 'Black power', 'todos', 0],
    ['cabelo-trancas', 'Tranças', 'todos', 0],
    ['cabelo-chanel', 'Chanel', 'todos', 0],
    ['cabelo-maria-chiquinha', 'Maria-chiquinha', 'todos', 0],
    ['cabelo-topete', 'Topete', 'todos', 100],
    ['cabelo-careca', 'Careca', 'todos', 0],
  ], (id) => desenharCabelo(id)),
  ...CORES_CABELO.map(([id, nome, c, cs, xp, c2, cs2]): Peca => ({
    id, camada: 'cor-do-cabelo', nome, para: 'todos', xpMinimo: xp,
    cores: c2 && cs2 ? { c, cs, c2, cs2 } : { c, cs },
  })),
  { id: CABELO_COR_LIVRE, camada: 'cor-do-cabelo', nome: 'Escolher minha cor', para: 'todos', xpMinimo: 0 },
  ...lista('roupa', [
    ['roupa-uniforme', 'Uniforme da nave', 'aluno', 0],
    ['roupa-moletom', 'Moletom roxo', 'aluno', 0],
    ['roupa-camiseta-estrela', 'Camiseta estrela', 'aluno', 100],
    ['roupa-jaqueta-de-piloto', 'Jaqueta de piloto', 'aluno', 250],
    ['roupa-cardiga', 'Cardigã e camisa xadrez', 'professor', 0],
    ['roupa-camisa-xadrez', 'Camisa xadrez azul', 'professor', 0],
    ['roupa-traje-ninja', 'Traje ninja', 'ninja', 0],
    ['roupa-farda-if', 'Farda do IF', 'todos', 0],
    ['roupa-camiseta-programador', 'Camiseta </>', 'todos', 0],
    ['roupa-regata', 'Regata amarela', 'todos', 0],
    ['roupa-blusa-listrada', 'Blusa listrada', 'todos', 100],
  ], desenharRoupa),
  ...lista('parte-de-baixo', [
    ['baixo-calca-marinho', 'Calça azul-marinho', 'todos', 0],
    ['baixo-jeans-azul', 'Calça jeans azul', 'todos', 0],
    ['baixo-jeans-preta', 'Calça jeans preta', 'todos', 0],
    ['baixo-bermuda', 'Bermuda', 'todos', 0],
    ['baixo-saia', 'Saia roxa', 'todos', 0],
  ], desenharBaixo),
  ...lista('pes', [
    ['pes-tenis-branco', 'Tênis branco', 'todos', 0],
    ['pes-tenis-preto', 'Tênis preto', 'todos', 0],
    ['pes-chinelo', 'Chinelo', 'todos', 0],
    ['pes-bota', 'Bota', 'todos', 100],
    ['pes-cano-alto', 'Tênis cano alto', 'todos', 250],
  ], desenharPes),
  ...lista('acessorio-cabeca', [
    ['acessorio-bone', 'Boné', 'aluno', 0],
    ['acessorio-fone', 'Fone de ouvido', 'aluno', 0],
    ['acessorio-capacete', 'Capacete espacial', 'aluno', 900],
    ['acessorio-faixa-ninja', 'Faixa ninja', 'ninja', 0],
    ['acessorio-tiara', 'Tiara', 'todos', 0],
    ['acessorio-laco', 'Laço', 'todos', 0],
    ['acessorio-gorro', 'Gorro', 'todos', 0],
    ['acessorio-bandana-azul', 'Bandana azul', 'todos', 0],
    ['acessorio-chifres', 'Chifres', 'todos', 250],
    ['acessorio-chapeu-viking', 'Chapéu viking', 'todos', 500],
  ], desenharAcessorio),
  ...lista('acessorio-rosto', [
    ['acessorio-oculos-redondos', 'Óculos redondos', 'aluno', 0],
    ['acessorio-oculos-quadrados', 'Óculos quadrados', 'todos', 0],
    ['acessorio-oculos-escuros', 'Óculos escuros', 'todos', 0],
    ['acessorio-oculos-coracao', 'Óculos de coração', 'todos', 100],
    ['acessorio-visor', 'Visor de piloto', 'aluno', 250],
    ['acessorio-bandana-rosto', 'Bandana no rosto', 'todos', 100],
    ['acessorio-mascara-ninja', 'Máscara ninja', 'todos', 250],
  ], desenharAcessorio),
  ...lista('acessorio-corpo', [
    ['acessorio-broche', 'Broche de estrela', 'aluno', 100],
    ['acessorio-cachecol', 'Cachecol', 'todos', 0],
    ['acessorio-mochila', 'Mochila', 'todos', 0],
    ['acessorio-livro', 'Livro', 'todos', 0],
    ['acessorio-caneca', 'Caneca de café', 'professor', 0],
    ['acessorio-notebook', 'Notebook com adesivos', 'professor', 0],
    ['acessorio-estrela-ninja', 'Estrela ninja', 'ninja', 0],
  ], desenharAcessorio),
]

const POR_ID = new Map(PECAS.map((p) => [p.id, p]))

export function peca(id: string | undefined): Peca | undefined {
  return id ? POR_ID.get(id) : undefined
}

/** Roupa e calçado que todo boneco antigo já usava (antes vinham desenhados no corpo). */
const BAIXO_PADRAO: Escolhas = {
  base: 'base-masculina', altura: 'altura-media', 'parte-de-baixo': 'baixo-calca-marinho', pes: 'pes-tenis-branco',
}

export const PADRAO_ALUNO: Escolhas = {
  ...BAIXO_PADRAO,
  corpo: 'corpo-medio', pele: 'pele-3', rosto: 'rosto-sorridente', cabelo: 'cabelo-curto',
  'cor-do-cabelo': 'cabelo-castanho', roupa: 'roupa-uniforme',
}

export const PADRAO_PROFESSOR: Escolhas = {
  ...BAIXO_PADRAO,
  corpo: 'corpo-medio', pele: 'pele-3', rosto: 'rosto-barba-e-oculos', cabelo: 'cabelo-curto',
  'cor-do-cabelo': 'cabelo-castanho', roupa: 'roupa-cardiga', 'acessorio-corpo': 'acessorio-caneca',
}

/** O boneco do Modo Ninja do professor, antes de ele mudar qualquer coisa. */
export const PADRAO_NINJA: Escolhas = {
  ...BAIXO_PADRAO,
  corpo: 'corpo-medio', pele: 'pele-3', rosto: 'rosto-ninja-mascara', cabelo: 'cabelo-capuz-ninja',
  'cor-do-cabelo': 'cabelo-preto', roupa: 'roupa-traje-ninja', 'acessorio-cabeca': 'acessorio-faixa-ninja',
}

/** Camadas desenhadas na cabeça: sobem e descem com a altura. */
const NA_CABECA = new Set<Camada>(['rosto', 'barba', 'cabelo', 'acessorio-cabeca', 'acessorio-rosto'])

/** Ordem de pintura, de baixo para cima. */
const ORDEM: Camada[] = [
  'parte-de-baixo', 'pes', 'rosto', 'barba', 'roupa', 'cabelo', 'acessorio-corpo', 'acessorio-rosto', 'acessorio-cabeca',
]

// ---- cores ----
function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function paraHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}
function misturar(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a)
  const [r2, g2, b2] = hex(b)
  return paraHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t])
}
/** Sombra de uma cor livre: 25% mais escura. */
export function escurecer(c: string, quanto = 0.25): string {
  return misturar(c, '#000000', quanto)
}
export function corValida(c: unknown): c is string {
  return typeof c === 'string' && /^#[0-9a-f]{6}$/.test(c)
}

/** Cores do cabelo escolhidas (base e sombra; com degradê, também as de baixo). */
function coresDoCabelo(escolhas: Escolhas): Record<string, string> {
  if (escolhas['cor-do-cabelo'] === CABELO_COR_LIVRE) {
    const c = corValida(escolhas[COR_LIVRE]) ? escolhas[COR_LIVRE] : '#6b4027'
    return { c, cs: escurecer(c) }
  }
  return { ...POR_ID.get('cabelo-castanho')?.cores, ...peca(escolhas['cor-do-cabelo'])?.cores }
}

/** Monta a grade 48×56 de cores (null = transparente), com contorno escuro. */
export function montarPixels(escolhas: Escolhas): (string | null)[][] {
  const g = geometria(escolhas)
  const pele = { ...POR_ID.get('pele-3')?.cores, ...peca(escolhas.pele)?.cores }
  const cabelo = coresDoCabelo(escolhas)
  const cores: Record<string, string> = {
    ...pele, c: cabelo.c ?? '#6b4027', cs: cabelo.cs ?? '#4d2c1a',
    [SARDA]: escurecer(pele.ps ?? '#d0976d', 0.32), pl: misturar(pele.p ?? '#e8b48a', '#ffffff', 0.35),
  }
  const degrade = cabelo.c2 && cabelo.cs2 ? { c: cabelo.c2, cs: cabelo.cs2 } : null

  // grade plana: posição = y * LADO + x
  const grade: (string | null)[] = new Array<string | null>(LADO * ALTURA).fill(null)
  const em = (x: number, y: number) => (x >= 0 && x < LADO && y >= 0 && y < ALTURA ? grade[y * LADO + x] ?? null : null)
  const pintar = (rets: Ret[], dy = 0) => {
    // Degradê: o cabelo vai da cor de cima para a de baixo em 4 faixas.
    let topo = 0
    let fundo = 0
    if (degrade) {
      const ys = rets.filter((r) => r[4] === 'c' || r[4] === 'cs')
      topo = Math.min(...ys.map((r) => r[1]))
      fundo = Math.max(...ys.map((r) => r[1] + r[3] - 1))
    }
    for (const [x, y, w, h, cor] of rets) {
      for (let j = y; j < y + h; j++) {
        const yy = j + dy + FOLGA
        if (yy < 0 || yy >= ALTURA) continue
        let valor = cores[cor] ?? cor
        if (degrade && (cor === 'c' || cor === 'cs') && fundo > topo) {
          const t = Math.min(3, Math.floor(((j - topo) / (fundo - topo + 1)) * 4)) / 3
          valor = misturar(cores[cor] ?? cor, degrade[cor as 'c' | 'cs'], t)
        }
        for (let i = Math.max(0, x); i < Math.min(LADO, x + w); i++) grade[yy * LADO + i] = valor
      }
    }
  }
  /** Escurece (ou clareia) o que já está pintado nesses pixels. */
  const sombrear = (pontos: [number, number][], quanto: number) => {
    for (const [x, y] of pontos) {
      const i = (y + FOLGA) * LADO + x
      const atual = grade[i]
      if (atual) grade[i] = quanto > 0 ? escurecer(atual, quanto) : misturar(atual, '#ffffff', -quanto)
    }
  }
  const pixel = (x: number, y: number) => grade[(y + FOLGA) * LADO + x]
  pintar(desenharCorpo(g))
  for (const camada of ORDEM) {
    const p = peca(escolhas[camada])
    if (p?.camada === camada && p.desenho) pintar(p.desenho(g), NA_CABECA.has(camada) ? g.dy : 0)
    if (g.base !== 'feminina') continue
    if (camada === 'rosto') {
      // Cílios no canto de fora de cada olho aberto.
      const d = g.dy
      if (pixel(20, 14 + d) === BRANCO && pixel(21, 15 + d) === OLHO) grade[(13 + d + FOLGA) * LADO + 19] = OLHO
      if (pixel(26, 14 + d) === BRANCO && pixel(27, 15 + d) === OLHO) grade[(13 + d + FOLGA) * LADO + 28] = OLHO
    }
    if (camada === 'roupa' && p) {
      // Leve marcação do peito: sombra embaixo e um brilho em cima, na cor da roupa.
      const y = T(g, 4)
      sombrear([[19, y], [20, y], [21, y], [22, y], [25, y], [26, y], [27, y], [28, y], [23, y - 1], [24, y - 1]], 0.16)
      sombrear([[20, y - 2], [21, y - 2], [26, y - 2], [27, y - 2]], -0.12)
    }
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

/** Recorte da grade, em pixels: [x, y, largura, altura]. */
export type Recorte = [number, number, number, number]

/** Recorte usado nos quadradinhos de escolha: só a cabeça, só o tronco, só as pernas ou só os pés. */
export function recorteDaCamada(camada: Camada, escolhas: Escolhas): Recorte | null {
  const g = geometria(escolhas)
  const d = g.dy + FOLGA
  switch (camada) {
    case 'rosto':
    case 'barba':
    case 'acessorio-rosto':
      return [12, 6 + d, 24, 20]
    case 'cabelo':
    case 'cor-do-cabelo':
    case 'acessorio-cabeca':
      return [8, -2 + d, 32, 36]
    case 'roupa':
    case 'acessorio-corpo':
      return [0, g.ombro - 3 + FOLGA, 48, g.fim - g.ombro + 6]
    case 'parte-de-baixo':
      return [8, g.fim - 1 + FOLGA, 32, 52 - g.fim + 1]
    case 'pes':
      return [10, 41 + FOLGA, 28, 11]
    default:
      return null
  }
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
