import { supabase } from './supabase'

// Consultas ao banco usadas pelas telas. As regras de acesso (RLS) ficam no banco.

export type Turno = 'manha' | 'tarde' | 'noite'
export type StatusPedido = 'pendente' | 'aprovado' | 'recusado'

export interface Oferta {
  id: number
  turma: { id: number; nome: string; turno: string; anoLetivo: number }
  disciplina: { id: number; sigla: string; nome: string }
}

export interface Perfil {
  id: string
  nome: string
  email: string
  papel: 'aluno' | 'professor'
}

export interface Pedido {
  id: number
  status: StatusPedido
  tentativa: number
  motivoRecusa: string | null
  quemEVoce: string
  criadoEm: string
  oferta: Oferta
}

export const MAX_TENTATIVAS_POR_TURMA = 3

const NOMES_TURNO: Record<string, string> = { manha: 'manhã', tarde: 'tarde', noite: 'noite' }

export function nomeTurno(turno: string): string {
  return NOMES_TURNO[turno] ?? turno
}

/** "1º INFO M · 2026" */
export function rotuloTurma(t: Oferta['turma']): string {
  return `${t.nome} · ${t.anoLetivo}`
}

const CAMPOS_OFERTA =
  'id, turma:turmas!inner(id, nome, turno, ano_letivo, ativa), disciplina:disciplinas!inner(id, sigla, nome, ordem)'

interface OfertaDoBanco {
  id: number
  turma: { id: number; nome: string; turno: string; ano_letivo: number }
  disciplina: { id: number; sigla: string; nome: string; ordem?: number }
}

function converterOferta(o: OfertaDoBanco): Oferta {
  return {
    id: o.id,
    turma: { id: o.turma.id, nome: o.turma.nome, turno: o.turma.turno, anoLetivo: o.turma.ano_letivo },
    disciplina: { id: o.disciplina.id, sigla: o.disciplina.sigla, nome: o.disciplina.nome },
  }
}

/** Turmas ativas e as disciplinas de cada uma (público: o cadastro precisa antes do login). */
export async function listarOfertas(): Promise<Oferta[]> {
  const { data, error } = await supabase()
    .from('turma_disciplinas')
    .select(CAMPOS_OFERTA)
    .eq('turma.ativa', true)
  if (error) throw error
  const ofertas = (data as unknown as OfertaDoBanco[]).map(converterOferta)
  return ofertas.sort(
    (a, b) =>
      a.disciplina.nome.localeCompare(b.disciplina.nome, 'pt-BR') ||
      a.turma.nome.localeCompare(b.turma.nome, 'pt-BR'),
  )
}

/** Disciplinas distintas a partir das ofertas, na ordem alfabética. */
export function disciplinasDasOfertas(ofertas: Oferta[]): Oferta['disciplina'][] {
  const mapa = new Map<number, Oferta['disciplina']>()
  for (const o of ofertas) mapa.set(o.disciplina.id, o.disciplina)
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export async function buscarPerfil(id: string): Promise<Perfil | null> {
  const { data, error } = await supabase()
    .from('perfis')
    .select('id, nome, email, papel')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as Perfil | null
}

interface PedidoDoBanco {
  id: number
  status: StatusPedido
  tentativa: number
  motivo_recusa: string | null
  quem_e_voce: string
  criado_em: string
  oferta: OfertaDoBanco
}

/** Pedidos do aluno logado, do mais novo para o mais antigo. */
export async function meusPedidos(): Promise<Pedido[]> {
  const { data, error } = await supabase()
    .from('matriculas')
    .select(
      `id, status, tentativa, motivo_recusa, quem_e_voce, criado_em, oferta:turma_disciplinas!inner(${CAMPOS_OFERTA})`,
    )
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data as unknown as PedidoDoBanco[]).map((p) => ({
    id: p.id,
    status: p.status,
    tentativa: p.tentativa,
    motivoRecusa: p.motivo_recusa,
    quemEVoce: p.quem_e_voce,
    criadoEm: p.criado_em,
    oferta: converterOferta(p.oferta),
  }))
}

export async function pedirAcesso(ofertaId: number, quemEVoce: string): Promise<void> {
  const { error } = await supabase().rpc('pedir_acesso', {
    p_turma_disciplina_id: ofertaId,
    p_quem_e_voce: quemEVoce.trim(),
  })
  if (error) throw error
}
