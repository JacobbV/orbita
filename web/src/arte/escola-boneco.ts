// =============================================================================
// Mini-boneco da escola virtual: pixel art original, todos os direitos
// reservados (veja LICENCA-ARTE.md). É uma versão pequena (12×17) do boneco
// do Hangar: as cores de pele, cabelo, camisa, calça e calçado são copiadas do
// boneco que o aluno montou, então cada um se reconhece no mapa.
// Anda para baixo, para cima e para os lados, com dois passos cada.
// =============================================================================

import { escurecer, geometria, montarPixels, peca, LADO, type Escolhas } from './avatar'

export const LARGURA_MINI = 12
export const ALTURA_MINI = 17
const CONTORNO = '#0b0e1c'

export type Direcao = 'baixo' | 'cima' | 'esquerda' | 'direita'
/** 0 = parado, 1 e 2 = passos. */
export type Quadro = 0 | 1 | 2

export interface CoresMini {
  pele: string
  cabelo: string
  camisa: string
  calca: string
  calcado: string
  /** Cabelo que desce até os ombros. */
  longo: boolean
  careca: boolean
  /** Segunda cor da roupa (ex.: o verde da farda do IF), ou null. */
  detalhe: string | null
}

function moda(cores: (string | null | undefined)[], fora: Set<string>): string | null {
  const conta = new Map<string, number>()
  for (const c of cores) if (c && !fora.has(c)) conta.set(c, (conta.get(c) ?? 0) + 1)
  let melhor: string | null = null
  let n = 0
  for (const [c, k] of conta) if (k > n) [melhor, n] = [c, k]
  return melhor
}

/** Lê as cores do boneco grande, olhando as regiões da cabeça, do tronco e das pernas. */
export function coresDoMini(escolhas: Escolhas): CoresMini {
  const g = montarPixels(escolhas)
  const corPele = peca(escolhas.pele)?.cores
  const pele = corPele?.p ?? '#e8b48a'
  const cheia = (y: number) => (g[y] ?? []).some((c) => c && c !== CONTORNO)
  let topo = 0
  while (topo < g.length && !cheia(topo)) topo++
  let fundo = g.length - 1
  while (fundo > 0 && !cheia(fundo)) fundo--
  const meio = Math.floor(LADO / 2)
  const regiao = (y0: number, y1: number, x0: number, x1: number) => {
    const out: (string | null | undefined)[] = []
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(g[y]?.[x])
    return out
  }
  const fora = new Set([CONTORNO, pele, corPele?.ps ?? pele])
  const cabeloTopo = g[topo]?.[meio] ?? pele
  const careca = cabeloTopo === pele
  const cabelo = careca ? pele : cabeloTopo
  // cores do cabelo: as que aparecem no alto da cabeça (cor e sombra)
  const doCabelo = new Set(regiao(topo, topo + 2, meio - 6, meio + 5).filter((c): c is string => Boolean(c) && !fora.has(c ?? '')))
  // A camisa começa no ombro do corpo escolhido (a grade tem 4 linhas de folga em cima).
  const gola = geometria(escolhas).ombro + 4
  const camisa = moda(regiao(gola + 1, gola + 5, meio - 4, meio + 3), fora) ?? '#3e7bf0'
  const calcado = moda(regiao(fundo - 1, fundo - 1, meio - 8, meio + 7), fora) ?? '#2a2230'
  // A calça (ou saia, ou bermuda) é a primeira cor acima do calçado que não é pele.
  let calca = '#2a3160'
  for (let y = fundo - 2; y > gola; y--) {
    const c = g[y]?.[meio - 3]
    if (c && !fora.has(c) && c !== calcado) {
      calca = c
      break
    }
  }
  const detalhe = moda(regiao(gola, gola + 5, meio - 8, meio + 7), new Set([...fora, camisa, calcado, calca, ...doCabelo]))
  const lados = regiao(topo + 14, topo + 22, meio - 10, meio - 7).concat(regiao(topo + 14, topo + 22, meio + 6, meio + 9))
  const longo = !careca && lados.filter((c) => c && doCabelo.has(c)).length >= 6
  return { pele, cabelo, camisa, calca, calcado, longo, careca, detalhe }
}

