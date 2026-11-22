import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Endereços e chaves do Supabase local, lidos na hora com `npx supabase status`.
// Nada disso fica em arquivo. Em outro ambiente, as variáveis SUPABASE_URL,
// SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY e MAILPIT_URL têm prioridade.

export interface SupabaseLocal {
  url: string
  anonKey: string
  serviceKey: string
  mailpitUrl: string
}

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

let cache: SupabaseLocal | null = null

export function supabaseLocal(): SupabaseLocal {
  if (cache) return cache
  const env = process.env
  let status: Record<string, string> = {}
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const saida = execSync('npx supabase status -o json', { cwd: RAIZ, stdio: ['ignore', 'pipe', 'ignore'] })
      status = JSON.parse(saida.toString()) as Record<string, string>
    } catch {
      throw new Error('Supabase local desligado. Rode `npx supabase start` na raiz do repositório antes dos testes.')
    }
  }
  const valor = (nomeEnv: string, nomeStatus: string, padrao?: string): string => {
    const v = env[nomeEnv] ?? status[nomeStatus] ?? padrao
    if (!v) throw new Error(`Falta ${nomeEnv} (ou ${nomeStatus} no supabase status).`)
    return v
  }
  cache = {
    url: valor('SUPABASE_URL', 'API_URL'),
    anonKey: valor('SUPABASE_ANON_KEY', 'ANON_KEY'),
    serviceKey: valor('SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY'),
    mailpitUrl: valor('MAILPIT_URL', 'MAILPIT_URL', 'http://127.0.0.1:54324'),
  }
  return cache
}
