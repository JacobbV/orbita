import type { TesteDoAluno } from '../lab/correcao'
import { supabase } from './supabase'

export interface Exercicio {
  id: number
  titulo: string
  enunciado: string
  linguagem: 'python' | 'javascript' | 'html'
  codigoInicial: string
  dificuldade: 1 | 2 | 3
  aula: { id: number; numero: number; titulo: string; unidade: number; sigla: string }
}

export const XP_POR_DIFICULDADE = { 1: 20, 2: 35, 3: 50 } as const
export const NOME_DIFICULDADE = { 1: 'Fácil', 2: 'Médio', 3: 'Difícil' } as const

export class ExercicioIndisponivel extends Error {}

/** Exercício e os testes que o aluno pode receber (visíveis e ocultos). */
export async function carregarExercicio(id: number): Promise<{ exercicio: Exercicio; testes: TesteDoAluno[] }> {
  if (!Number.isInteger(id) || id <= 0) throw new ExercicioIndisponivel('Exercício não encontrado.')
  const { data, error } = await supabase()
    .from('exercicios')
    .select(
      'id, titulo, enunciado, linguagem, codigo_inicial, dificuldade, aula:aulas!inner(id, numero, titulo, unidade:unidades!inner(numero, disciplina:disciplinas!inner(sigla)))',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ExercicioIndisponivel('Este exercício não existe ou ainda não foi liberado para a sua turma.')

  const testes = await supabase().rpc('testes_do_exercicio', { p_exercicio_id: id })
  if (testes.error) throw testes.error

  const a = data.aula
  return {
    exercicio: {
      id: data.id,
      titulo: data.titulo,
      enunciado: data.enunciado,
      linguagem: data.linguagem as Exercicio['linguagem'],
      codigoInicial: data.codigo_inicial,
      dificuldade: data.dificuldade as Exercicio['dificuldade'],
      aula: { id: a.id, numero: a.numero, titulo: a.titulo, unidade: a.unidade.numero, sigla: a.unidade.disciplina.sigla },
    },
    testes: (testes.data ?? []).map((t) => ({ ...t, tipo: t.tipo as TesteDoAluno['tipo'], saida_esperada: t.saida_esperada ?? null })),
  }
}

/** Rascunho do código no próprio navegador (some se o aluno limpar os dados do site). */
export function lerRascunho(exercicioId: number): string | null {
  try {
    return localStorage.getItem(`orbita:rascunho:${exercicioId}`)
  } catch {
    return null
  }
}

export function guardarRascunho(exercicioId: number, codigo: string) {
  try {
    localStorage.setItem(`orbita:rascunho:${exercicioId}`, codigo)
  } catch {
    // Sem armazenamento (aba anônima etc.): segue sem rascunho.
  }
}
