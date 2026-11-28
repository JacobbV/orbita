import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Carregando } from '../components/Carregando'
import { useModoNinja } from '../ninja/ModoNinja'
import { useAuth } from './AuthContext'

/** Só mostra o conteúdo para quem entrou. Quem não entrou vai para /entrar. */
export function RotaProtegida({ children, papel }: { children: ReactNode; papel?: 'aluno' | 'professor' }) {
  const { carregando, sessao, perfil } = useAuth()
  const local = useLocation()

  if (carregando) return <Carregando />
  if (!sessao) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />
  if (papel && perfil?.papel !== papel) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Telas do aluno que o professor também abre no Modo Ninja (fora dele, volta ao painel). */
export function AlunoOuNinja({ children }: { children: ReactNode }) {
  const { perfil } = useAuth()
  const ninja = useModoNinja().ativo
  if (perfil?.papel === 'professor' && !ninja) return <Navigate to="/professor" replace />
  return <>{children}</>
}
