import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { buscarPerfil, type Perfil } from '../lib/api'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import { AuthContext, type EstadoAuth } from './AuthContext'

/** Guarda quem está logado e o perfil dessa pessoa, para todas as telas. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const configurado = supabaseConfigurado()
  const [carregando, setCarregando] = useState(configurado)
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [recuperandoSenha, setRecuperandoSenha] = useState(false)

  const carregarPerfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setPerfil(null)
      return
    }
    try {
      setPerfil(await buscarPerfil(s.user.id))
    } catch {
      setPerfil(null)
    }
  }, [])

  useEffect(() => {
    if (!configurado) return
    const cliente = supabase()
    let ativo = true

    // A sessão inicial (inclui a que chega pelo link do e-mail) vem no 1º evento.
    const { data } = cliente.auth.onAuthStateChange((evento, novaSessao) => {
      if (!ativo) return
      if (evento === 'PASSWORD_RECOVERY') setRecuperandoSenha(true)
      if (evento === 'SIGNED_OUT') setRecuperandoSenha(false)
      setSessao(novaSessao)
      // Fora do callback, como o Supabase recomenda (evita travar o cliente).
      setTimeout(() => {
        void carregarPerfil(novaSessao).finally(() => {
          if (ativo) setCarregando(false)
        })
      }, 0)
    })

    return () => {
      ativo = false
      data.subscription.unsubscribe()
    }
  }, [configurado, carregarPerfil])

  const sair = useCallback(async () => {
    if (configurado) await supabase().auth.signOut()
    setSessao(null)
    setPerfil(null)
  }, [configurado])

  const recarregarPerfil = useCallback(() => carregarPerfil(sessao), [carregarPerfil, sessao])

  const valor = useMemo<EstadoAuth>(
    () => ({ carregando, sessao, perfil, recuperandoSenha, sair, recarregarPerfil }),
    [carregando, sessao, perfil, recuperandoSenha, sair, recarregarPerfil],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
