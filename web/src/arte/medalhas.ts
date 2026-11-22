// =============================================================================
// Arte das medalhas do Órbita: pixel art original, todos os direitos reservados
// (veja LICENCA-ARTE.md). Cada medalha é uma fita com um medalhão redondo e um
// ícone de 6×6 no meio, numa grade de 18×22 com contorno escuro automático.
// =============================================================================

export const LARGURA_MEDALHA = 18
export const ALTURA_MEDALHA = 22

const CONTORNO = '#0b0e1c'

interface Estilo {
  formato?: Formato
  /** Cobra enrolada no anel (série do Python): cores das listras do corpo. */
  cobra?: [string, string]
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
  codigo: ['######', '#....#', '#....#', '######', '..##..', '.####.'],
  inseto: ['#.##.#', '.####.', '######', '.####.', '######', '#....#'],
  ovo: ['..##..', '.####.', '.####.', '######', '######', '.####.'],
  calendario: ['######', '#....#', '######', '#.#.##', '######', '......'],
  presas: ['######', '######', '#....#', '#....#', '.#..#.', '......'],
  flauta: ['.....#', '....#.', '...#..', '..#...', '.#.#..', '#.....'],
  lacos: ['.####.', '#....#', '#.##.#', '#.#..#', '#.###.', '.#....'],
  alfinete: ['.####.', '##..##', '##..##', '.####.', '..##..', '..##..'],
  raio: ['...##.', '..##..', '.####.', '..##..', '.##...', '.#....'],
  trofeu: ['######', '#.##.#', '.####.', '..##..', '..##..', '.####.'],
  terminal: ['#.....', '.#....', '..#...', '.#....', '#.####', '......'],
  dez: ['#..##.', '#.#..#', '#.#..#', '#.#..#', '#.#..#', '#..##.'],
  foguete: ['..##..', '.####.', '######', '..##..', '..##..', '..##..'],
  camiseta: ['##..##', '######', '.####.', '.####.', '.####.', '.####.'],
  coroa: ['..##..', '..##..', '......', '##..##', '##..##', '......'],
  joia: ['.####.', '#.##.#', '######', '.####.', '..##..', '......'],
} as const

/** Formato do medalhão: redondo (estudo), losango (código) ou escudo (especiais). */
type Formato = 'circulo' | 'losango' | 'escudo'

const ESTILOS: Record<string, Estilo> = {
  // Estudo: medalhão redondo
  'primeira-aula': { fita: ['#22d3ee', '#0e7490'], metal: ['#155e75', '#67e8f9', '#ecfeff'], icone: '#083344', desenho: ICONES.numeroUm },
  maratonista: { fita: ['#fb923c', '#c2410c'], metal: ['#9a3412', '#fdba74', '#fff7ed'], icone: '#7c2d12', desenho: ICONES.chama },
  'unidade-completa': { fita: ['#a78bfa', '#6d28d9'], metal: ['#5b21b6', '#c4b5fd', '#f5f3ff'], icone: '#2e1065', desenho: ICONES.confere },
  destaque: { fita: ['#f87171', '#b91c1c'], metal: ['#a16207', '#facc15', '#fefce8'], icone: '#713f12', desenho: ICONES.estrela },
  explorador: { fita: ['#2dd4bf', '#0f766e'], metal: ['#115e59', '#5eead4', '#f0fdfa'], icone: '#042f2e', desenho: ICONES.alfinete },
  incansavel: { fita: ['#fbbf24', '#b45309'], metal: ['#92400e', '#fcd34d', '#fffbeb'], icone: '#451a03', desenho: ICONES.raio },
  // Laboratório: losango
  'primeiro-codigo': { formato: 'losango', fita: ['#4ade80', '#15803d'], metal: ['#166534', '#86efac', '#f0fdf4'], icone: '#052e16', desenho: ICONES.terminal },
  'nota-dez': { formato: 'losango', fita: ['#a3e635', '#4d7c0f'], metal: ['#3f6212', '#bef264', '#f7fee7'], icone: '#1a2e05', desenho: ICONES.dez },
  'cacador-de-bugs': { formato: 'losango', fita: ['#f472b6', '#be185d'], metal: ['#9d174d', '#f9a8d4', '#fdf2f8'], icone: '#500724', desenho: ICONES.inseto },
  'mestre-dos-lacos': { formato: 'losango', fita: ['#38bdf8', '#0369a1'], metal: ['#075985', '#7dd3fc', '#f0f9ff'], icone: '#082f49', desenho: ICONES.lacos },
  'programador-de-bordo': { formato: 'losango', fita: ['#60a5fa', '#1d4ed8'], metal: ['#1e40af', '#93c5fd', '#eff6ff'], icone: '#172554', desenho: ICONES.codigo },
  // Série da cobra (Python): medalhão redondo com uma cobra original enrolada no anel
  cobrinha: { cobra: ['#4ade80', '#166534'], fita: ['#facc15', '#a16207'], metal: ['#a16207', '#fef08a', '#fefce8'], icone: '#713f12', desenho: ICONES.ovo },
  'ninho-de-cobras': { cobra: ['#4ade80', '#166534'], fita: ['#d6a36a', '#7c4a1e'], metal: ['#7c4a1e', '#e7c9a0', '#fdf6ec'], icone: '#3b2410', desenho: ICONES.calendario },
  'cobra-criada': { cobra: ['#facc15', '#15803d'], fita: ['#22c55e', '#14532d'], metal: ['#14532d', '#86efac', '#f0fdf4'], icone: '#052e16', desenho: ICONES.presas },
  'encantador-de-serpentes': { cobra: ['#facc15', '#15803d'], fita: ['#c084fc', '#7e22ce'], metal: ['#6b21a8', '#d8b4fe', '#faf5ff'], icone: '#3b0764', desenho: ICONES.flauta },
  // Especiais: escudo
  'disciplina-completa': { formato: 'escudo', fita: ['#e879f9', '#a21caf'], metal: ['#a16207', '#facc15', '#fefce8'], icone: '#713f12', desenho: ICONES.trofeu },
  estilista: { formato: 'escudo', fita: ['#fb7185', '#be123c'], metal: ['#9f1239', '#fda4af', '#fff1f2'], icone: '#4c0519', desenho: ICONES.camiseta },
  'destaque-triplo': { formato: 'escudo', fita: ['#f87171', '#b91c1c'], metal: ['#854d0e', '#fde047', '#fefce8'], icone: '#713f12', desenho: ICONES.coroa },
  'estrela-em-ascensao': { formato: 'escudo', fita: ['#818cf8', '#4338ca'], metal: ['#3730a3', '#a5b4fc', '#eef2ff'], icone: '#1e1b4b', desenho: ICONES.foguete },
  colecionador: { formato: 'escudo', fita: ['#34d399', '#047857'], metal: ['#065f46', '#6ee7b7', '#ecfdf5'], icone: '#022c22', desenho: ICONES.joia },
}

