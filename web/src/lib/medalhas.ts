import { supabase } from './supabase'

// Medalhas: o catálogo vem do banco; as ganhas, só as do próprio aluno (RLS).

export interface MedalhaDoAluno {
  codigo: string
  nome: string
  descricao: string
  /** Data em que foi ganha, ou null para a que ainda falta. */
  ganhaEm: string | null
  /** Quanto já tem e quanto precisa, nas medalhas de contagem (ex.: 10 de 15). Nulo nas outras. */
  progresso?: { atual: number; meta: number } | null
}

/** Todas as medalhas, na ordem do catálogo, marcando as que o perfil já ganhou. */
export async function carregarMedalhas(perfilId: string): Promise<MedalhaDoAluno[]> {
  const [catalogo, ganhas, contagens] = await Promise.all([
    supabase().from('medalhas').select('codigo, nome, descricao, ordem').order('ordem'),
    supabase().from('medalhas_ganhas').select('medalha, ganha_em').eq('aluno_id', perfilId),
    carregarProgresso(),
  ])
  if (catalogo.error) throw catalogo.error
  if (ganhas.error) throw ganhas.error
  const quando = new Map((ganhas.data ?? []).map((g) => [g.medalha, g.ganha_em]))
  return (catalogo.data ?? []).map((m) => ({
    codigo: m.codigo,
    nome: m.nome,
    descricao: m.descricao,
    ganhaEm: quando.get(m.codigo) ?? null,
    progresso: contagens.get(m.codigo) ?? null,
  }))
}

/** A barra é um extra: se a conta falhar, as medalhas aparecem sem ela. */
async function carregarProgresso(): Promise<Map<string, { atual: number; meta: number }>> {
  try {
    const { data, error } = await supabase().rpc('progresso_das_medalhas')
    if (error) return new Map()
    return new Map(data.map((p) => [p.medalha, { atual: p.atual, meta: p.meta }]))
  } catch {
    return new Map()
  }
}

/** As ganhas, da mais recente para a mais antiga. */
export function ultimasGanhas(medalhas: MedalhaDoAluno[], quantas = 3): MedalhaDoAluno[] {
  return medalhas
    .filter((m) => m.ganhaEm !== null)
    .sort((a, b) => (b.ganhaEm ?? '').localeCompare(a.ganhaEm ?? ''))
    .slice(0, quantas)
}
