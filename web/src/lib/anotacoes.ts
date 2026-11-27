import type { Json } from './database.types'
import { lerRabiscos, type RabiscosPorSlide } from './rabiscos'
import { supabase } from './supabase'

// Marcador de página e rabiscos pessoais nos slides (tabela slides_do_usuario).
// Cada pessoa só lê e escreve os seus; o banco confere (RLS).

export interface AnotacoesDosSlides {
  marcador: number | null
  rabiscos: RabiscosPorSlide
}

export async function carregarAnotacoes(materialId: number): Promise<AnotacoesDosSlides> {
  const { data, error } = await supabase()
    .from('slides_do_usuario')
    .select('marcador, rabiscos')
    .eq('material_id', materialId)
    .maybeSingle()
  if (error) throw error
  return { marcador: data?.marcador ?? null, rabiscos: lerRabiscos(data?.rabiscos) }
}

/** Guarda só o que veio em `parte`; o resto da linha fica como está. */
export async function guardarAnotacoes(
  usuarioId: string,
  materialId: number,
  parte: { marcador?: number | null; rabiscos?: RabiscosPorSlide },
): Promise<void> {
  const linha: { usuario_id: string; material_id: number; marcador?: number | null; rabiscos?: Json } = {
    usuario_id: usuarioId,
    material_id: materialId,
  }
  if (parte.marcador !== undefined) linha.marcador = parte.marcador
  if (parte.rabiscos !== undefined) linha.rabiscos = parte.rabiscos as unknown as Json
  const { error } = await supabase().from('slides_do_usuario').upsert(linha, { onConflict: 'usuario_id,material_id' })
  if (error) throw error
}

export const LIMITE_DA_ANOTACAO = 5000

/** Anotação pessoal da aula (texto livre). Vazio se a pessoa ainda não escreveu. */
export async function carregarAnotacaoDaAula(aulaId: number): Promise<string> {
  const { data, error } = await supabase().from('anotacoes_da_aula').select('texto').eq('aula_id', aulaId).maybeSingle()
  if (error) throw error
  return data?.texto ?? ''
}

export async function guardarAnotacaoDaAula(usuarioId: string, aulaId: number, texto: string): Promise<void> {
  const { error } = await supabase()
    .from('anotacoes_da_aula')
    .upsert(
      { usuario_id: usuarioId, aula_id: aulaId, texto: texto.slice(0, LIMITE_DA_ANOTACAO) },
      { onConflict: 'usuario_id,aula_id' },
    )
  if (error) throw error
}
