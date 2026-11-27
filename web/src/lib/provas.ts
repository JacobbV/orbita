import type { Linguagem } from '../lab/linguagens'
import type { TesteDoProfessor, TipoDeTeste } from './exercicios'
import type { OfertaDoPainel } from './professor'
import { supabase } from './supabase'

// Provas (Fase 4). O banco confere horário, tempo e papel em cada função;
// a tela só organiza os dados.

// ---------------------------------------------------------------------------
// Datas: o campo datetime-local usa a hora do aparelho, sem fuso
// ---------------------------------------------------------------------------

const dois = (n: number) => String(n).padStart(2, '0')

/** ISO do banco → "2026-11-22T10:30" para o campo datetime-local. */
export function paraCampoDeData(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`
}

/** "2026-11-22T10:30" (hora do aparelho) → ISO para o banco. Null se inválida. */
export function doCampoDeData(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const formatoDataHora = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function dataHora(iso: string): string {
  return formatoDataHora.format(new Date(iso))
}

/** "1 h 30 min", "45 min" */
export function duracaoEmTexto(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function nomeDasSaidas(limite: number | null): string {
  return limite === null ? 'Só avisar e registrar' : `Encerra na ${limite}ª saída da aba`
}

/** Momento da prova em relação ao horário. */
export function momentoDaProva(p: { abreEm: string; fechaEm: string }, agora = Date.now()): 'antes' | 'aberta' | 'fechada' {
  if (agora < new Date(p.abreEm).getTime()) return 'antes'
  if (agora < new Date(p.fechaEm).getTime()) return 'aberta'
  return 'fechada'
}

// ---------------------------------------------------------------------------
// Professor: lista e edição
// ---------------------------------------------------------------------------

export interface ProvaDoPainel {
  id: number
  oferta: OfertaDoPainel
  titulo: string
  instrucoes: string
  abreEm: string
  fechaEm: string
  duracaoMin: number
  saidasParaEncerrar: number | null
  notasPublicadasEm: string | null
  questoes: number
  tentativas: number
}

const CAMPOS_PROVA =
  'id, titulo, instrucoes, abre_em, fecha_em, duracao_min, saidas_para_encerrar, notas_publicadas_em, ' +
  'oferta:turma_disciplinas!inner(id, turma:turmas!inner(id, nome, turno, ano_letivo, ativa), disciplina:disciplinas!inner(id, sigla, nome)), ' +
  'prova_questoes(id), prova_tentativas(id)'

interface ProvaDoBanco {
  id: number
  titulo: string
  instrucoes: string
  abre_em: string
  fecha_em: string
  duracao_min: number
  saidas_para_encerrar: number | null
  notas_publicadas_em: string | null
  oferta: {
    id: number
    turma: { id: number; nome: string; turno: string; ano_letivo: number; ativa: boolean }
    disciplina: { id: number; sigla: string; nome: string }
  }
  prova_questoes: { id: number }[]
  prova_tentativas: { id: number }[]
}

function converterProva(p: ProvaDoBanco): ProvaDoPainel {
  return {
    id: p.id,
    oferta: {
      id: p.oferta.id,
      turma: { id: p.oferta.turma.id, nome: p.oferta.turma.nome, turno: p.oferta.turma.turno, anoLetivo: p.oferta.turma.ano_letivo },
      disciplina: p.oferta.disciplina,
      turmaAtiva: p.oferta.turma.ativa,
    },
    titulo: p.titulo,
    instrucoes: p.instrucoes,
    abreEm: p.abre_em,
    fechaEm: p.fecha_em,
    duracaoMin: p.duracao_min,
    saidasParaEncerrar: p.saidas_para_encerrar,
    notasPublicadasEm: p.notas_publicadas_em,
    questoes: p.prova_questoes.length,
    tentativas: p.prova_tentativas.length,
  }
}

/** Todas as provas, as mais novas (por horário de abrir) primeiro. */
export async function listarProvas(): Promise<ProvaDoPainel[]> {
  const { data, error } = await supabase().from('provas').select(CAMPOS_PROVA).order('abre_em', { ascending: false })
  if (error) throw error
  return (data as unknown as ProvaDoBanco[]).map(converterProva)
}

export interface QuestaoDoPainel {
  exercicioId: number
  peso: number
  titulo: string
  enunciado: string
  linguagem: Linguagem
  codigoInicial: string
  testes: TesteDoProfessor[]
  /** "ALG · U I · Aula 2", ou null para questão só desta prova. */
  origem: { unidade: number; aula: number; tituloDaAula: string } | null
}

export interface ProvaParaEditar extends ProvaDoPainel {
  listaDeQuestoes: QuestaoDoPainel[]
}

const CAMPOS_EXERCICIO =
  'id, titulo, enunciado, linguagem, codigo_inicial, testes(tipo, entrada, saida_esperada, ordem), aula:aulas(numero, titulo, unidade:unidades!inner(numero))'

interface ExercicioDoBanco {
  id: number
  titulo: string
  enunciado: string
  linguagem: string
  codigo_inicial: string
  testes: { tipo: string; entrada: string; saida_esperada: string; ordem: number }[]
  aula: { numero: number; titulo: string; unidade: { numero: number } } | null
}

function converterQuestao(e: ExercicioDoBanco, peso: number): QuestaoDoPainel {
  return {
    exercicioId: e.id,
    peso,
    titulo: e.titulo,
    enunciado: e.enunciado,
    linguagem: e.linguagem as Linguagem,
    codigoInicial: e.codigo_inicial,
    testes: [...e.testes]
      .sort((a, b) => a.ordem - b.ordem)
      .map((t) => ({ tipo: t.tipo as TipoDeTeste, entrada: t.entrada, saidaEsperada: t.saida_esperada })),
    origem: e.aula ? { unidade: e.aula.unidade.numero, aula: e.aula.numero, tituloDaAula: e.aula.titulo } : null,
  }
}

export async function carregarProva(id: number): Promise<ProvaParaEditar | null> {
  const { data, error } = await supabase()
    .from('provas')
    .select(`${CAMPOS_PROVA}, questoes:prova_questoes(peso, ordem, exercicio:exercicios!inner(${CAMPOS_EXERCICIO}))`)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const bruto = data as unknown as ProvaDoBanco & { questoes: { peso: number; ordem: number; exercicio: ExercicioDoBanco }[] }
  return {
    ...converterProva(bruto),
    listaDeQuestoes: [...bruto.questoes].sort((a, b) => a.ordem - b.ordem).map((q) => converterQuestao(q.exercicio, Number(q.peso))),
  }
}

/** Exercícios das aulas de uma disciplina, para escolher como questão. */
export async function exerciciosDaDisciplina(disciplinaId: number): Promise<QuestaoDoPainel[]> {
  const { data, error } = await supabase()
    .from('exercicios')
    .select(CAMPOS_EXERCICIO.replace('aula:aulas(', 'aula:aulas!inner(').replace('unidades!inner(numero)', 'unidades!inner(numero, disciplina_id)'))
    .eq('aula.unidade.disciplina_id', disciplinaId)
  if (error) throw error
  return (data as unknown as ExercicioDoBanco[])
    .map((e) => converterQuestao(e, 1))
    .sort((a, b) => (a.origem?.unidade ?? 0) - (b.origem?.unidade ?? 0) || (a.origem?.aula ?? 0) - (b.origem?.aula ?? 0) || a.exercicioId - b.exercicioId)
}

export interface DadosDaProva {
  ofertaId: number
  titulo: string
  instrucoes: string
  /** Valor do campo datetime-local. */
  abreEm: string
  fechaEm: string
  duracaoMin: string
  saidasParaEncerrar: number | null
  questoes: { exercicioId: number; peso: string }[]
}

export type ErrosDaProva = Partial<Record<'ofertaId' | 'titulo' | 'abreEm' | 'fechaEm' | 'duracaoMin' | 'questoes', string>>

/** Mesmas regras do banco, para avisar antes de enviar. */
export function validarProva(d: DadosDaProva): ErrosDaProva {
  const erros: ErrosDaProva = {}
  if (!d.ofertaId) erros.ofertaId = 'Escolha a turma e a disciplina.'
  if (!d.titulo.trim()) erros.titulo = 'Escreva o título da prova.'
  else if (d.titulo.trim().length > 160) erros.titulo = 'Use até 160 letras no título.'
  const abre = doCampoDeData(d.abreEm)
  const fecha = doCampoDeData(d.fechaEm)
  if (!abre) erros.abreEm = 'Escolha o dia e a hora de abrir.'
  if (!fecha) erros.fechaEm = 'Escolha o dia e a hora de fechar.'
  else if (abre && new Date(fecha) <= new Date(abre)) erros.fechaEm = 'O horário de fechar precisa ser depois do de abrir.'
  const duracao = Number(d.duracaoMin)
  if (!Number.isInteger(duracao) || duracao < 5 || duracao > 600) erros.duracaoMin = 'A duração vai de 5 a 600 minutos.'
  if (d.questoes.length === 0) erros.questoes = 'Coloque pelo menos uma questão.'
  else if (d.questoes.length > 30) erros.questoes = 'Use até 30 questões.'
  else if (d.questoes.some((q) => !(Number(q.peso.replace(',', '.')) > 0) || Number(q.peso.replace(',', '.')) > 100))
    erros.questoes = 'O peso de cada questão vai de 0,1 a 100.'
  return erros
}

export async function salvarProva(id: number | null, d: DadosDaProva): Promise<number> {
  const { data, error } = await supabase().rpc('salvar_prova', {
    p_id: id as number,
    p_turma_disciplina_id: d.ofertaId,
    p_titulo: d.titulo.trim(),
    p_instrucoes: d.instrucoes,
    p_abre_em: doCampoDeData(d.abreEm) as string,
    p_fecha_em: doCampoDeData(d.fechaEm) as string,
    p_duracao_min: Number(d.duracaoMin),
    p_saidas_para_encerrar: d.saidasParaEncerrar as number,
    p_questoes: d.questoes.map((q) => ({ exercicio_id: q.exercicioId, peso: Number(q.peso.replace(',', '.')) })),
  })
  if (error) throw error
  return data
}

export async function removerProva(id: number): Promise<void> {
  const { error } = await supabase().rpc('remover_prova', { p_id: id })
  if (error) throw error
}

