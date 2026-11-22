import { PADRAO_ALUNO, PADRAO_PROFESSOR, PECAS, type Camada, type Escolhas } from '../arte/avatar'
import { supabase } from './supabase'

const CAMADAS: Camada[] = ['corpo', 'pele', 'rosto', 'cabelo', 'cor-do-cabelo', 'roupa', 'acessorio']

/** Fica só o que é peça conhecida da camada certa (o banco confere de novo ao salvar). */
export function limparEscolhas(valor: unknown): Escolhas {
  const saida: Escolhas = {}
  if (!valor || typeof valor !== 'object') return saida
  for (const camada of CAMADAS) {
    const id = (valor as Record<string, unknown>)[camada]
    if (typeof id === 'string' && PECAS.some((p) => p.id === id && p.camada === camada)) saida[camada] = id
  }
  return saida
}

export function avatarPadrao(papel: 'aluno' | 'professor'): Escolhas {
  return papel === 'professor' ? PADRAO_PROFESSOR : PADRAO_ALUNO
}

/** Avatar salvo de um perfil (o próprio ou o do professor), ou o padrão do papel. */
export async function carregarAvatar(perfilId: string, papel: 'aluno' | 'professor'): Promise<Escolhas> {
  const { data, error } = await supabase().from('avatares').select('escolhas').eq('perfil_id', perfilId).maybeSingle()
  if (error) throw error
  return data ? { ...avatarPadrao(papel), ...limparEscolhas(data.escolhas) } : avatarPadrao(papel)
}

export async function salvarAvatar(escolhas: Escolhas): Promise<void> {
  const { error } = await supabase().rpc('salvar_avatar', { p_escolhas: limparEscolhas(escolhas) })
  if (error) throw error
}
