import { supabase } from './supabase'

/** Sugere um apelido livre da lista aprovada. Não grava nada. */
export async function sortearApelido(evitar?: string | null): Promise<string> {
  const { data, error } = await supabase().rpc('sortear_apelido', evitar ? { p_evitar: evitar } : {})
  if (error) throw error
  if (!data) throw new Error('Todos os apelidos da lista já estão em uso. Avise o professor.')
  return data
}

/** Grava um apelido sorteado no próprio perfil. */
export async function escolherApelido(apelido: string): Promise<string> {
  const { data, error } = await supabase().rpc('escolher_apelido', { p_apelido: apelido })
  if (error) throw error
  return data
}

/** Professor: sorteia um apelido novo para o aluno e já grava. */
export async function sortearApelidoDoAluno(perfilId: string): Promise<string | null> {
  const { data, error } = await supabase().rpc('sortear_apelido_do_aluno', { p_perfil: perfilId })
  if (error) throw error
  return data
}

/** Professor: apaga o apelido do aluno (ele pode sortear outro depois). */
export async function apagarApelido(perfilId: string): Promise<void> {
  const { error } = await supabase().rpc('apagar_apelido', { p_perfil: perfilId })
  if (error) throw error
}
