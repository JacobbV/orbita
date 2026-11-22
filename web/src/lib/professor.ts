import type { Oferta, StatusPedido } from './api'
import { numeroRomano } from './ponte'
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
  /** Slides HTML enviados para a aula (arquivo no armazenamento privado). */
  slides: { id: number; caminho: string } | null
  /** Quantos exercícios do laboratório a aula tem. */
  exercicios: number
}

export interface UnidadeDoPainel {
  id: number
  numero: number
  titulo: string
  aulas: AulaDoPainel[]
}

export interface EstruturaDoBanco {
  unidades: Array<{ id: number; numero: number; titulo: string; aulas: Array<{ id: number; numero: number; titulo: string; exercicios?: Array<{ count: number }> }> }>
  liberadas: number[]
  links: Array<{ id: number; aula_id: number; titulo: string; url: string | null; tipo: string; caminho_storage: string | null }>
}

export function montarEstrutura({ unidades, liberadas, links }: EstruturaDoBanco): UnidadeDoPainel[] {
  const liberadasSet = new Set(liberadas)
  const linkPorAula = new Map<number, { titulo: string; url: string }>()
  const slidesPorAula = new Map<number, { id: number; caminho: string }>()
  for (const l of links) {
    if (l.tipo === 'link' && l.url) linkPorAula.set(l.aula_id, { titulo: l.titulo, url: l.url })
    if (l.tipo === 'slide' && l.caminho_storage) slidesPorAula.set(l.aula_id, { id: l.id, caminho: l.caminho_storage })
  }
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
          slides: slidesPorAula.get(a.id) ?? null,
          exercicios: a.exercicios?.[0]?.count ?? 0,
        })),
    }))
}

