// Plaquinhas com o nome das salas, desenhadas por cima do mapa (canvas 2D).
// Arte original, todos os direitos reservados (veja LICENCA-ARTE.md).

import { TILE, salasDo, centroDa, type Andar } from './escola'

const ABREVIADOS: Record<string, string> = {
  'Coord. Informática': 'Coord.\nInformática',
  'Espaço de leitura': 'Espaço de\nleitura',
  'Lab. de Desenho CAD': 'Lab. de\nDesenho CAD',
  'WC Feminino': 'WC\nFem.',
  'WC Masculino': 'WC\nMasc.',
  Lavanderia: 'Lav.',
  'Laboratório 1': 'Laboratório\n1',
  'Laboratório 2': 'Laboratório\n2',
}

const FONTE = "'Orbita Pixel Acentos', 'Press Start 2P', monospace"

function placa(ctx: CanvasRenderingContext2D, texto: string, cx: number, cy: number, cor: string) {
  ctx.font = `7px ${FONTE}`
  const linhas = texto.split('\n')
  const w = Math.max(...linhas.map((l) => ctx.measureText(l).width)) + 8
  const h = linhas.length * 10 + 4
  const x = Math.round(cx - w / 2)
  const y = Math.round(cy - h / 2)
  ctx.fillStyle = 'rgba(11,14,31,0.86)'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = cor
  ctx.fillRect(x, y, w, 1)
  ctx.fillRect(x, y + h - 1, w, 1)
  ctx.fillRect(x, y, 1, h)
  ctx.fillRect(x + w - 1, y, 1, h)
  ctx.fillStyle = '#E5E7F5'
  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'
  linhas.forEach((l, i) => ctx.fillText(l, Math.round(cx), y + 3 + i * 10))
}

/** Nomes das salas acesas e das escadas, na escala 1 do mapa. */
export function desenharPlacas(ctx: CanvasRenderingContext2D, andar: Andar): void {
  for (const s of salasDo(andar)) {
    if (!s.ativa) continue
    const [cx, cy] = centroDa(s)
    const cor = s.tipo === 'lab' || s.tipo === 'cad' ? '#A78BFA' : s.tipo.startsWith('wc') || s.tipo === 'lavanderia' ? '#9CA3C7' : '#22D3EE'
    placa(ctx, ABREVIADOS[s.nome] ?? s.nome, cx, cy, cor)
  }
  const extra = (t: string, x: number, y: number, cor = '#FBBF24') => placa(ctx, t, x * TILE, y * TILE, cor)
  if (andar === 'terreo') {
    extra('Escada\n(sobe)', 4.5, 6)
    extra('Escada\n(sobe)', 4.5, 42.5)
    extra('Escada do meio\n(sobe)', 30, 29.2)
    extra('Pátio aberto', 16, 24.5, '#6cb957')
    extra('Pátio aberto', 44, 26.5, '#6cb957')
  } else {
    extra('Escada\n(desce)', 4.5, 6)
    extra('Escada\n(desce)', 4.5, 42.5)
    extra('Escada\n(desce)', 30, 29.4)
    extra('Passarela coberta', 30, 15)
  }
}
