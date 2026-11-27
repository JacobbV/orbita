import { CAMADAS, COR_LIVRE, PADRAO_ALUNO, PADRAO_NINJA, PADRAO_PROFESSOR, corValida, peca, type Escolhas } from '../arte/avatar'
import { supabase } from './supabase'

/**
 * Fica só o que é peça conhecida da camada certa (o banco confere de novo ao salvar).
 * O acessório no formato antigo ("acessorio") vai para o grupo novo dele.
 */
export function limparEscolhas(valor: unknown): Escolhas {
  const saida: Escolhas = {}
  if (!valor || typeof valor !== 'object') return saida
  const v = valor as Record<string, unknown>
  const antigo = typeof v.acessorio === 'string' ? peca(v.acessorio) : undefined
  if (antigo?.camada.startsWith('acessorio-')) saida[antigo.camada] = antigo.id
  for (const camada of CAMADAS) {
    const id = v[camada]
    if (typeof id === 'string' && peca(id)?.camada === camada) saida[camada] = id
  }
  if (corValida(v[COR_LIVRE])) saida[COR_LIVRE] = v[COR_LIVRE]
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

/** Boneco do Modo Ninja do professor, ou o ninja padrão. */
export async function carregarAvatarNinja(perfilId: string): Promise<Escolhas> {
  const { data, error } = await supabase().from('avatares').select('escolhas_ninja').eq('perfil_id', perfilId).maybeSingle()
  if (error) throw error
  return data?.escolhas_ninja ? { ...PADRAO_NINJA, ...limparEscolhas(data.escolhas_ninja) } : PADRAO_NINJA
}

export async function salvarAvatarNinja(escolhas: Escolhas): Promise<void> {
  const { error } = await supabase().rpc('salvar_avatar_ninja', { p_escolhas: limparEscolhas(escolhas) })
  if (error) throw error
}

export interface ProfessorDaNave {
  nome: string
  apelido: string | null
  escolhas: Escolhas
}

/** Nome e boneco do professor, para os alunos aprovados (null para os demais). */
export async function carregarProfessorDaNave(): Promise<ProfessorDaNave | null> {
  const { data, error } = await supabase().rpc('professor_da_nave')
  if (error) throw error
  const linha = (data as { nome: string; apelido: string | null; escolhas: unknown }[] | null)?.[0]
  if (!linha) return null
  return { nome: linha.nome, apelido: linha.apelido ?? null, escolhas: { ...avatarPadrao('professor'), ...limparEscolhas(linha.escolhas) } }
}
