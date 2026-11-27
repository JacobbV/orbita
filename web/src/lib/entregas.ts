import type { Linguagem } from '../lab/linguagens'
import type { SituacaoDaEntrega } from './laboratorio'
import { carregarXpDaTurma } from './progresso'
import { supabase } from './supabase'

// Entregas dos alunos vistas pelo professor: turma → unidade → aula → exercício
// → aluno. Ele abre o código, comenta, ajusta a nota e devolve para refazer.

export interface ExercicioDasEntregas {
  id: number
  aulaId: number
  titulo: string
  linguagem: Linguagem
  unidade: number
  aula: number
  aulaTitulo: string
}

export interface EntregaDoProfessor {
  id: number
  exercicioId: number
  alunoId: string
  tentativa: number
  codigo: string
  testesCertos: number
  testesTotal: number
  nota: number
  notaProfessor: number | null
  comentario: string | null
  situacao: SituacaoDaEntrega
  criadoEm: string
  corrigidaEm: string | null
  devolvidaEm: string | null
}

export interface AlunoDasEntregas {
  alunoId: string
  nome: string
  apelido?: string | null
}

export interface DadosDasEntregas {
  alunos: AlunoDasEntregas[]
  exercicios: ExercicioDasEntregas[]
  entregas: EntregaDoProfessor[]
}

export type StatusDoAluno = 'sem_entrega' | 'entregue' | 'corrigida' | 'devolvida'

export const NOME_DO_STATUS: Record<StatusDoAluno, string> = {
  sem_entrega: 'sem entrega',
  entregue: 'entregue, falta corrigir',
  corrigida: 'corrigida',
  devolvida: 'devolvida para refazer',
}

/** A nota que vale: a ajustada pelo professor ou, sem ajuste, a dos testes. */
export function notaFinal(e: Pick<EntregaDoProfessor, 'nota' | 'notaProfessor'>): number {
  return e.notaProfessor ?? e.nota
}

/** Situação do aluno num exercício, pela entrega mais nova. */
export function statusDoAluno(entregas: Pick<EntregaDoProfessor, 'tentativa' | 'devolvidaEm' | 'corrigidaEm'>[]): StatusDoAluno {
  if (entregas.length === 0) return 'sem_entrega'
  const ultima = entregas.reduce((a, b) => (b.tentativa > a.tentativa ? b : a))
  if (ultima.devolvidaEm) return 'devolvida'
  if (ultima.corrigidaEm) return 'corrigida'
  return 'entregue'
}

export async function carregarEntregas(ofertaId: number): Promise<DadosDasEntregas> {
  const [alunos, liberadas] = await Promise.all([
    carregarXpDaTurma(ofertaId),
    supabase()
      .from('liberacoes')
      .select('aula:aulas!inner(id, numero, titulo, unidade:unidades!inner(numero), exercicios(id, titulo, linguagem, ordem))')
      .eq('turma_disciplina_id', ofertaId),
  ])
  if (liberadas.error) throw liberadas.error
  const exercicios = liberadas.data
    .flatMap(({ aula }) =>
      [...aula.exercicios]
        .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
        .map((e) => ({
          id: e.id,
          aulaId: aula.id,
          titulo: e.titulo,
          linguagem: e.linguagem as Linguagem,
          unidade: aula.unidade.numero,
          aula: aula.numero,
          aulaTitulo: aula.titulo,
        })),
    )
    .sort((a, b) => a.unidade - b.unidade || a.aula - b.aula)

  let entregas: EntregaDoProfessor[] = []
  if (exercicios.length > 0 && alunos.length > 0) {
    const { data, error } = await supabase()
      .from('entregas')
      .select(
        'id, exercicio_id, aluno_id, tentativa, codigo, testes_certos, testes_total, nota, nota_professor, comentario, situacao, criado_em, corrigida_em, devolvida_em',
      )
      .in(
        'exercicio_id',
        exercicios.map((e) => e.id),
      )
      .in(
        'aluno_id',
        alunos.map((a) => a.alunoId),
      )
      .order('tentativa', { ascending: false })
    if (error) throw error
    entregas = data.map((e) => ({
      id: e.id,
      exercicioId: e.exercicio_id,
      alunoId: e.aluno_id,
      tentativa: e.tentativa,
      codigo: e.codigo,
      testesCertos: e.testes_certos,
      testesTotal: e.testes_total,
      nota: Number(e.nota),
      notaProfessor: e.nota_professor === null ? null : Number(e.nota_professor),
      comentario: e.comentario,
      situacao: e.situacao as SituacaoDaEntrega,
      criadoEm: e.criado_em,
      corrigidaEm: e.corrigida_em,
      devolvidaEm: e.devolvida_em,
    }))
  }
  return { alunos, exercicios, entregas }
}

/** Nota de 0 a 10 digitada pelo professor (aceita vírgula). Vazio = vale a nota dos testes. */
export function lerNota(texto: string): { ok: true; nota: number | null } | { ok: false } {
  const limpo = texto.trim().replace(',', '.')
  if (limpo === '') return { ok: true, nota: null }
  if (!/^\d+(\.\d)?$/.test(limpo)) return { ok: false }
  const n = Number(limpo)
  return n >= 0 && n <= 10 ? { ok: true, nota: n } : { ok: false }
}

export async function corrigirEntrega(id: number, nota: number | null, comentario: string): Promise<void> {
  const { error } = await supabase().rpc('corrigir_entrega', {
    p_entrega_id: id,
    p_nota: nota as number,
    p_comentario: comentario,
  })
  if (error) throw error
}

export async function devolverEntrega(id: number, comentario: string): Promise<void> {
  const { error } = await supabase().rpc('devolver_entrega', { p_entrega_id: id, p_comentario: comentario })
  if (error) throw error
}
