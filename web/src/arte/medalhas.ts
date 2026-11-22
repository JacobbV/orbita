// =============================================================================
// Arte das medalhas do Órbita: pixel art original, todos os direitos reservados
// (veja LICENCA-ARTE.md). Cada medalha é uma fita com um medalhão redondo e um
// ícone de 6×6 no meio, numa grade de 18×22 com contorno escuro automático.
// =============================================================================

export const LARGURA_MEDALHA = 18
export const ALTURA_MEDALHA = 22

const CONTORNO = '#0b0e1c'

interface Estilo {
  /** Cores das duas pontas da fita. */
  fita: [string, string]
  /** Metal: borda, miolo e brilho. */
  metal: [string, string, string]
  icone: string
  /** 6 linhas de 6 caracteres: "#" pinta, "." deixa o metal. */
  desenho: readonly string[]
}

const ICONES = {
  numeroUm: ['..##..', '.###..', '..##..', '..##..', '..##..', '.####.'],
  chama: ['..#...', '..##..', '.###.#', '.#####', '######', '.####.'],
  confere: ['......', '.....#', '....##', '#..##.', '####..', '.##...'],
  estrela: ['..##..', '..##..', '######', '.####.', '.####.', '##..##'],
  codigo: ['.#..#.', '#....#', '#.##.#', '#.##.#', '#....#', '.#..#.'],
  inseto: ['#.##.#', '.####.', '######', '.####.', '######', '#....#'],
  lacos: ['.####.', '#....#', '#.##.#', '#.#..#', '#.###.', '.#....'],
} as const

const ESTILOS: Record<string, Estilo> = {
  'primeira-aula': { fita: ['#22d3ee', '#0e7490'], metal: ['#155e75', '#67e8f9', '#ecfeff'], icone: '#083344', desenho: ICONES.numeroUm },
  maratonista: { fita: ['#fb923c', '#c2410c'], metal: ['#9a3412', '#fdba74', '#fff7ed'], icone: '#7c2d12', desenho: ICONES.chama },
  'unidade-completa': { fita: ['#a78bfa', '#6d28d9'], metal: ['#5b21b6', '#c4b5fd', '#f5f3ff'], icone: '#2e1065', desenho: ICONES.confere },
  destaque: { fita: ['#f87171', '#b91c1c'], metal: ['#a16207', '#facc15', '#fefce8'], icone: '#713f12', desenho: ICONES.estrela },
  'primeiro-codigo': { fita: ['#4ade80', '#15803d'], metal: ['#166534', '#86efac', '#f0fdf4'], icone: '#052e16', desenho: ICONES.codigo },
  'cacador-de-bugs': { fita: ['#f472b6', '#be185d'], metal: ['#9d174d', '#f9a8d4', '#fdf2f8'], icone: '#500724', desenho: ICONES.inseto },
  'mestre-dos-lacos': { fita: ['#60a5fa', '#1d4ed8'], metal: ['#1e40af', '#93c5fd', '#eff6ff'], icone: '#172554', desenho: ICONES.lacos },
}

const PADRAO: Estilo = { fita: ['#94a3b8', '#475569'], metal: ['#a16207', '#facc15', '#fefce8'], icone: '#713f12', desenho: ICONES.estrela }

/** Cinza para a medalha que ainda falta. */
const APAGADA = { fita: ['#475569', '#334155'], metal: ['#334155', '#64748b', '#94a3b8'], icone: '#1e293b' } as const

export function temArteDaMedalha(codigo: string): boolean {
  return codigo in ESTILOS
}

/** Grade de cores (null = vazio) da medalha. */
export function pixelsDaMedalha(codigo: string, apagada = false): (string | null)[][] {
  const estilo = ESTILOS[codigo] ?? PADRAO
  const fita = apagada ? APAGADA.fita : estilo.fita
  const metal = apagada ? APAGADA.metal : estilo.metal
  const icone = apagada ? APAGADA.icone : estilo.icone

  const grade: (string | null)[][] = Array.from({ length: ALTURA_MEDALHA }, () =>
    Array.from({ length: LARGURA_MEDALHA }, () => null as string | null),
  )
  const pintar = (x: number, y: number, cor: string) => {
    const linha = grade[y]
    if (linha && x >= 0 && x < LARGURA_MEDALHA) linha[x] = cor
  }

  // Fita: duas pontas que descem até o medalhão, com a dobra mais escura.
  for (let y = 1; y <= 8; y++) {
    for (let x = 4; x <= 6; x++) pintar(x + Math.floor((y - 1) / 4), y, fita[0])
    for (let x = 11; x <= 13; x++) pintar(x - Math.floor((y - 1) / 4), y, fita[1])
  }

  // Medalhão: anel na cor escura do metal e miolo claro.
  const cx = 8.5
  const cy = 13.5
  for (let y = 7; y < ALTURA_MEDALHA - 1; y++) {
    for (let x = 1; x < LARGURA_MEDALHA - 1; x++) {
      const d = (x - cx) ** 2 + (y - cy) ** 2
      if (d <= 42.25) pintar(x, y, d > 23 ? metal[0] : metal[1])
    }
  }
  // Brilho no alto, à esquerda.
  pintar(6, 10, metal[2])
  pintar(5, 11, metal[2])
  pintar(5, 12, metal[2])

  // Ícone 6×6 no centro.
  estilo.desenho.forEach((linha, dy) => {
    for (let dx = 0; dx < linha.length; dx++) if (linha[dx] === '#') pintar(6 + dx, 11 + dy, icone)
  })

  // Contorno escuro em volta de tudo.
  const cheio = (x: number, y: number) => {
    const c = grade[y]?.[x]
    return c !== null && c !== undefined && c !== CONTORNO
  }
  const contorno: [number, number][] = []
  for (let y = 0; y < ALTURA_MEDALHA; y++) {
    for (let x = 0; x < LARGURA_MEDALHA; x++) {
      if (grade[y]?.[x]) continue
      if (cheio(x - 1, y) || cheio(x + 1, y) || cheio(x, y - 1) || cheio(x, y + 1)) contorno.push([x, y])
    }
  }
  for (const [x, y] of contorno) pintar(x, y, CONTORNO)
  return grade
}

/** Retângulos SVG da medalha (só números e cores do próprio catálogo). */
export function retangulosDaMedalha(codigo: string, apagada = false): string {
  let saida = ''
  pixelsDaMedalha(codigo, apagada).forEach((linha, y) => {
    let x = 0
    while (x < LARGURA_MEDALHA) {
      const cor = linha[x]
      let fim = x + 1
      while (fim < LARGURA_MEDALHA && linha[fim] === cor) fim++
      if (cor) saida += `<rect x="${x}" y="${y}" width="${fim - x}" height="1" fill="${cor}"/>`
      x = fim
    }
  })
  return saida
}

export function medalhaSvg(codigo: string, apagada = false, tamanho = 72): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGURA_MEDALHA} ${ALTURA_MEDALHA}" width="${tamanho}" height="${Math.round((tamanho * ALTURA_MEDALHA) / LARGURA_MEDALHA)}" shape-rendering="crispEdges">${retangulosDaMedalha(codigo, apagada)}</svg>`
}