// Legenda: h cabelo, p pele, o olho, c camisa, C sombra da camisa, l calça,
// s calçado, L cabelo comprido (só aparece quando "longo").
const FRENTE: readonly string[] = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..hhhhhhhh..',
  '.LhpppppphL.',
  '.LppppppppL.',
  '.LppoppoppL.',
  '.LppppppppL.',
  '.L.pppppp.L.',
  '..dccccccd..',
  '.dcccccccd.',
  '.dcccccccd.',
  '.pccccccccp.',
  '..CCCCCCCC..',
  '..llllllll..',
  '..lll..lll..',
  '..lll..lll..',
  '..sss..sss..',
]

const COSTAS: readonly string[] = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..hhhhhhhh..',
  '.LhhhhhhhhL.',
  '.LhhhhhhhhL.',
  '.LhhhhhhhhL.',
  '.LhhhhhhhhL.',
  '.L.pppppp.L.',
  '..dccccccd..',
  '.dcccccccd.',
  '.dcccccccd.',
  '.pccccccccp.',
  '..CCCCCCCC..',
  '..llllllll..',
  '..lll..lll..',
  '..lll..lll..',
  '..sss..sss..',
]

const LADO_DIREITO: readonly string[] = [
  '....hhhhh...',
  '...hhhhhhh..',
  '...hhhhhhhh.',
  '..Lhhhppppp.',
  '..Lhhpppppp.',
  '..Lhhppppop.',
  '..Lhppppppp.',
  '..L.pppppp..',
  '....dddddd..',
  '....cccccc..',
  '....cCCccc..',
  '....cpcccc..',
  '....CCCCCC..',
  '....llllll..',
  '.....llll...',
  '.....llll...',
  '.....sssss..',
]

// Pernas e braços dos passos (substituem as últimas linhas).
const PASSO_FRENTE: readonly (readonly string[])[] = [
  ['.pccccccccp.', '..CCCCCCCC..', '..llllllll..', '..lll..lll..', '..sss..lll..', '.......sss..'],
  ['.pccccccccp.', '..CCCCCCCC..', '..llllllll..', '..lll..lll..', '..lll..sss..', '..sss.......'],
]
const PASSO_LADO: readonly (readonly string[])[] = [
  ['....ccccpc..', '....CCCCCC..', '....llllll..', '....ll.lll..', '...ll...ll..', '...ss...sss.'],
  ['....cpcccc..', '....CCCCCC..', '....llllll..', '....lll.ll..', '....ll..ll..', '....ss..sss.'],
]

function arte(direcao: Direcao, quadro: Quadro): string[] {
  const base = direcao === 'baixo' ? FRENTE : direcao === 'cima' ? COSTAS : LADO_DIREITO
  const linhas = [...base]
  if (quadro > 0) {
    const passo = (direcao === 'baixo' || direcao === 'cima' ? PASSO_FRENTE : PASSO_LADO)[quadro - 1] ?? []
    linhas.splice(linhas.length - passo.length, passo.length, ...passo)
  }
  return direcao === 'esquerda' ? linhas.map((l) => [...l].reverse().join('')) : linhas
}

/**
 * Pixels do mini-boneco (com contorno), numa grade de 14×19:
 * uma coluna e uma linha de folga em volta da arte de 12×17.
 */
export function miniBonecoPixels(cores: CoresMini, direcao: Direcao, quadro: Quadro): (string | null)[][] {
  const mapa: Record<string, string | null> = {
    h: cores.cabelo,
    p: cores.pele,
    o: '#1b1530',
    c: cores.camisa,
    d: cores.detalhe ?? cores.camisa,
    C: escurecer(cores.camisa, 0.25),
    l: cores.calca,
    s: cores.calcado,
    L: cores.longo ? escurecer(cores.cabelo, 0.12) : null,
    '.': null,
  }
  const linhas = arte(direcao, quadro)
  const W = LARGURA_MINI + 2
  const H = ALTURA_MINI + 2
  const g: (string | null)[][] = Array.from({ length: H }, () => new Array<string | null>(W).fill(null))
  linhas.forEach((linha, y) => {
    ;[...linha].forEach((ch, x) => {
      const cor = mapa[ch] ?? null
      const row = g[y + 1]
      if (row && cor) row[x + 1] = cor
    })
  })
  // contorno em cruz
  const pintado = (x: number, y: number) => Boolean(g[y]?.[x]) && g[y]?.[x] !== CONTORNO
  const contorno: [number, number][] = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y]?.[x]) continue
    if (pintado(x, y - 1) || pintado(x, y + 1) || pintado(x - 1, y) || pintado(x + 1, y)) contorno.push([x, y])
  }
  for (const [x, y] of contorno) {
    const row = g[y]
    if (row) row[x] = CONTORNO
  }
  return g
}
