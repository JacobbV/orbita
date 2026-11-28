import type { Escolhas } from '../arte/avatar'
import { avatarPadrao, limparEscolhas } from './avatar'
import { supabase } from './supabase'

// Ranking opcional por apelido. O banco decide quem aparece e o que sai:
// só apelido, boneco, patente, XP e posição (nunca nome nem e-mail).

export type PeriodoDoRanking = 'semana' | 'geral'

export const NOME_DO_PERIODO: Record<PeriodoDoRanking, string> = { semana: 'Semana', geral: 'Geral' }

export interface SituacaoNoRanking {
  participando: boolean
  temApelido: boolean
  podeEntrar: boolean
}

export interface LinhaDoRanking {
  posicao: number
  apelido: string
  escolhas: Escolhas
  patente: string
  xp: number
  ehVoce: boolean
}

export interface LinhaDoProfessor {
  alunoId: string
  nome: string
  apelido: string
  posicao: number
  xp: number
  patente: string
  entrouEm: string
}

export async function minhaSituacaoNoRanking(): Promise<SituacaoNoRanking> {
  const { data, error } = await supabase().rpc('minha_situacao_no_ranking')
  if (error) throw error
  const s = data[0]
  return { participando: s?.participando ?? false, temApelido: s?.tem_apelido ?? false, podeEntrar: s?.pode_entrar ?? false }
}

export async function entrarNoRanking(): Promise<void> {
  const { error } = await supabase().rpc('entrar_no_ranking')
  if (error) throw error
}

export async function sairDoRanking(): Promise<void> {
  const { error } = await supabase().rpc('sair_do_ranking')
  if (error) throw error
}

/** Top 10 da turma e, se estiver abaixo, a linha de quem pede. */
export async function carregarRanking(turmaId: number, periodo: PeriodoDoRanking): Promise<LinhaDoRanking[]> {
  const { data, error } = await supabase().rpc('ranking_da_turma', { p_turma_id: turmaId, p_periodo: periodo })
  if (error) throw error
  return data.map((l) => ({
    posicao: l.posicao,
    apelido: l.apelido,
    escolhas: { ...avatarPadrao('aluno'), ...limparEscolhas(l.escolhas) },
    patente: l.patente,
    xp: l.xp,
    ehVoce: l.eh_voce,
  }))
}

/** Professor: todos os participantes da turma, com o nome real. */
export async function carregarRankingDoProfessor(turmaId: number, periodo: PeriodoDoRanking): Promise<LinhaDoProfessor[]> {
  const { data, error } = await supabase().rpc('ranking_da_turma_professor', { p_turma_id: turmaId, p_periodo: periodo })
  if (error) throw error
  return data.map((l) => ({
    alunoId: l.aluno_id,
    nome: l.nome,
    apelido: l.apelido,
    posicao: l.posicao,
    xp: l.xp,
    patente: l.patente,
    entrouEm: l.entrou_em,
  }))
}

export async function tirarDoRanking(alunoId: string): Promise<void> {
  const { error } = await supabase().rpc('tirar_do_ranking', { p_aluno_id: alunoId })
  if (error) throw error
}

/** Turmas distintas em que o aluno está aprovado. */
export function turmasAprovadas<T extends { status: string; oferta: { turma: { id: number; nome: string } } }>(
  pedidos: T[],
): Array<{ id: number; nome: string }> {
  const vistas = new Map<number, string>()
  for (const p of pedidos) if (p.status === 'aprovado') vistas.set(p.oferta.turma.id, p.oferta.turma.nome)
  return [...vistas].map(([id, nome]) => ({ id, nome }))
}

/** O banco manda até 10 linhas e, se a pessoa estiver abaixo, a linha dela por último. */
export function separarVoce(linhas: LinhaDoRanking[]): { top: LinhaDoRanking[]; voce: LinhaDoRanking | null } {
  const ultima = linhas[linhas.length - 1]
  if (linhas.length > 10 && ultima?.ehVoce) return { top: linhas.slice(0, -1), voce: ultima }
  return { top: linhas, voce: null }
}
