import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Só a chave PÚBLICA (anon/publishable) vai no site. A chave de serviço nunca.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chavePublica = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export type Banco = SupabaseClient<Database>

let cliente: Banco | null = null

/** true quando o site foi compilado com a URL e a chave pública do Supabase. */
export function supabaseConfigurado(): boolean {
  return Boolean(url && chavePublica)
}

/** Cliente do Supabase, criado uma vez só. */
export function supabase(): Banco {
  if (!url || !chavePublica) {
    throw new Error(
      'Supabase não configurado: crie web/.env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja web/.env.example).',
    )
  }
  cliente ??= createClient<Database>(url, chavePublica, {
    auth: {
      // "implicit": o link do e-mail funciona mesmo se o aluno abrir em outro aparelho.
      flowType: 'implicit',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return cliente
}

/** Endereço completo de uma página do site, para os links enviados por e-mail. */
export function urlDoSite(caminho: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}${caminho.replace(/^\//, '')}`
}
