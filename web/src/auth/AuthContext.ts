import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { Perfil } from '../lib/api'

export interface EstadoAuth {
  /** true enquanto descobrimos se há alguém logado. */
  carregando: boolean
  sessao: Session | null
  perfil: Perfil | null
  /** true quando a pessoa chegou pelo link "redefinir senha". */
  recuperandoSenha: boolean
  sair: () => Promise<void>
  recarregarPerfil: () => Promise<void>
}

export const AuthContext = createContext<EstadoAuth | null>(null)

export function useAuth(): EstadoAuth {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return ctx
}
