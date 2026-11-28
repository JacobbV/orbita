import { supabase } from './supabase'

// Lojinha: moedinhas separadas do XP. O banco faz todas as contas (saldo,
// compra, troca); aqui só se lê e se pede.

/** Quanto XP vale uma moeda na troca. */
export const XP_POR_MOEDA = 50
/** O professor dá no máximo esta quantidade de moedas por vez. */
export const MOEDAS_MANUAL_MAXIMO = 10

export interface PrecoDaPeca {
  /** Preço em moedas, ou null se a peça não é da loja. */
  preco: number | null
  naLoja: boolean
  xpMinimo: number
}

export interface Loja {
  moedas: number
  xp: number
  patente: string
  /** XP em que a patente atual começa: trocar abaixo disso baixa a patente. */
  xpDaPatente: number
  /** Preço, situação e XP mínimo de cada peça, pelo id. */
  pecas: Map<string, PrecoDaPeca>
  /** Peças da loja que o aluno já tem. */
  compradas: Set<string>
}

interface PecaDoBanco {
  id: string
  preco: number | null
  na_loja: boolean
  xp_minimo: number
}

/** Catálogo com preços (vale para todos) e, para o aluno, saldo e compras. */
export async function carregarLoja(): Promise<Loja> {
  const [pecas, compras, progresso] = await Promise.all([
    supabase().from('pecas').select('id, preco, na_loja, xp_minimo'),
    supabase().from('compras').select('peca_id').is('devolvida_em', null),
    supabase().rpc('meu_progresso'),
  ])
  if (pecas.error) throw pecas.error
  if (compras.error) throw compras.error
  if (progresso.error) throw progresso.error
  const p = (progresso.data ?? {}) as { moedas?: number; xp?: number; patente?: string; xp_da_patente?: number }
  return {
    moedas: p.moedas ?? 0,
    xp: p.xp ?? 0,
    patente: p.patente ?? '',
    xpDaPatente: p.xp_da_patente ?? 0,
    pecas: lerCatalogo((pecas.data ?? []) as PecaDoBanco[]),
    compradas: new Set(((compras.data ?? []) as { peca_id: string }[]).map((c) => c.peca_id)),
  }
}

export function lerCatalogo(linhas: PecaDoBanco[]): Map<string, PrecoDaPeca> {
  return new Map(linhas.map((l) => [l.id, { preco: l.preco, naLoja: l.na_loja, xpMinimo: l.xp_minimo }]))
}

/** Situação de uma peça para o aluno no Hangar. */
export type SituacaoDaPeca =
  | { tipo: 'livre' }
  | { tipo: 'xp'; xp: number }
  | { tipo: 'loja'; preco: number; aVenda: boolean }

export function situacaoDaPeca(
  id: string,
  loja: Pick<Loja, 'pecas' | 'compradas' | 'xp'>,
  xpDaArte: number,
): SituacaoDaPeca {
  const linha = loja.pecas.get(id)
  const xpMinimo = linha ? linha.xpMinimo : xpDaArte
  if (xpMinimo > loja.xp) return { tipo: 'xp', xp: xpMinimo }
  if (linha?.preco != null && !loja.compradas.has(id)) return { tipo: 'loja', preco: linha.preco, aVenda: linha.naLoja }
  return { tipo: 'livre' }
}

/** Quantas moedas o aluno consegue com o XP que tem. */
export function moedasPossiveis(xp: number): number {
  return Math.max(0, Math.floor(xp / XP_POR_MOEDA))
}

export async function comprarPeca(pecaId: string): Promise<number> {
  const { data, error } = await supabase().rpc('comprar_peca', { p_peca_id: pecaId })
  if (error) throw error
  return (data as { moedas: number }).moedas
}

export interface ResultadoDaTroca {
  moedas: number
  xp: number
  patente: string
}

export async function trocarXpPorMoedas(moedas: number): Promise<ResultadoDaTroca> {
  const { data, error } = await supabase().rpc('trocar_xp_por_moedas', { p_moedas: moedas })
  if (error) throw error
  return data as unknown as ResultadoDaTroca
}

export interface MovimentoDeMoedas {
  quantidade: number
  descricao: string
  criadoEm: string
}

/** Últimos ganhos (e retiradas) de moedas do aluno. */
export async function carregarMeusMovimentos(limite = 10): Promise<MovimentoDeMoedas[]> {
  const { data, error } = await supabase()
    .from('moedas_eventos')
    .select('quantidade, descricao, criado_em')
    .order('criado_em', { ascending: false })
    .limit(limite)
  if (error) throw error
  return ((data ?? []) as { quantidade: number; descricao: string; criado_em: string }[]).map((m) => ({
    quantidade: m.quantidade,
    descricao: m.descricao,
    criadoEm: m.criado_em,
  }))
}

// ---------------------------------------------------------------------------
// Professor
// ---------------------------------------------------------------------------

export interface MoedasDoAluno {
  alunoId: string
  nome: string
  apelido: string | null
  moedas: number
  ganhas: number
  gastas: number
  xp: number
}

export async function carregarMoedasDaTurma(ofertaId: number): Promise<MoedasDoAluno[]> {
  const { data, error } = await supabase().rpc('moedas_da_turma', { p_turma_disciplina_id: ofertaId })
  if (error) throw error
  return (
    (data ?? []) as { aluno_id: string; nome: string; apelido: string | null; moedas: number; ganhas: number; gastas: number; xp: number }[]
  ).map((l) => ({
    alunoId: l.aluno_id,
    nome: l.nome,
    apelido: l.apelido ?? null,
    moedas: l.moedas,
    ganhas: l.ganhas,
    gastas: l.gastas,
    xp: l.xp,
  }))
}

/** Dá (positivo) ou tira (negativo) moedas. Devolve o saldo novo. */
export async function darMoedas(alunoId: string, quantidade: number, descricao: string): Promise<number> {
  const { data, error } = await supabase().rpc('dar_moedas', {
    p_aluno_id: alunoId,
    p_quantidade: quantidade,
    p_descricao: descricao.trim(),
  })
  if (error) throw error
  return data as number
}

export async function definirPecaDaLoja(pecaId: string, preco: number, naLoja: boolean): Promise<void> {
  const { error } = await supabase().rpc('definir_peca_da_loja', { p_peca_id: pecaId, p_preco: preco, p_na_loja: naLoja })
  if (error) throw error
}

export interface CompraDaLoja {
  compraId: number
  alunoId: string
  nome: string
  apelido: string | null
  pecaId: string
  peca: string
  preco: number
  compradaEm: string
  devolvidaEm: string | null
}

export async function carregarHistoricoDaLoja(limite = 50): Promise<CompraDaLoja[]> {
  const { data, error } = await supabase().rpc('historico_da_loja', { p_limite: limite })
  if (error) throw error
  return (
    (data ?? []) as {
      compra_id: number
      aluno_id: string
      nome: string
      apelido: string | null
      peca_id: string
      peca: string
      preco: number
      comprada_em: string
      devolvida_em: string | null
    }[]
  ).map((l) => ({
    compraId: l.compra_id,
    alunoId: l.aluno_id,
    nome: l.nome,
    apelido: l.apelido ?? null,
    pecaId: l.peca_id,
    peca: l.peca,
    preco: l.preco,
    compradaEm: l.comprada_em,
    devolvidaEm: l.devolvida_em,
  }))
}

export async function devolverCompra(compraId: number): Promise<void> {
  const { error } = await supabase().rpc('devolver_compra', { p_compra_id: compraId })
  if (error) throw error
}
