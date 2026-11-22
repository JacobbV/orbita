import { supabase } from './supabase'

// Medalhas: o catálogo vem do banco; as ganhas, só as do próprio aluno (RLS).

export interface MedalhaDoAluno {
  codigo: string
  nome: string
  descricao: string
  /** Data em que foi ganha, ou null para a que ainda falta. */
  ganhaEm: string | null
}

/** Todas as medalhas, na ordem do catálogo, marcando as que o perfil já ganhou. */
export async function carregarMedalhas(perfilId: string): Promise<MedalhaDoAluno[]> {
  const [catalogo, ganhas] = await Promise.all([
    supabase().from('medalhas').select('codigo, nome, descricao, ordem').order('ordem'),
    supabase().from('medalhas_ganhas').select('medalha, ganha_em').eq('aluno_id', perfilId),
  ])
  if (catalogo.error) throw catalogo.error
  if (ganhas.error) throw ganhas.error
  const quando = new Map((ganhas.data ?? []).map((g) => [g.medalha, g.ganha_em]))
  return (catalogo.data ?? []).map((m) => ({
    codigo: m.codigo,
    nome: m.nome,
    descricao: m.descricao,
    ganhaEm: quando.get(m.codigo) ?? null,
  }))
}

/** As ganhas, da mais recente para a mais antiga. */
export function ultimasGanhas(medalhas: MedalhaDoAluno[], quantas = 3): MedalhaDoAluno[] {
  return medalhas
    .filter((m) => m.ganhaEm !== null)
    .sort((a, b) => (b.ganhaEm ?? '').localeCompare(a.ganhaEm ?? ''))
    .slice(0, quantas)
}
