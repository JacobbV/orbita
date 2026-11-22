import { createContext, useContext } from 'react'

export interface EstadoModoNinja {
  /** true só para o professor que ligou o Modo Ninja nesta aba. */
  ativo: boolean
  entrar: () => void
  sair: () => void
}

export const ModoNinjaContext = createContext<EstadoModoNinja>({ ativo: false, entrar: () => {}, sair: () => {} })

export function useModoNinja(): EstadoModoNinja {
  return useContext(ModoNinjaContext)
}

export const CHAVE_MODO_NINJA = 'orbita:modo-ninja'
