import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Carregando } from '../components/Carregando'
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
