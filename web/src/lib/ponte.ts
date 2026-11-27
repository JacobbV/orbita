import type { Oferta, Pedido } from './api'
import { meusPedidos } from './api'
import { supabase } from './supabase'

// Dados da ponte de comando do aluno: as disciplinas aprovadas, com unidades,
// aulas e o que está liberado para a turma. O banco (RLS) só entrega os links
// das aulas liberadas; aqui a montagem apenas organiza o que chegou.

/** Link externo (abre em outra aba) ou a página da aula do Órbita (/aula/:id: slides, apostila e áudio). */
export type Material =
  | { id: number; tipo: 'slide'; titulo: string; url: null }
  | { id: number; tipo: string; titulo: string; url: string }

export interface AulaDaPonte {
  id: number
  numero: number
  titulo: string
  liberada: boolean
  liberadaEm: string | null
  materiais: Material[]
  exercicios: ExercicioDaPonte[]
}

export interface ExercicioDaPonte {
  id: number
  titulo: string
  dificuldade: number
  /** Situação da entrega do próprio aluno (nada = ainda não entregou). */
  entrega?: SituacaoNaPonte
}

/** Entrega do aluno como o banco devolve (só as do próprio aluno). */
export interface EntregaNaPonteDoBanco {
  exercicio_id: number
  tentativa: number
  nota: number
  nota_professor: number | null
  comentario: string | null
  corrigida_em: string | null
  devolvida_em: string | null
}

export interface SituacaoNaPonte {
  estado: 'entregue' | 'corrigida' | 'devolvida'
  /** Nota que vale (a do professor, se ele ajustou). */
  nota: number
  comentario: string | null
}

export const NOME_NA_PONTE: Record<SituacaoNaPonte['estado'], string> = {
  entregue: 'entregue',
  corrigida: 'corrigida',
  devolvida: 'devolvida: refaça e entregue de novo',
}

/** Situação do exercício pela entrega mais nova do aluno. */
export function situacaoNaPonte(entregas: EntregaNaPonteDoBanco[]): SituacaoNaPonte | undefined {
  if (entregas.length === 0) return undefined
  const e = entregas.reduce((a, b) => (b.tentativa > a.tentativa ? b : a))
  const estado = e.devolvida_em ? 'devolvida' : e.corrigida_em ? 'corrigida' : 'entregue'
  return { estado, nota: Number(e.nota_professor ?? e.nota), comentario: e.comentario }
}

export interface ExercicioDoBanco extends ExercicioDaPonte {
  aula_id: number
  ordem: number
}

export interface UnidadeDaPonte {
  id: number
  numero: number
  titulo: string
  aulas: AulaDaPonte[]
  liberadas: number
}

export interface DisciplinaDaPonte {
  oferta: Oferta
  unidades: UnidadeDaPonte[]
  totalAulas: number
  totalLiberadas: number
  /** Aula liberada mais recentemente, com a unidade dela. */
  ultimaLiberada: { unidade: UnidadeDaPonte; aula: AulaDaPonte } | null
}

export interface UnidadeDoBanco {
  id: number
  numero: number
  titulo: string
  disciplina_id: number
  aulas: Array<{ id: number; numero: number; titulo: string }>
}

export interface LiberacaoDoBanco {
  aula_id: number
  turma_disciplina_id: number
  liberado_em: string
}

export interface MaterialDoBanco {
  id: number
  aula_id: number
  tipo: string
  titulo: string
  url: string | null
  caminho_storage?: string | null
  ordem: number
}

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/** 4 → "IV". Acima de 12 usa o número comum. */
export function numeroRomano(n: number): string {
  return ROMANOS[n - 1] ?? String(n)
}

