import { supabase } from './supabase'

/** Cadeiras dos laboratórios que já têm dono, e qual delas é a minha (sem nome de ninguém). */
export async function cadeirasOcupadas(): Promise<Map<string, boolean>> {
  const { data, error } = await supabase().rpc('cadeiras_ocupadas')
  if (error) throw error
  return new Map((data ?? []).map((c) => [c.assento, c.minha]))
}

export async function escolherCadeira(sala: string, assento: string): Promise<void> {
  const { error } = await supabase().rpc('escolher_cadeira', { p_sala: sala, p_assento: assento })
  if (error) throw error
}

export async function soltarCadeira(): Promise<void> {
  const { error } = await supabase().rpc('soltar_cadeira')
  if (error) throw error
}
