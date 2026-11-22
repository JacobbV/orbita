import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { meusPedidos } from '../lib/api'
import { rotaInicial } from '../lib/rotas'
import { useAuth } from './AuthContext'

/** Se já houver alguém logado, leva para a área certa (professor, ponte ou aguardando). */
export function useIrParaAreaInicial(ativo = true) {
  const { sessao, perfil, carregando } = useAuth()
  const navegar = useNavigate()

  useEffect(() => {
    if (!ativo || carregando || !sessao || !perfil) return
    let cancelado = false
    const ir = async () => {
      const pedidos = perfil.papel === 'aluno' ? await meusPedidos().catch(() => []) : []
      if (!cancelado) navegar(rotaInicial(perfil, pedidos), { replace: true })
    }
    void ir()
    return () => {
      cancelado = true
    }
  }, [ativo, carregando, sessao, perfil, navegar])
}