export async function carregarEstrutura(oferta: Oferta): Promise<UnidadeDoPainel[]> {
  const [unidadesRes, liberacoesRes] = await Promise.all([
    supabase()
      .from('unidades')
      .select('id, numero, titulo, aulas(id, numero, titulo, exercicios(count))')
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
      .select('id, aula_id, titulo, url, tipo, caminho_storage')
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
  const { data: aulas, error: erroAulas } = await supabase().from('aulas').select('id').eq('unidade_id', unidadeId)
  if (erroAulas) throw erroAulas
  const arquivos = await caminhosDosSlides(aulas.map((a) => a.id))
  const { error } = await supabase().rpc('remover_unidade', { p_unidade_id: unidadeId })
  if (error) throw error
  await apagarArquivos(arquivos)
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
  const arquivos = await caminhosDosSlides([aulaId])
  const { error } = await supabase().rpc('remover_aula', { p_aula_id: aulaId })
  if (error) throw error
  await apagarArquivos(arquivos)
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
// Slides HTML (arquivos no armazenamento privado)
// ---------------------------------------------------------------------------

export const BUCKET_MATERIAIS = 'materiais'
export const TAMANHO_MAXIMO_SLIDES = 10 * 1024 * 1024

async function caminhosDosSlides(aulaIds: number[]): Promise<string[]> {
  if (aulaIds.length === 0) return []
  const { data, error } = await supabase()
    .from('materiais')
    .select('caminho_storage')
    .eq('tipo', 'slide')
    .in('aula_id', aulaIds)
  if (error) throw error
  return data.flatMap((m) => (m.caminho_storage ? [m.caminho_storage] : []))
}

/** Apaga arquivos que já não estão ligados a nenhuma aula. Falha aqui não desfaz a ação. */
async function apagarArquivos(caminhos: Array<string | null>): Promise<void> {
  const lista = caminhos.filter((c): c is string => Boolean(c))
  if (lista.length > 0) await supabase().storage.from(BUCKET_MATERIAIS).remove(lista)
}

/** Envia o arquivo .html e registra como os slides da aula (substitui os anteriores). */
export async function enviarSlides(aulaId: number, arquivo: File): Promise<void> {
  const problema = validarArquivoDeSlides(arquivo)
  if (problema) throw new Error(problema)
  const caminho = `aulas/${aulaId}/slides-${Date.now()}.html`
  const armazenamento = supabase().storage.from(BUCKET_MATERIAIS)
  const { error: erroEnvio } = await armazenamento.upload(caminho, arquivo, {
    contentType: 'text/html',
    upsert: false,
  })
  if (erroEnvio) throw erroEnvio
  const { data: anterior, error } = await supabase().rpc('definir_slides_da_aula', {
    p_aula_id: aulaId,
    p_caminho: caminho,
    p_titulo: 'Slides da aula',
  })
  if (error) {
    await armazenamento.remove([caminho])
    throw error
  }
  await apagarArquivos([anterior])
}

export async function removerSlides(aulaId: number): Promise<void> {
  const { data: caminho, error } = await supabase().rpc('remover_slides_da_aula', { p_aula_id: aulaId })
  if (error) throw error
  await apagarArquivos([caminho])
}

export function validarArquivoDeSlides(arquivo: Pick<File, 'name' | 'size'>): string | null {
  if (!/\.html?$/i.test(arquivo.name)) return 'Escolha um arquivo .html.'
  if (arquivo.size === 0) return 'O arquivo está vazio.'
  if (arquivo.size > TAMANHO_MAXIMO_SLIDES) return 'O arquivo passa de 10 MB.'
  return null
}

/** "DAW_U1_A3.html" → unidade 1, aula 3. Aceita também "u1-a3", "U01_A03" etc. */
export function lerNomeDoSlide(nome: string): { unidade: number; aula: number } | null {
  const achado = /(?:^|[^a-z0-9])u0*(\d{1,2})[ _.-]*a0*(\d{1,2})(?![0-9])/i.exec(nome.replace(/\.html?$/i, ''))
  if (!achado) return null
  return { unidade: Number(achado[1]), aula: Number(achado[2]) }
}

/** Siglas que podem aparecer no começo do nome; DAW é a sigla de Web nos arquivos. */
const SIGLAS_DOS_ARQUIVOS: Record<string, string> = { ALG: 'ALG', FUND: 'FUND', WEB: 'WEB', DAW: 'WEB' }

/** Disciplina indicada no começo do nome (ALG_U1_A1 → ALG; DAW_U1_A1 → WEB), se for conhecida. */
export function siglaDoNome(nome: string): { escrita: string; sigla: string } | null {
  const achado = /^([a-z]+)[ _.-]/i.exec(nome)
  const escrita = achado?.[1]?.toUpperCase()
  const sigla = escrita ? SIGLAS_DOS_ARQUIVOS[escrita] : undefined
  return escrita && sigla ? { escrita, sigla } : null
}

/** Só os .html de uma pasta escolhida inteira (deixa de fora imagens e outros arquivos). */
export function soArquivosHtml(arquivos: File[]): File[] {
  return arquivos.filter((a) => /\.html?$/i.test(a.name))
}

export interface ItemDoEnvio {
  arquivo: File
  aula: { id: number; rotulo: string; titulo: string; temSlides: boolean } | null
  problema: string | null
}

/** Casa cada arquivo com a aula da disciplina pelo nome (unidade e aula). */
export function planejarEnvioEmLote(arquivos: File[], unidades: UnidadeDoPainel[], sigla?: string): ItemDoEnvio[] {
  const usadas = new Set<number>()
  const itens = [...arquivos]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }))
    .map((arquivo): ItemDoEnvio => {
      const problemaArquivo = validarArquivoDeSlides(arquivo)
      if (problemaArquivo) return { arquivo, aula: null, problema: problemaArquivo }
      const doNome = siglaDoNome(arquivo.name)
      if (sigla && doNome && doNome.sigla !== sigla) {
        return { arquivo, aula: null, problema: `Arquivo de outra disciplina (${doNome.escrita}). Troque a disciplina no topo.` }
      }
      const nome = lerNomeDoSlide(arquivo.name)
      if (!nome) return { arquivo, aula: null, problema: 'O nome não diz a unidade e a aula (ex.: ALG_U1_A2).' }
      const unidade = unidades.find((u) => u.numero === nome.unidade)
      const aula = unidade?.aulas.find((a) => a.numero === nome.aula)
      if (!unidade || !aula) return { arquivo, aula: null, problema: 'Esta disciplina não tem essa aula.' }
      if (usadas.has(aula.id)) return { arquivo, aula: null, problema: 'Outro arquivo já vai para essa aula.' }
      usadas.add(aula.id)
      return {
        arquivo,
        aula: { id: aula.id, rotulo: `${numeroRomano(unidade.numero)}.${aula.numero}`, titulo: aula.titulo, temSlides: Boolean(aula.slides) },
        problema: null,
      }
    })
  return itens
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