/** Só links https viram botão. O banco já exige isso; aqui é uma segunda trava. */
function linkSeguro(url: string | null): url is string {
  if (!url) return false
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

const ROTULO_TIPO: Record<string, string> = {
  link: 'Abrir aula',
  slide: 'Abrir a aula',
  pdf: 'Abrir PDF',
  audio: 'Ouvir áudio',
  video: 'Ver vídeo',
}

export function rotuloMaterial(m: Pick<Material, 'tipo' | 'titulo'>): string {
  if (m.tipo === 'slide') return 'Abrir a aula'
  return m.titulo.trim() || ROTULO_TIPO[m.tipo] || 'Abrir material'
}

/** Junta pedidos aprovados, estrutura das disciplinas, liberações e materiais. */
export function montarPonte(
  aprovados: Pedido[],
  unidades: UnidadeDoBanco[],
  liberacoes: LiberacaoDoBanco[],
  materiais: MaterialDoBanco[],
  exercicios: ExercicioDoBanco[] = [],
  entregas: EntregaNaPonteDoBanco[] = [],
): DisciplinaDaPonte[] {
  const exerciciosPorAula = new Map<number, ExercicioDaPonte[]>()
  for (const e of [...exercicios].sort((a, b) => a.ordem - b.ordem || a.id - b.id)) {
    const lista = exerciciosPorAula.get(e.aula_id) ?? []
    const entrega = situacaoNaPonte(entregas.filter((x) => x.exercicio_id === e.id))
    lista.push({ id: e.id, titulo: e.titulo, dificuldade: e.dificuldade, ...(entrega ? { entrega } : {}) })
    exerciciosPorAula.set(e.aula_id, lista)
  }

  const materiaisPorAula = new Map<number, Material[]>()
  for (const m of [...materiais].sort((a, b) => a.ordem - b.ordem || a.id - b.id)) {
    let material: Material
    if (['slide', 'apostila', 'audio'].includes(m.tipo) && m.caminho_storage) {
      // Slides, apostila e áudio abrem juntos na página da aula: um só botão por aula.
      if ((materiaisPorAula.get(m.aula_id) ?? []).some((x) => x.url === null)) continue
      material = { id: m.id, tipo: 'slide', titulo: m.titulo, url: null }
    } else if (!['slide', 'apostila', 'audio'].includes(m.tipo) && linkSeguro(m.url)) material = { id: m.id, tipo: m.tipo, titulo: m.titulo, url: m.url }
    else continue
    const lista = materiaisPorAula.get(m.aula_id) ?? []
    lista.push(material)
    materiaisPorAula.set(m.aula_id, lista)
  }

  const disciplinas = aprovados.map((pedido): DisciplinaDaPonte => {
    const { oferta } = pedido
    const liberadasNaOferta = new Map<number, string>()
    for (const l of liberacoes) {
      if (l.turma_disciplina_id === oferta.id) liberadasNaOferta.set(l.aula_id, l.liberado_em)
    }

    let ultimaLiberada: DisciplinaDaPonte['ultimaLiberada'] = null
    const unidadesDaPonte = unidades
      .filter((u) => u.disciplina_id === oferta.disciplina.id)
      .sort((a, b) => a.numero - b.numero)
      .map((u): UnidadeDaPonte => {
        const aulas = [...u.aulas]
          .sort((a, b) => a.numero - b.numero)
          .map((a): AulaDaPonte => {
            const liberadaEm = liberadasNaOferta.get(a.id) ?? null
            const liberada = liberadaEm !== null
            return {
              id: a.id,
              numero: a.numero,
              titulo: a.titulo,
              liberada,
              liberadaEm,
              // Aula bloqueada nunca mostra conteúdo, mesmo que algo tenha chegado.
              materiais: liberada ? (materiaisPorAula.get(a.id) ?? []) : [],
              exercicios: liberada ? (exerciciosPorAula.get(a.id) ?? []) : [],
            }
          })
        const unidade: UnidadeDaPonte = {
          id: u.id,
          numero: u.numero,
          titulo: u.titulo,
          aulas,
          liberadas: aulas.filter((a) => a.liberada).length,
        }
        for (const aula of aulas) {
          if (aula.liberadaEm && (!ultimaLiberada || aula.liberadaEm > (ultimaLiberada.aula.liberadaEm ?? ''))) {
            ultimaLiberada = { unidade, aula }
          }
        }
        return unidade
      })

    return {
      oferta,
      unidades: unidadesDaPonte,
      totalAulas: unidadesDaPonte.reduce((s, u) => s + u.aulas.length, 0),
      totalLiberadas: unidadesDaPonte.reduce((s, u) => s + u.liberadas, 0),
      ultimaLiberada,
    }
  })

  return disciplinas.sort((a, b) => a.oferta.disciplina.nome.localeCompare(b.oferta.disciplina.nome, 'pt-BR'))
}

export interface DadosDaPonte {
  disciplinas: DisciplinaDaPonte[]
  /** Há pedidos pendentes ou recusados (aparece o atalho para "Meus pedidos"). */
  temOutrosPedidos: boolean
}

/** Busca tudo o que a ponte precisa para o aluno logado. */
export async function carregarPonte(): Promise<DadosDaPonte> {
  const pedidos = await meusPedidos()
  const aprovados = pedidos.filter((p) => p.status === 'aprovado')
  const temOutrosPedidos = pedidos.some((p) => p.status !== 'aprovado')
  if (aprovados.length === 0) return { disciplinas: [], temOutrosPedidos }

  return { disciplinas: await carregarDisciplinas(aprovados), temOutrosPedidos }
}

/** "Ver como aluno": a ponte de uma turma, montada com o acesso do professor. */
export async function carregarPonteComoAluno(oferta: Oferta): Promise<DisciplinaDaPonte | null> {
  const pedido: Pedido = {
    id: 0,
    status: 'aprovado',
    tentativa: 1,
    motivoRecusa: null,
    quemEVoce: '',
    criadoEm: '',
    oferta,
  }
  return (await carregarDisciplinas([pedido]))[0] ?? null
}

/** Modo Ninja: todas as turmas e disciplinas, com todas as aulas abertas. Nada é registrado. */
export async function carregarPonteNinja(ofertas: Oferta[]): Promise<DisciplinaDaPonte[]> {
  if (ofertas.length === 0) return []
  const pedidos = ofertas.map((oferta): Pedido => ({
    id: 0,
    status: 'aprovado',
    tentativa: 1,
    motivoRecusa: null,
    quemEVoce: '',
    criadoEm: '',
    oferta,
  }))
  return carregarDisciplinas(pedidos, true)
}

/** Uma liberação "de mentira" para cada aula de cada oferta (só para o Modo Ninja). */
export function liberarTudo(ofertas: Pick<Oferta, 'id' | 'disciplina'>[], unidades: UnidadeDoBanco[]): LiberacaoDoBanco[] {
  return ofertas.flatMap((o) =>
    unidades
      .filter((u) => u.disciplina_id === o.disciplina.id)
      .flatMap((u) => u.aulas.map((a) => ({ aula_id: a.id, turma_disciplina_id: o.id, liberado_em: '' }))),
  )
}

async function carregarDisciplinas(aprovados: Pedido[], tudoLiberado = false): Promise<DisciplinaDaPonte[]> {
  const disciplinaIds = [...new Set(aprovados.map((p) => p.oferta.disciplina.id))]
  const ofertaIds = aprovados.map((p) => p.oferta.id)

  const [unidadesRes, liberacoesRes] = await Promise.all([
    supabase()
      .from('unidades')
      .select('id, numero, titulo, disciplina_id, aulas(id, numero, titulo)')
      .in('disciplina_id', disciplinaIds),
    supabase().from('liberacoes').select('aula_id, turma_disciplina_id, liberado_em').in('turma_disciplina_id', ofertaIds),
  ])
  if (unidadesRes.error) throw unidadesRes.error
  if (liberacoesRes.error) throw liberacoesRes.error
  const unidades = unidadesRes.data as UnidadeDoBanco[]
  const liberacoes = tudoLiberado
    ? liberarTudo(aprovados.map((p) => p.oferta), unidades)
    : (liberacoesRes.data as LiberacaoDoBanco[])

  let materiais: MaterialDoBanco[] = []
  let exercicios: ExercicioDoBanco[] = []
  let entregas: EntregaNaPonteDoBanco[] = []
  const aulasLiberadas = [...new Set(liberacoes.map((l) => l.aula_id))]
  if (aulasLiberadas.length > 0) {
    const [materiaisRes, exerciciosRes] = await Promise.all([
      supabase()
        .from('materiais')
        .select('id, aula_id, tipo, titulo, url, caminho_storage, ordem')
        .in('aula_id', aulasLiberadas),
      supabase().from('exercicios').select('id, aula_id, titulo, dificuldade, ordem').in('aula_id', aulasLiberadas),
    ])
    if (materiaisRes.error) throw materiaisRes.error
    materiais = materiaisRes.data as MaterialDoBanco[]
    // Exercícios são um extra: se a consulta falhar, a ponte abre sem eles.
    if (!exerciciosRes.error) exercicios = exerciciosRes.data.filter((e): e is ExercicioDoBanco => e.aula_id !== null)
    // Entregas do próprio aluno (a RLS só devolve as dele). No Modo Ninja o professor não entrega nada.
    if (!tudoLiberado && exercicios.length > 0) {
      const entregasRes = await supabase()
        .from('entregas')
        .select('exercicio_id, tentativa, nota, nota_professor, comentario, corrigida_em, devolvida_em')
        .in(
          'exercicio_id',
          exercicios.map((e) => e.id),
        )
      if (!entregasRes.error) entregas = entregasRes.data
    }
  }

  return montarPonte(aprovados, unidades, liberacoes, materiais, exercicios, entregas)
}

export interface AtividadeAberta {
  exercicio: ExercicioDaPonte
  aulaId: number
  aulaTitulo: string
  /** Ex.: "II.3" */
  rotuloDaAula: string
  disciplina: string
  devolvida: boolean
}

/**
 * Exercícios das aulas liberadas que o aluno ainda não entregou (ou que o
 * professor devolveu para refazer). Entregues e corrigidos ficam de fora.
 */
export function atividadesAbertas(disciplinas: DisciplinaDaPonte[]): AtividadeAberta[] {
  const lista: AtividadeAberta[] = []
  for (const d of disciplinas) {
    for (const u of d.unidades) {
      for (const a of u.aulas) {
        if (!a.liberada) continue
        for (const e of a.exercicios) {
          const estado = e.entrega?.estado
          if (estado === 'entregue' || estado === 'corrigida') continue
          lista.push({
            exercicio: e,
            aulaId: a.id,
            aulaTitulo: a.titulo,
            rotuloDaAula: `${numeroRomano(u.numero)}.${a.numero}`,
            disciplina: d.oferta.disciplina.nome,
            devolvida: estado === 'devolvida',
          })
        }
      }
    }
  }
  // Devolvidas primeiro: o professor está esperando.
  return lista.sort((x, y) => Number(y.devolvida) - Number(x.devolvida))
}

/** A aula para "Continuar aula": a última aberta (se ainda liberada); senão a última liberada. */
export function aulaParaContinuar(
  disciplinas: DisciplinaDaPonte[],
  ultimaAulaId: number | null,
): { disciplina: DisciplinaDaPonte; unidade: UnidadeDaPonte; aula: AulaDaPonte; jaAberta: boolean } | null {
  if (ultimaAulaId !== null) {
    for (const d of disciplinas) {
      for (const u of d.unidades) {
        const aula = u.aulas.find((a) => a.id === ultimaAulaId && a.liberada)
        if (aula) return { disciplina: d, unidade: u, aula, jaAberta: true }
      }
    }
  }
  let melhor: { disciplina: DisciplinaDaPonte; unidade: UnidadeDaPonte; aula: AulaDaPonte; jaAberta: boolean } | null = null
  for (const d of disciplinas) {
    const u = d.ultimaLiberada
    if (u && (!melhor || (u.aula.liberadaEm ?? '') > (melhor.aula.liberadaEm ?? ''))) {
      melhor = { disciplina: d, unidade: u.unidade, aula: u.aula, jaAberta: false }
    }
  }
  return melhor
}
