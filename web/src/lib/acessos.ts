import { supabase } from './supabase'

// Último acesso dos alunos. O aluno só avisa que está com o site aberto; quem lê
// é o professor (RLS). Nenhum aluno vê isso, nem o próprio.

export const MINUTOS_PARA_ONLINE = 5

/** Avisa o banco que este aluno está com o site aberto. Nunca atrapalha a tela se falhar. */
export async function registrarAcesso(): Promise<void> {
  try {
    await supabase().rpc('registrar_acesso')
  } catch {
    // Sem rede ou sem banco: o aluno segue usando o site normalmente.
  }
}

/** Último acesso de cada aluno da lista, pelo id. Quem nunca avisou fica de fora. */
export async function carregarAcessos(alunoIds: string[]): Promise<Map<string, string>> {
  if (alunoIds.length === 0) return new Map()
  try {
    const { data, error } = await supabase().from('acessos').select('perfil_id, ultimo_acesso').in('perfil_id', alunoIds)
    // É um extra: sem ele a lista aparece igual, só sem a coluna de acesso.
    if (error) return new Map()
    return new Map(data.map((a) => [a.perfil_id, a.ultimo_acesso]))
  } catch {
    return new Map()
  }
}

export interface SituacaoDeAcesso {
  online: boolean
  texto: string
}

/** "online agora", "visto há 12 min", "visto há 3 h", "visto há 2 dias" ou "ainda não entrou". */
export function situacaoDeAcesso(ultimo: string | null | undefined, agora: Date = new Date()): SituacaoDeAcesso {
  if (!ultimo) return { online: false, texto: 'sem registro de acesso' }
  const minutos = Math.max(0, Math.floor((agora.getTime() - new Date(ultimo).getTime()) / 60_000))
  if (minutos < MINUTOS_PARA_ONLINE) return { online: true, texto: 'online agora' }
  if (minutos < 60) return { online: false, texto: `visto há ${minutos} min` }
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return { online: false, texto: `visto há ${horas} h` }
  const dias = Math.floor(horas / 24)
  return { online: false, texto: `visto há ${dias} ${dias === 1 ? 'dia' : 'dias'}` }
}
