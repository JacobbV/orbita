// Cálculos do fundo de estrelas, separados do desenho para poder testar.

export interface Star {
  /** Posição relativa (0 a 1), para não precisar sortear de novo ao redimensionar. */
  x: number
  y: number
  radius: number
  /** Opacidade base, de 0 a 1. */
  alpha: number
  color: string
  /** Fase e velocidade do brilho, usadas só quando há animação. */
  phase: number
  speed: number
}

/** Uma estrela a cada tantos pixels quadrados de tela. */
const AREA_POR_ESTRELA = 9000
export const MIN_STARS = 40
export const MAX_STARS = 320
/** Abaixo desta largura é celular: menos estrelas, para poupar bateria. */
export const LARGURA_CELULAR = 600
export const MAX_STARS_CELULAR = 90

/** Quantas estrelas desenhar para uma tela deste tamanho. */
export function starCount(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 0
  const porArea = Math.round((width * height) / AREA_POR_ESTRELA)
  const teto = width < LARGURA_CELULAR ? MAX_STARS_CELULAR : MAX_STARS
  return Math.max(MIN_STARS, Math.min(teto, porArea))
}

const CORES = ['#E5E7F5', '#E5E7F5', '#E5E7F5', '#A78BFA', '#22D3EE', '#FBBF24']

/** Gera estrelas com um sorteio previsível (mesma semente, mesmo céu). */
export function generateStars(count: number, seed = 42): Star[] {
  const random = mulberry32(seed)
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    const big = random() < 0.08
    stars.push({
      x: random(),
      y: random(),
      radius: big ? 1.2 + random() * 0.8 : 0.5 + random() * 0.7,
      alpha: 0.35 + random() * 0.6,
      color: CORES[Math.floor(random() * CORES.length)] ?? '#E5E7F5',
      phase: random() * Math.PI * 2,
      speed: 0.4 + random() * 1.2,
    })
  }
  return stars
}

/** Gerador de números pseudoaleatórios pequeno e rápido. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
