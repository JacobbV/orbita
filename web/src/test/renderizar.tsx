import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { App } from '../App'
import { AuthContext, type EstadoAuth } from '../auth/AuthContext'

// jsdom não desenha canvas e não tem matchMedia; o fundo de estrelas só precisa não quebrar.
export function prepararNavegadorFalso() {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  window.scrollTo = () => {}
}

export const SEM_LOGIN: EstadoAuth = {
  carregando: false,
  sessao: null,
  perfil: null,
  recuperandoSenha: false,
  sair: async () => {},
  recarregarPerfil: async () => {},
}

/** Abre o site numa rota, com um estado de login falso (sem falar com o Supabase). */
export function abrir(rota: string, auth: EstadoAuth = SEM_LOGIN) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[rota]}>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}
