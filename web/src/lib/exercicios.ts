import { supabase } from './supabase'

// Exercícios no painel do professor: lista da aula, criar, editar e remover.
// O professor lê a tabela de testes inteira (inclusive ocultos e secretos).

export type TipoDeTeste = 'visivel' | 'oculto' | 'secreto'

export interface TesteDoProfessor {
  tipo: TipoDeTeste
  entrada: string
  saidaEsperada: string
}

export interface ExercicioDoPainel {
  id: number
  titulo: string
  enunciado: string
  dificuldade: 1 | 2 | 3
  codigoInicial: string
  testes: TesteDoProfessor[]
  /** Quantas entregas de alunos já existem (com entregas, não pode remover). */
  entregas: number
}

export interface AulaComExercicios {
  aula: { id: number; numero: number; titulo: string; unidade: number; sigla: string; disciplina: string }
  exercicios: ExercicioDoPainel[]
}

export const NOME_DO_TIPO: Record<TipoDeTeste, string> = {
  visivel: 'Visível',
  oculto: 'Oculto',
  secreto: 'Secreto',
}

export const EXPLICACAO_DO_TIPO: Record<TipoDeTeste, string> = {
  visivel: 'O aluno vê a entrada e a resposta.',
  oculto: 'O aluno vê se acertou, mas nunca a resposta.',
  secreto: 'O aluno nem sabe que existe. Só entra na sua reconferência.',
}

export const MAX_TESTES = 30

export async function carregarAulaComExercicios(aulaId: number): Promise<AulaComExercicios | null> {
  const { data, error } = await supabase()
    .from('aulas')
    .select(
      'id, numero, titulo, unidade:unidades!inner(numero, disciplina:disciplinas!inner(sigla, nome)), exercicios(id, titulo, enunciado, dificuldade, codigo_inicial, ordem, testes(tipo, entrada, saida_esperada, ordem), entregas(count))',
    )
    .eq('id', aulaId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    aula: {
      id: data.id,
      numero: data.numero,
      titulo: data.titulo,
      unidade: data.unidade.numero,
      sigla: data.unidade.disciplina.sigla,
      disciplina: data.unidade.disciplina.nome,
    },
    exercicios: [...data.exercicios]
      .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
      .map((e) => ({
        id: e.id,
        titulo: e.titulo,
        enunciado: e.enunciado,
        dificuldade: e.dificuldade as 1 | 2 | 3,
        codigoInicial: e.codigo_inicial,
        testes: [...e.testes]
          .sort((a, b) => a.ordem - b.ordem)
          .map((t) => ({ tipo: t.tipo as TipoDeTeste, entrada: t.entrada, saidaEsperada: t.saida_esperada })),
        entregas: e.entregas[0]?.count ?? 0,
      })),
  }
}

export interface DadosDoExercicio {
  titulo: string
  enunciado: string
  dificuldade: 1 | 2 | 3
  codigoInicial: string
  testes: TesteDoProfessor[]
}

export type ErrosDoExercicio = Partial<Record<'titulo' | 'enunciado' | 'testes', string>> & {
  /** Erro de cada teste, pela posição na lista. */
  porTeste?: Record<number, string>
}

/** Mesmas regras do banco, para avisar antes de enviar. */
export function validarExercicio(d: DadosDoExercicio): ErrosDoExercicio {
  const erros: ErrosDoExercicio = {}
  if (!d.titulo.trim()) erros.titulo = 'Escreva o título do exercício.'
  else if (d.titulo.trim().length > 160) erros.titulo = 'Use até 160 letras no título.'
  if (!d.enunciado.trim()) erros.enunciado = 'Escreva o enunciado do exercício.'
  if (d.testes.length === 0) erros.testes = 'Coloque pelo menos um teste.'
  else if (d.testes.length > MAX_TESTES) erros.testes = `Use até ${MAX_TESTES} testes.`
  else if (!d.testes.some((t) => t.tipo !== 'secreto'))
    erros.testes = 'Coloque pelo menos um teste visível ou oculto: é com eles que o aluno confere o código.'
  const porTeste: Record<number, string> = {}
  d.testes.forEach((t, i) => {
    if (!t.saidaEsperada.trim()) porTeste[i] = 'Escreva a saída esperada (ou preencha com a sua solução).'
  })
  if (Object.keys(porTeste).length > 0) erros.porTeste = porTeste
  return erros
}

export function temErros(e: ErrosDoExercicio): boolean {
  return Boolean(e.titulo || e.enunciado || e.testes || e.porTeste)
}

/** Cria (id null) ou edita o exercício com os testes, de uma vez só. Devolve o id. */
export async function salvarExercicio(id: number | null, aulaId: number, d: DadosDoExercicio): Promise<number> {
  const { data, error } = await supabase().rpc('salvar_exercicio', {
    // null cria um exercício novo; o tipo gerado não sabe que o banco aceita null.
    p_id: id as number,
    p_aula_id: aulaId,
    p_titulo: d.titulo.trim(),
    p_enunciado: d.enunciado,
    p_dificuldade: d.dificuldade,
    p_codigo_inicial: d.codigoInicial,
    p_testes: d.testes.map((t) => ({ tipo: t.tipo, entrada: t.entrada, saida_esperada: t.saidaEsperada })),
  })
  if (error) throw error
  return data
}

export async function removerExercicio(id: number): Promise<void> {
  const { error } = await supabase().rpc('remover_exercicio', { p_id: id })
  if (error) throw error
}
