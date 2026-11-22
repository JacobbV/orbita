import type { Oferta, Pedido } from './api'
import { meusPedidos } from './api'
import { supabase } from './supabase'

// Dados da ponte de comando do aluno: as disciplinas aprovadas, com unidades,
// aulas e o que está liberado para a turma. O banco (RLS) só entrega os links
// das aulas liberadas; aqui a montagem apenas organiza o que chegou.

/** Link externo (abre em outra aba) ou slides HTML do Órbita (tela própria, /slides/:id). */
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
  slide: 'Abrir slides',
  pdf: 'Abrir PDF',
  audio: 'Ouvir áudio',
  video: 'Ver vídeo',
}

export function rotuloMaterial(m: Pick<Material, 'tipo' | 'titulo'>): string {
  if (m.tipo === 'slide') return 'Abrir slides'
  return m.titulo.trim() || ROTULO_TIPO[m.tipo] || 'Abrir material'
}

/** Junta pedidos aprovados, estrutura das disciplinas, liberações e materiais. */
export function montarPonte(
  aprovados: Pedido[],
  unidades: UnidadeDoBanco[],
  liberacoes: LiberacaoDoBanco[],
  materiais: MaterialDoBanco[],
  exercicios: ExercicioDoBanco[] = [],
): DisciplinaDaPonte[] {
  const exerciciosPorAula = new Map<number, ExercicioDaPonte[]>()
  for (const e of [...exercicios].sort((a, b) => a.ordem - b.ordem || a.id - b.id)) {
    const lista = exerciciosPorAula.get(e.aula_id) ?? []
    lista.push({ id: e.id, titulo: e.titulo, dificuldade: e.dificuldade })
    exerciciosPorAula.set(e.aula_id, lista)
  }

  const materiaisPorAula = new Map<number, Material[]>()
  for (const m of [...materiais].sort((a, b) => a.ordem - b.ordem || a.id - b.id)) {
    let material: Material
    if (m.tipo === 'slide' && m.caminho_storage) material = { id: m.id, tipo: 'slide', titulo: m.titulo, url: null }
    else if (m.tipo !== 'slide' && linkSeguro(m.url)) material = { id: m.id, tipo: m.tipo, titulo: m.titulo, url: m.url }
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

async function carregarDisciplinas(aprovados: Pedido[]): Promise<DisciplinaDaPonte[]> {
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
  const liberacoes = liberacoesRes.data as LiberacaoDoBanco[]

  let materiais: MaterialDoBanco[] = []
  let exercicios: ExercicioDoBanco[] = []
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
    if (!exerciciosRes.error) exercicios = exerciciosRes.data
  }

  return montarPonte(aprovados, unidades, liberacoes, materiais, exercicios)
}
