import type { Oferta, StatusPedido } from './api'
import { supabase } from './supabase'

// Consultas e ações do painel do professor. O banco confere em cada uma se
// quem chama é o professor (RLS e funções); a tela só organiza os dados.

// ---------------------------------------------------------------------------
// Ofertas (turma + disciplina), inclusive de turmas que não aceitam pedidos
// ---------------------------------------------------------------------------

export interface TurmaDoPainel {
  id: number
  nome: string
  serie: number
  turno: string
  anoLetivo: number
  ativa: boolean
}

export interface OfertaDoPainel extends Oferta {
  turmaAtiva: boolean
}

interface OfertaDoBanco {
  id: number
  turma: { id: number; nome: string; turno: string; ano_letivo: number; ativa: boolean }
  disciplina: { id: number; sigla: string; nome: string }
}

const CAMPOS_OFERTA =
  'id, turma:turmas!inner(id, nome, turno, ano_letivo, ativa), disciplina:disciplinas!inner(id, sigla, nome)'

function converterOferta(o: OfertaDoBanco): OfertaDoPainel {
  return {
    id: o.id,
    turma: { id: o.turma.id, nome: o.turma.nome, turno: o.turma.turno, anoLetivo: o.turma.ano_letivo },
    disciplina: { id: o.disciplina.id, sigla: o.disciplina.sigla, nome: o.disciplina.nome },
    turmaAtiva: o.turma.ativa,
  }
}

export function ordenarOfertas<T extends Oferta>(ofertas: T[]): T[] {
  return [...ofertas].sort(
    (a, b) =>
      a.disciplina.nome.localeCompare(b.disciplina.nome, 'pt-BR') ||
      a.turma.nome.localeCompare(b.turma.nome, 'pt-BR'),
  )
}

export async function listarOfertasDoPainel(): Promise<OfertaDoPainel[]> {
  const { data, error } = await supabase().from('turma_disciplinas').select(CAMPOS_OFERTA)
  if (error) throw error
  return ordenarOfertas((data as unknown as OfertaDoBanco[]).map(converterOferta))
}

// ---------------------------------------------------------------------------
// Pedidos de acesso
// ---------------------------------------------------------------------------

export interface PedidoDoPainel {
  id: number
  status: StatusPedido
  tentativa: number
  quemEVoce: string
  motivoRecusa: string | null
  criadoEm: string
  decididoEm: string | null
  aluno: { nome: string; email: string }
  oferta: OfertaDoPainel
}

interface PedidoDoBanco {
  id: number
  status: StatusPedido
  tentativa: number
  quem_e_voce: string
  motivo_recusa: string | null
  criado_em: string
  decidido_em: string | null
  aluno: { nome: string; email: string }
  oferta: OfertaDoBanco
}

export async function listarPedidos(): Promise<PedidoDoPainel[]> {
  const { data, error } = await supabase()
    .from('matriculas')
    .select(
      `id, status, tentativa, quem_e_voce, motivo_recusa, criado_em, decidido_em,
       aluno:perfis!matriculas_aluno_id_fkey!inner(nome, email),
       oferta:turma_disciplinas!inner(${CAMPOS_OFERTA})`,
    )
    .order('criado_em', { ascending: true })
  if (error) throw error
  return (data as unknown as PedidoDoBanco[]).map((p) => ({
    id: p.id,
    status: p.status,
    tentativa: p.tentativa,
    quemEVoce: p.quem_e_voce,
    motivoRecusa: p.motivo_recusa,
    criadoEm: p.criado_em,
    decididoEm: p.decidido_em,
    aluno: p.aluno,
    oferta: converterOferta(p.oferta),
  }))
}

export interface GrupoDePedidos {
  oferta: OfertaDoPainel
  pedidos: PedidoDoPainel[]
}

