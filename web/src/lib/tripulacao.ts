import type { Escolhas } from '../arte/avatar'
import { avatarPadrao, limparEscolhas } from './avatar'
import { carregarMedalhas, type MedalhaDoAluno } from './medalhas'
import { carregarXpDaTurma, type XpDoAluno } from './progresso'
import { supabase } from './supabase'

// Tripulação: a turma vista pelo professor, com o boneco de cada aluno.
// Só o professor lê os avatares e as entregas de todos (RLS).

export interface TripulanteDaTurma extends XpDoAluno {
  escolhas: Escolhas
}

/** Alunos aprovados da turma, com XP, patente e o boneco que cada um montou. */
export async function carregarTripulacao(ofertaId: number): Promise<TripulanteDaTurma[]> {
  const alunos = await carregarXpDaTurma(ofertaId)
  if (alunos.length === 0) return []
  const { data, error } = await supabase()
    .from('avatares')
    .select('perfil_id, escolhas')
    .in(
      'perfil_id',
      alunos.map((a) => a.alunoId),
    )
  // O boneco é um extra: se falhar, todos aparecem com o boneco padrão.
  const porPerfil = new Map((error ? [] : data).map((a) => [a.perfil_id, limparEscolhas(a.escolhas)]))
  return alunos.map((a) => ({ ...a, escolhas: { ...avatarPadrao('aluno'), ...porPerfil.get(a.alunoId) } }))
}

export interface EntregaNoPerfil {
  id: number
  exercicio: string
  nota: number
  situacao: 'a_confirmar' | 'confirmada' | 'nao_confere'
  corrigida: boolean
  devolvida: boolean
  criadoEm: string
}

export interface PerfilDoAluno {
  medalhas: MedalhaDoAluno[]
  entregas: EntregaNoPerfil[]
}

/** Medalhas e últimas entregas de um aluno. */
export async function carregarPerfilDoAluno(alunoId: string): Promise<PerfilDoAluno> {
  const [medalhas, entregas] = await Promise.all([
    carregarMedalhas(alunoId),
    supabase()
      .from('entregas')
      .select('id, nota, nota_professor, situacao, corrigida_em, devolvida_em, criado_em, exercicio:exercicios!inner(titulo)')
      .eq('aluno_id', alunoId)
      .order('criado_em', { ascending: false })
      .limit(10),
  ])
  if (entregas.error) throw entregas.error
  return {
    medalhas,
    entregas: entregas.data.map((e) => ({
      id: e.id,
      exercicio: e.exercicio.titulo,
      nota: Number(e.nota_professor ?? e.nota),
      situacao: e.situacao as EntregaNoPerfil['situacao'],
      corrigida: e.corrigida_em !== null,
      devolvida: e.devolvida_em !== null,
      criadoEm: e.criado_em,
    })),
  }
}
