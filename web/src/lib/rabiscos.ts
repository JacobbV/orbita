// Rabiscos sobre os slides: tipos e contas simples (sem tela), para testar.
// As coordenadas ficam no palco de 1920 x 1080 do slide, não na tela, para o
// rabisco continuar no lugar certo em qualquer tamanho, em tela cheia ou não.

export const LARGURA_DO_PALCO = 1920
export const ALTURA_DO_PALCO = 1080

export type TipoDeTraco = 'l' | 'm' | 'b'

export interface Traco {
  /** Cor, como #rrggbb. */
  c: string
  /** Espessura em unidades do palco. */
  w: number
  /** l = lápis, m = marca-texto. */
  t: 'l' | 'm'
  /** x0, y0, x1, y1, ... em unidades do palco, inteiros. */
  p: number[]
}

/** Rabiscos de um slide por número do slide (1 = primeiro). */
export type RabiscosPorSlide = Record<string, Traco[]>

export const CORES_DO_LAPIS = [
  { nome: 'Preto', valor: '#111827' },
  { nome: 'Vermelho', valor: '#e11d48' },
  { nome: 'Azul', valor: '#2563eb' },
  { nome: 'Verde', valor: '#16a34a' },
  { nome: 'Amarelo', valor: '#facc15' },
] as const

export const ESPESSURAS = [
  { nome: 'Fino', valor: 4 },
  { nome: 'Médio', valor: 8 },
  { nome: 'Grosso', valor: 16 },
] as const

/** O marca-texto é largo e deixa ver o que está embaixo. */
export const FATOR_DO_MARCA_TEXTO = 3
export const OPACIDADE_DO_MARCA_TEXTO = 0.4

/** Limite do banco é 400 mil letras; o site para um pouco antes. */
export const LIMITE_DE_TEXTO = 380_000
export const MAX_TRACOS_POR_SLIDE = 400
export const MAX_PONTOS_POR_TRACO = 1500

export interface Area {
  largura: number
  altura: number
}

/** Onde o palco de 1920 x 1080 fica dentro da área do slide (centralizado, sem cortar). */
export function enquadrar({ largura, altura }: Area): { escala: number; x: number; y: number } {
  const escala = Math.min(largura / LARGURA_DO_PALCO, altura / ALTURA_DO_PALCO) || 1
  return { escala, x: (largura - LARGURA_DO_PALCO * escala) / 2, y: (altura - ALTURA_DO_PALCO * escala) / 2 }
}

/** Ponto da tela (relativo à área) para o palco. */
export function daTelaParaOPalco(px: number, py: number, area: Area): [number, number] {
  const { escala, x, y } = enquadrar(area)
  return [Math.round((px - x) / escala), Math.round((py - y) / escala)]
}

/** Ponto do palco para a tela (relativo à área). */
export function doPalcoParaATela(qx: number, qy: number, area: Area): [number, number] {
  const { escala, x, y } = enquadrar(area)
  return [x + qx * escala, y + qy * escala]
}

/** Quantos pontos do traço o toque deixa de guardar: perto demais do anterior. */
const DISTANCIA_MINIMA = 3

export function acrescentarPonto(traco: Traco, qx: number, qy: number): Traco {
  const n = traco.p.length
  if (n >= MAX_PONTOS_POR_TRACO * 2) return traco
  const ultimoX = traco.p[n - 2]
  const ultimoY = traco.p[n - 1]
  if (ultimoX !== undefined && ultimoY !== undefined && Math.hypot(qx - ultimoX, qy - ultimoY) < DISTANCIA_MINIMA) return traco
  return { ...traco, p: [...traco.p, qx, qy] }
}

function distanciaAoSegmento(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const quadrado = dx * dx + dy * dy
  const t = quadrado === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / quadrado))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Tira os traços que passam a menos de `raio` do ponto (borracha). Devolve a mesma lista se nada saiu. */
export function apagarPerto(tracos: Traco[], qx: number, qy: number, raio: number): Traco[] {
  const sobrou = tracos.filter((t) => {
    const folga = raio + (t.t === 'm' ? t.w * FATOR_DO_MARCA_TEXTO : t.w) / 2
    if (t.p.length === 2) return Math.hypot(qx - (t.p[0] ?? 0), qy - (t.p[1] ?? 0)) > folga
    for (let i = 0; i + 3 < t.p.length; i += 2) {
      if (distanciaAoSegmento(qx, qy, t.p[i]!, t.p[i + 1]!, t.p[i + 2]!, t.p[i + 3]!) <= folga) return false
    }
    return true
  })
  return sobrou.length === tracos.length ? tracos : sobrou
}

/** Tamanho aproximado do que vai para o banco. */
export function tamanhoDosRabiscos(r: RabiscosPorSlide): number {
  return JSON.stringify(r).length
}

/** Lê o que veio do banco, descartando o que não tem a forma certa. */
export function lerRabiscos(bruto: unknown): RabiscosPorSlide {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {}
  const saida: RabiscosPorSlide = {}
  for (const [slide, lista] of Object.entries(bruto as Record<string, unknown>)) {
    if (!/^\d{1,3}$/.test(slide) || !Array.isArray(lista)) continue
    const tracos = lista.flatMap((t): Traco[] => {
      if (!t || typeof t !== 'object') return []
      const { c, w, t: tipo, p } = t as Record<string, unknown>
      if (typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) return []
      if (typeof w !== 'number' || w < 1 || w > 64) return []
      if (tipo !== 'l' && tipo !== 'm') return []
      if (!Array.isArray(p) || p.length < 2 || p.length % 2 !== 0 || !p.every((n) => typeof n === 'number' && Number.isFinite(n))) return []
      return [{ c, w, t: tipo, p: p as number[] }]
    })
    if (tracos.length > 0) saida[slide] = tracos.slice(0, MAX_TRACOS_POR_SLIDE)
  }
  return saida
}
