import { lerModo, type ModoDeConferencia, type RegraDeConferencia } from '../lab/correcao'
import type { Linguagem } from '../lab/linguagens'
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
  linguagem: Linguagem
  codigoInicial: string
  testes: TesteDoProfessor[]
  /** Como a saída é conferida e as palavras extras que contam. */
  conferencia: ModoDeConferencia
  palavrasExtras: string
  /** Quantas entregas de alunos já existem (com entregas, não pode remover). */
  entregas: number
  /** Entregas esperando a reconferência do professor. */
  aConfirmar: number
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
      'id, numero, titulo, unidade:unidades!inner(numero, disciplina:disciplinas!inner(sigla, nome)), exercicios(id, titulo, enunciado, dificuldade, linguagem, codigo_inicial, conferencia, palavras_extras, ordem, testes(tipo, entrada, saida_esperada, ordem), entregas(situacao))',
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
        linguagem: e.linguagem as Linguagem,
        codigoInicial: e.codigo_inicial,
        conferencia: lerModo(e.conferencia),
        palavrasExtras: e.palavras_extras,
        testes: [...e.testes]
          .sort((a, b) => a.ordem - b.ordem)
          .map((t) => ({ tipo: t.tipo as TipoDeTeste, entrada: t.entrada, saidaEsperada: t.saida_esperada })),
        entregas: e.entregas.length,
        aConfirmar: e.entregas.filter((x) => x.situacao === 'a_confirmar').length,
      })),
  }
}

export interface DadosDoExercicio {
  titulo: string
  enunciado: string
  dificuldade: 1 | 2 | 3
  linguagem: Linguagem
  codigoInicial: string
  testes: TesteDoProfessor[]
  conferencia: ModoDeConferencia
  palavrasExtras: string
}

/** Regra de conferência de um exercício, no formato da correção. */
export const regraDe = (d: { conferencia: ModoDeConferencia; palavrasExtras: string }): RegraDeConferencia => ({
  modo: d.conferencia,
  palavras: d.palavrasExtras,
})

export type ErrosDoExercicio = Partial<Record<'titulo' | 'enunciado' | 'testes' | 'palavrasExtras', string>> & {
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
  if (d.palavrasExtras.trim().length > 500) erros.palavrasExtras = 'Use até 500 letras nas palavras que também contam.'
  const porTeste: Record<number, string> = {}
  d.testes.forEach((t, i) => {
    if (!t.saidaEsperada.trim()) porTeste[i] = 'Escreva a saída esperada (ou preencha com a sua solução).'
  })
  if (Object.keys(porTeste).length > 0) erros.porTeste = porTeste
  return erros
}

export function temErros(e: ErrosDoExercicio): boolean {
  return Boolean(e.titulo || e.enunciado || e.testes || e.palavrasExtras || e.porTeste)
}

/**
 * Cria (id null) ou edita o exercício com os testes, de uma vez só. Devolve o id.
 * Aula null = questão só de prova.
 */
export async function salvarExercicio(id: number | null, aulaId: number | null, d: DadosDoExercicio): Promise<number> {
  const { data, error } = await supabase().rpc('salvar_exercicio', {
    // null cria um exercício novo; o tipo gerado não sabe que o banco aceita null.
    p_id: id as number,
    p_aula_id: aulaId as number,
    p_titulo: d.titulo.trim(),
    p_enunciado: d.enunciado,
    p_dificuldade: d.dificuldade,
    p_codigo_inicial: d.codigoInicial,
    p_testes: d.testes.map((t) => ({ tipo: t.tipo, entrada: t.entrada, saida_esperada: t.saidaEsperada })),
    p_linguagem: d.linguagem,
    p_conferencia: d.conferencia,
    p_palavras_extras: d.palavrasExtras.trim(),
  })
  if (error) throw error
  return data
}