/** Cobra em pé (9×12): B corpo, L listra, O olho, T língua. Arte original, não é o logo do Python. */
const COBRA = [
  '..BBBB...',
  '.BBOBBB.T',
  '.BBBBBBT.',
  '...LBB...',
  '..BBL....',
  '.BBL.....',
  '.LBB.....',
  '..BBL....',
  '...LBB...',
  '....BBL..',
  '.LBBBBB..',
  '..BBLL...',
] as const

const CX = 8.5
const CY = 13.5

/** O ponto (x, y) fica dentro do medalhão encolhido em "margem" pixels? */
const DENTRO: Record<Formato, (x: number, y: number, margem: number) => boolean> = {
  circulo: (x, y, m) => (x - CX) ** 2 + (y - CY) ** 2 <= (6.5 - m) ** 2,
  losango: (x, y, m) => Math.abs(x - CX) + Math.abs(y - CY) <= 7.5 - m * 1.25,
  escudo: (x, y, m) =>
    y >= 7 + m && y <= 20 - m && Math.abs(x - CX) <= 6.5 - m - Math.max(0, y - 14) * 0.9,
}

const PADRAO: Estilo = { fita: ['#94a3b8', '#475569'], metal: ['#a16207', '#facc15', '#fefce8'], icone: '#713f12', desenho: ICONES.estrela }

/** Cinza para a medalha que ainda falta. */
const APAGADA = {
  fita: ['#475569', '#334155'],
  metal: ['#334155', '#64748b', '#94a3b8'],
  icone: '#1e293b',
  cobra: ['#94a3b8', '#475569'],
} as const

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
  const dentro = DENTRO[estilo.formato ?? 'circulo']
  for (let y = 5; y < ALTURA_MEDALHA - 1; y++) {
    for (let x = 1; x < LARGURA_MEDALHA - 1; x++) {
      if (dentro(x, y, 0)) pintar(x, y, dentro(x, y, 2) ? metal[1] : metal[0])
    }
  }
  // Brilho no alto, à esquerda.
  pintar(6, 10, metal[2])
  pintar(5, 11, metal[2])
  pintar(5, 12, metal[2])

  // Série da cobra: uma cobra original em pé no medalhão, no lugar do ícone.
  if (estilo.cobra) {
    const [corpo, listra] = apagada ? APAGADA.cobra : estilo.cobra
    const cores: Record<string, string> = {
      B: corpo,
      L: listra,
      O: apagada ? '#0f172a' : '#0b0e1c',
      T: apagada ? '#64748b' : '#ef4444',
    }
    const ehCobra = (x: number, y: number) => {
      const c = COBRA[y - 8]?.[x - 5]
      return c === 'B' || c === 'L' || c === 'O'
    }
    // Contorno escuro só em volta da cobra, para ela se destacar do metal.
    for (let y = 7; y <= 20; y++) {
      for (let x = 4; x <= 15; x++) {
        if (ehCobra(x, y) || !dentro(x, y, 0)) continue
        if (ehCobra(x - 1, y) || ehCobra(x + 1, y) || ehCobra(x, y - 1) || ehCobra(x, y + 1)) pintar(x, y, CONTORNO)
      }
    }
    COBRA.forEach((linha, dy) => {
      for (let dx = 0; dx < linha.length; dx++) {
        const cor = cores[linha[dx] ?? '.']
        if (cor) pintar(5 + dx, 8 + dy, cor)
      }
    })
  }

  // Ícone 6×6 no centro.
  if (!estilo.cobra) estilo.desenho.forEach((linha, dy) => {
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
