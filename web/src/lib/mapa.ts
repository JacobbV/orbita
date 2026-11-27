import type { AulaDaPonte, DisciplinaDaPonte, UnidadeDaPonte } from './ponte'
import { aulaParaContinuar } from './ponte'

/** Cores dos planetas, na ordem das unidades (paleta do Órbita). */
export const CORES_DAS_UNIDADES = ['var(--ciano)', 'var(--nebulosa)', 'var(--estrela)', 'var(--plasma)'] as const

/** Cor da unidade pelo número dela (1, 2, 3...). Repete a paleta depois da quarta. */
export function corDaUnidade(numero: number): string {
  const i = (((numero - 1) % CORES_DAS_UNIDADES.length) + CORES_DAS_UNIDADES.length) % CORES_DAS_UNIDADES.length
  return CORES_DAS_UNIDADES[i] as string
}

export type SituacaoDoPlaneta = 'bloqueado' | 'em-andamento' | 'completo' | 'em-breve'

/** Situação pelo que o professor liberou (o site não marca "concluída": só sabe o que está liberado). */
export function situacaoDoPlaneta(u: Pick<UnidadeDaPonte, 'aulas' | 'liberadas'>): SituacaoDoPlaneta {
  if (u.aulas.length === 0) return 'em-breve'
  if (u.liberadas === 0) return 'bloqueado'
  return u.liberadas === u.aulas.length ? 'completo' : 'em-andamento'
}

export function resumoDoPlaneta(u: Pick<UnidadeDaPonte, 'aulas' | 'liberadas'>): string {
  const s = situacaoDoPlaneta(u)
  if (s === 'em-breve') return 'aulas em breve'
  if (s === 'bloqueado') return 'nenhuma aula liberada'
  return `${u.liberadas} de ${u.aulas.length} ${u.aulas.length === 1 ? 'liberada' : 'liberadas'}`
}

/** Unidade em que o aluno está: a da aula para continuar; senão a primeira com aula liberada; senão a primeira. */
export function unidadeAtual(d: DisciplinaDaPonte, ultimaAulaId: number | null): UnidadeDaPonte | null {
  const continuar = aulaParaContinuar([d], ultimaAulaId)
  if (continuar) return continuar.unidade
  return d.unidades.find((u) => u.liberadas > 0) ?? d.unidades[0] ?? null
}

/** Posição do planeta na trilha (em %), alternando em cima e embaixo. */
export function posicaoNaTrilha(indice: number, total: number): { x: number; y: number } {
  return { x: ((indice + 0.5) / total) * 100, y: indice % 2 === 0 ? 62 : 38 }
}

export type { AulaDaPonte }