/** Agrupa por turma + disciplina, na ordem das disciplinas e turmas. */
export function agruparPorOferta(pedidos: PedidoDoPainel[]): GrupoDePedidos[] {
  const grupos = new Map<number, GrupoDePedidos>()
  for (const p of pedidos) {
    const g = grupos.get(p.oferta.id) ?? { oferta: p.oferta, pedidos: [] }
    g.pedidos.push(p)
    grupos.set(p.oferta.id, g)
  }
  const ordem = ordenarOfertas([...grupos.values()].map((g) => g.oferta))
  return ordem.map((o) => grupos.get(o.id) as GrupoDePedidos)
}

export async function decidirPedido(id: number, aprovar: boolean, motivo?: string): Promise<void> {
  const { error } = await supabase().rpc('decidir_pedido', {
    p_matricula_id: id,
    p_aprovar: aprovar,
    ...(motivo?.trim() ? { p_motivo: motivo.trim() } : {}),
  })
  if (error) throw error
}

export async function aprovarTodos(ofertaId: number): Promise<number> {
  const { data, error } = await supabase().rpc('aprovar_todos', { p_turma_disciplina_id: ofertaId })
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Turmas
// ---------------------------------------------------------------------------

export async function listarTurmas(): Promise<TurmaDoPainel[]> {
  const { data, error } = await supabase()
    .from('turmas')
    .select('id, nome, serie, turno, ano_letivo, ativa')
    .order('serie')
    .order('nome')
  if (error) throw error
  return data.map((t) => ({
    id: t.id,
    nome: t.nome,
    serie: t.serie,
    turno: t.turno,
    anoLetivo: t.ano_letivo,
    ativa: t.ativa,
  }))
}

export async function salvarTurma(id: number, dados: { anoLetivo: number; ativa: boolean }): Promise<void> {
  const { error } = await supabase()
    .from('turmas')
    .update({ ano_letivo: dados.anoLetivo, ativa: dados.ativa })
    .eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Unidades, aulas, links e liberações de uma oferta
// ---------------------------------------------------------------------------

export interface AulaDoPainel {
  id: number
  numero: number
  titulo: string
  liberada: boolean
  link: { titulo: string; url: string } | null
}

export interface UnidadeDoPainel {
  id: number
  numero: number
  titulo: string
  aulas: AulaDoPainel[]
}

export interface EstruturaDoBanco {
  unidades: Array<{ id: number; numero: number; titulo: string; aulas: Array<{ id: number; numero: number; titulo: string }> }>
  liberadas: number[]
  links: Array<{ aula_id: number; titulo: string; url: string | null; tipo: string }>
}

export function montarEstrutura({ unidades, liberadas, links }: EstruturaDoBanco): UnidadeDoPainel[] {
  const liberadasSet = new Set(liberadas)
  const linkPorAula = new Map<number, { titulo: string; url: string }>()
  for (const l of links) if (l.tipo === 'link' && l.url) linkPorAula.set(l.aula_id, { titulo: l.titulo, url: l.url })
  return [...unidades]
    .sort((a, b) => a.numero - b.numero)
    .map((u) => ({
      id: u.id,
      numero: u.numero,
      titulo: u.titulo,
      aulas: [...u.aulas]
        .sort((a, b) => a.numero - b.numero)
        .map((a) => ({
          id: a.id,
          numero: a.numero,
          titulo: a.titulo,
          liberada: liberadasSet.has(a.id),
          link: linkPorAula.get(a.id) ?? null,
        })),
    }))
}

export async function carregarEstrutura(oferta: Oferta): Promise<UnidadeDoPainel[]> {
  const [unidadesRes, liberacoesRes] = await Promise.all([
    supabase()
      .from('unidades')
      .select('id, numero, titulo, aulas(id, numero, titulo)')
      .eq('disciplina_id', oferta.disciplina.id),
    supabase().from('liberacoes').select('aula_id').eq('turma_disciplina_id', oferta.id),
  ])
  if (unidadesRes.error) throw unidadesRes.error
  if (liberacoesRes.error) throw liberacoesRes.error
  const unidades = unidadesRes.data
  const aulaIds = unidades.flatMap((u) => u.aulas.map((a) => a.id))
  let links: EstruturaDoBanco['links'] = []
  if (aulaIds.length > 0) {
    const { data, error } = await supabase()
      .from('materiais')
      .select('aula_id, titulo, url, tipo')
      .in('aula_id', aulaIds)
    if (error) throw error
    links = data
  }
  return montarEstrutura({ unidades, liberadas: liberacoesRes.data.map((l) => l.aula_id), links })
}

export async function liberarAula(ofertaId: number, aulaId: number, liberar: boolean): Promise<void> {
  const tabela = supabase().from('liberacoes')
  const { error } = liberar
    ? await tabela.upsert({ turma_disciplina_id: ofertaId, aula_id: aulaId }, { ignoreDuplicates: true })
    : await tabela.delete().eq('turma_disciplina_id', ofertaId).eq('aula_id', aulaId)
  if (error) throw error
}

export async function liberarUnidade(ofertaId: number, unidadeId: number, liberar: boolean): Promise<void> {
  const { error } = await supabase().rpc('liberar_unidade', {
    p_turma_disciplina_id: ofertaId,
    p_unidade_id: unidadeId,
    p_liberar: liberar,
  })
  if (error) throw error
}

export async function adicionarUnidade(disciplinaId: number, titulo: string): Promise<void> {
  const { error } = await supabase().rpc('adicionar_unidade', { p_disciplina_id: disciplinaId, p_titulo: titulo })
  if (error) throw error
}

export async function removerUnidade(unidadeId: number): Promise<void> {
  const { error } = await supabase().rpc('remover_unidade', { p_unidade_id: unidadeId })
  if (error) throw error
}

export async function renomearUnidade(unidadeId: number, titulo: string): Promise<void> {
  const { error } = await supabase().from('unidades').update({ titulo: titulo.trim() }).eq('id', unidadeId)
  if (error) throw error
}

export async function adicionarAula(unidadeId: number, titulo: string): Promise<void> {
  const { error } = await supabase().rpc('adicionar_aula', { p_unidade_id: unidadeId, p_titulo: titulo })
  if (error) throw error
}

export async function removerAula(aulaId: number): Promise<void> {
  const { error } = await supabase().rpc('remover_aula', { p_aula_id: aulaId })
  if (error) throw error
}

/** Salva título e link da aula. Link vazio remove o link. */
export async function salvarAula(aulaId: number, titulo: string, url: string): Promise<void> {
  const { error } = await supabase().from('aulas').update({ titulo: titulo.trim() }).eq('id', aulaId)
  if (error) throw error
  const { error: erroLink } = await supabase().rpc('definir_link_da_aula', {
    p_aula_id: aulaId,
    p_url: url.trim(),
    p_titulo: 'Material da aula',
  })
  if (erroLink) throw erroLink
}

// ---------------------------------------------------------------------------
// Validações simples dos formulários (o banco confere de novo)
// ---------------------------------------------------------------------------

export function validarTitulo(titulo: string, max = 160): string | null {
  const t = titulo.trim()
  if (!t) return 'Escreva um título.'
  if (t.length > max) return `Use no máximo ${max} caracteres.`
  return null
}

export function validarLink(url: string): string | null {
  const u = url.trim()
  if (!u) return null
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'https:') return 'O link precisa começar com https://.'
    if (/\s/.test(u)) return 'O link não pode ter espaços.'
    return null
  } catch {
    return 'Cole o link completo, começando com https://.'
  }
}

export function validarAnoLetivo(ano: string): string | null {
  const n = Number(ano)
  if (!Number.isInteger(n) || n < 2020 || n > 2100) return 'Use um ano entre 2020 e 2100.'
  return null
}
