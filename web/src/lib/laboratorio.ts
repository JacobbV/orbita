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

// ---------------------------------------------------------------------------
// Entregas do aluno
// ---------------------------------------------------------------------------

export type SituacaoDaEntrega = 'a_confirmar' | 'confirmada' | 'nao_confere'

export const NOME_DA_SITUACAO: Record<SituacaoDaEntrega, string> = {
  a_confirmar: 'a confirmar pelo professor',
  confirmada: 'confirmada pelo professor',
  nao_confere: 'não conferiu na reconferência',
}

export interface EntregaDoAluno {
  id: number
  tentativa: number
  testesCertos: number
  testesTotal: number
  situacao: SituacaoDaEntrega
  criadoEm: string
  /** Nota pelos testes (0 a 10). */
  nota: number
  /** Nota ajustada pelo professor; quando existe, vale no lugar da nota dos testes. */
  notaProfessor: number | null
  comentario: string | null
  /** Quando o professor devolveu a entrega para o aluno refazer. */
  devolvidaEm: string | null
}

/** A nota que vale: a do professor, se ele ajustou, ou a dos testes. */
export function notaQueVale(e: Pick<EntregaDoAluno, 'nota' | 'notaProfessor'>): number {
  return e.notaProfessor ?? e.nota
}

/** O aluno já entregou e o professor ainda não devolveu: não dá para entregar de novo. */
export function entregaEmAberto(entregas: Pick<EntregaDoAluno, 'devolvidaEm'>[]): boolean {
  return entregas.some((e) => e.devolvidaEm === null)
}

/** Entregas do próprio aluno neste exercício, da mais nova para a mais antiga. */
export async function minhasEntregas(exercicioId: number, alunoId: string): Promise<EntregaDoAluno[]> {
  const { data, error } = await supabase()
    .from('entregas')
    .select('id, tentativa, testes_certos, testes_total, situacao, criado_em, nota, nota_professor, comentario, devolvida_em')
    .eq('exercicio_id', exercicioId)
    .eq('aluno_id', alunoId)
    .order('tentativa', { ascending: false })
  if (error) throw error
  return data.map((e) => ({
    id: e.id,
    tentativa: e.tentativa,
    testesCertos: e.testes_certos,
    testesTotal: e.testes_total,
    situacao: e.situacao as SituacaoDaEntrega,
    criadoEm: e.criado_em,
    nota: Number(e.nota),
    notaProfessor: e.nota_professor === null ? null : Number(e.nota_professor),
    comentario: e.comentario,
    devolvidaEm: e.devolvida_em,
  }))
}

/** Guarda o código e o resultado medido no navegador. Acertou tudo pela primeira vez: XP a confirmar. */
export async function entregar(exercicioId: number, codigo: string, testesCertos: number): Promise<{ tentativa: number; conquista: unknown }> {
  const { data, error } = await supabase().rpc('entregar', {
    p_exercicio_id: exercicioId,
    p_codigo: codigo,
    p_testes_certos: testesCertos,
  })
  if (error) throw error
  const d = (data ?? {}) as { tentativa?: number }
  return { tentativa: d.tentativa ?? 0, conquista: data }
}
