import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { CHAVE_MODO_NINJA, ModoNinjaContext, type EstadoModoNinja } from './ModoNinja'

function lerLigado(): boolean {
  try {
    return sessionStorage.getItem(CHAVE_MODO_NINJA) === '1'
  } catch {
    return false
  }
}

function gravarLigado(ligado: boolean) {
  try {
    if (ligado) sessionStorage.setItem(CHAVE_MODO_NINJA, '1')
    else sessionStorage.removeItem(CHAVE_MODO_NINJA)
  } catch {
    // Sem armazenamento (aba anônima): o modo vale até recarregar a página.
  }
}

/**
 * Modo Ninja: o professor navega como aluno, com o boneco ninja.
 * É só um jeito de ver as telas: as permissões no banco continuam as do professor,
 * que nunca tem matrícula, então não aparece em listas, XP nem relatórios.
 */
export function ModoNinjaProvider({ children }: { children: ReactNode }) {
  const { perfil } = useAuth()
  const [ligado, setLigado] = useState(lerLigado)

  const entrar = useCallback(() => {
    gravarLigado(true)
    setLigado(true)
  }, [])
  const sair = useCallback(() => {
    gravarLigado(false)
    setLigado(false)
  }, [])

  const ativo = ligado && perfil?.papel === 'professor'
  const valor = useMemo<EstadoModoNinja>(() => ({ ativo, entrar, sair }), [ativo, entrar, sair])
  return <ModoNinjaContext.Provider value={valor}>{children}</ModoNinjaContext.Provider>
}