export async function removerExercicio(id: number): Promise<void> {
  const { error } = await supabase().rpc('remover_exercicio', { p_id: id })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Reconferência: o navegador do professor roda todos os testes de novo,
// inclusive os secretos, no código de cada entrega "a confirmar".
// ---------------------------------------------------------------------------

export interface EntregaParaReconferir {
  id: number
  aluno: string
  tentativa: number
  codigo: string
  testesCertos: number
  testesTotal: number
}

export async function entregasParaReconferir(
  exercicioId: number,
  quais: 'a_confirmar' | 'todas' = 'a_confirmar',
): Promise<EntregaParaReconferir[]> {
  let consulta = supabase()
    .from('entregas')
    .select('id, tentativa, codigo, testes_certos, testes_total, aluno:perfis!inner(nome)')
    .eq('exercicio_id', exercicioId)
  if (quais === 'a_confirmar') consulta = consulta.eq('situacao', 'a_confirmar')
  const { data, error } = await consulta.order('criado_em')
  if (error) throw error
  return data.map((e) => ({
    id: e.id,
    aluno: e.aluno.nome,
    tentativa: e.tentativa,
    codigo: e.codigo,
    testesCertos: e.testes_certos,
    testesTotal: e.testes_total,
  }))
}

export async function conferirEntrega(id: number, confere: boolean): Promise<void> {
  const { error } = await supabase().rpc('conferir_entrega', { p_entrega_id: id, p_confere: confere })
  if (error) throw error
}

export interface ResultadoDoRefazer {
  mudou: boolean
  xp: number
  nota: number | null
}

/** Manda o resultado medido agora (regra atual) e o banco só melhora a entrega, nunca piora. */
export async function refazerConferencia(id: number, testesCertos: number, secretosOk: boolean): Promise<ResultadoDoRefazer> {
  const { data, error } = await supabase().rpc('refazer_conferencia', {
    p_entrega_id: id,
    p_testes_certos: testesCertos,
    p_secretos_ok: secretosOk,
  })
  if (error) throw error
  const r = data as { mudou?: boolean; xp?: number; nota?: number | null }
  return { mudou: r.mudou === true, xp: r.xp ?? 0, nota: r.nota ?? null }
}

/** Resume os testes rodados: quantos visíveis/ocultos certos e se todos os secretos passaram. */
export function resumirParaRefazer(resultados: { tipo: TipoDeTeste; certo: boolean }[]): { certos: number; secretosOk: boolean } {
  return {
    certos: resultados.filter((r) => r.tipo !== 'secreto' && r.certo).length,
    secretosOk: resultados.filter((r) => r.tipo === 'secreto').every((r) => r.certo),
  }
}

/**
 * Confere quando o resultado medido agora bate com o que o aluno enviou e,
 * para quem disse que acertou tudo, quando os testes secretos também passam.
 */
export function decidirReconferencia(
  entrega: Pick<EntregaParaReconferir, 'testesCertos' | 'testesTotal'>,
  resultados: { tipo: TipoDeTeste; certo: boolean }[],
): { confere: boolean; motivo: string } {
  const abertos = resultados.filter((r) => r.tipo !== 'secreto')
  const certosAgora = abertos.filter((r) => r.certo).length
  const secretos = resultados.filter((r) => r.tipo === 'secreto')
  const secretosCertos = secretos.filter((r) => r.certo).length
  // Dar menos do que o aluno enviou é sinal de resultado mexido. Dar mais
  // acontece quando a conferência ficou mais flexível depois da entrega.
  if (certosAgora < entrega.testesCertos) {
    return {
      confere: false,
      motivo: `A entrega dizia ${entrega.testesCertos} de ${entrega.testesTotal} testes certos, e agora deu ${certosAgora} de ${abertos.length}.`,
    }
  }
  const acertouTudo = entrega.testesTotal > 0 && entrega.testesCertos === entrega.testesTotal
  if (acertouTudo && secretosCertos < secretos.length) {
    const motivo =
      secretos.length === 1 ? 'Errou o teste secreto.' : `Errou ${secretos.length - secretosCertos} de ${secretos.length} testes secretos.`
    return { confere: false, motivo }
  }
  return {
    confere: true,
    motivo:
      secretos.length > 0 && acertouTudo
        ? `Confere: ${certosAgora} de ${abertos.length} testes e ${secretos.length === 1 ? 'o secreto' : `os ${secretos.length} secretos`}.`
        : `Confere: ${certosAgora} de ${abertos.length} testes certos.`,
  }
}

/** Formulário vazio: um teste visível e um oculto para começar. */
export const NOVO_EXERCICIO: DadosDoExercicio = {
  titulo: '',
  enunciado: '',
  dificuldade: 1,
  linguagem: 'python',
  codigoInicial: '',
  conferencia: 'valores',
  palavrasExtras: '',
  testes: [
    { tipo: 'visivel', entrada: '', saidaEsperada: '' },
    { tipo: 'oculto', entrada: '', saidaEsperada: '' },
  ],
}

// ---------------------------------------------------------------------------
// Visão geral dos exercícios (aba Exercícios do painel)
// ---------------------------------------------------------------------------

export interface ExercicioDaVisao {
  id: number
  titulo: string
  dificuldade: number
  linguagem: Linguagem
  entregas: number
  aConfirmar: number
}

export interface AulaDaVisao {
  id: number
  numero: number
  titulo: string
  exercicios: ExercicioDaVisao[]
}

export interface UnidadeDaVisao {
  id: number
  numero: number
  titulo: string
  aulas: AulaDaVisao[]
}

export interface DisciplinaDaVisao {
  id: number
  sigla: string
  nome: string
  unidades: UnidadeDaVisao[]
}

/** Todas as disciplinas com unidades, aulas e os exercícios de cada aula. */
export async function listarVisaoDosExercicios(): Promise<DisciplinaDaVisao[]> {
  const { data, error } = await supabase()
    .from('unidades')
    .select(
      'id, numero, titulo, disciplina:disciplinas!inner(id, sigla, nome, ordem), aulas(id, numero, titulo, exercicios(id, titulo, dificuldade, linguagem, ordem, entregas(situacao)))',
    )
  if (error) throw error
  const porDisciplina = new Map<number, DisciplinaDaVisao & { ordem: number }>()
  for (const u of data) {
    const d = porDisciplina.get(u.disciplina.id) ?? {
      id: u.disciplina.id,
      sigla: u.disciplina.sigla,
      nome: u.disciplina.nome,
      ordem: u.disciplina.ordem,
      unidades: [],
    }
    d.unidades.push({
      id: u.id,
      numero: u.numero,
      titulo: u.titulo,
      aulas: [...u.aulas]
        .sort((a, b) => a.numero - b.numero)
        .map((a) => ({
          id: a.id,
          numero: a.numero,
          titulo: a.titulo,
          exercicios: [...a.exercicios]
            .sort((x, y) => x.ordem - y.ordem || x.id - y.id)
            .map((e) => ({
              id: e.id,
              titulo: e.titulo,
              dificuldade: e.dificuldade,
              linguagem: e.linguagem as Linguagem,
              entregas: e.entregas.length,
              aConfirmar: e.entregas.filter((x) => x.situacao === 'a_confirmar').length,
            })),
        })),
    })
    porDisciplina.set(d.id, d)
  }
  return [...porDisciplina.values()]
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map(({ ordem: _ordem, ...d }) => ({ ...d, unidades: [...d.unidades].sort((a, b) => a.numero - b.numero) }))
}

/** Total de exercícios e de entregas esperando reconferência, para o resumo da disciplina. */
export function resumoDaVisao(d: Pick<DisciplinaDaVisao, 'unidades'>): { exercicios: number; aConfirmar: number } {
  let exercicios = 0
  let aConfirmar = 0
  for (const u of d.unidades) {
    for (const a of u.aulas) {
      for (const e of a.exercicios) {
        exercicios += 1
        aConfirmar += e.aConfirmar
      }
    }
  }
  return { exercicios, aConfirmar }
}
