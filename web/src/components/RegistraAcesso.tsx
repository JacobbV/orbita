import { useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { registrarAcesso } from '../lib/acessos'

const INTERVALO_MS = 2 * 60_000

/** Enquanto o aluno está com o site aberto e visível, avisa o banco a cada 2 minutos. Só para alunos. */
export function RegistraAcesso() {
  const { perfil } = useAuth()
  const ehAluno = perfil?.papel === 'aluno'

  useEffect(() => {
    if (!ehAluno) return
    const avisar = () => {
      if (document.visibilityState === 'visible') void registrarAcesso()
    }
    avisar()
    const relogio = window.setInterval(avisar, INTERVALO_MS)
    document.addEventListener('visibilitychange', avisar)
    return () => {
      window.clearInterval(relogio)
      document.removeEventListener('visibilitychange', avisar)
    }
  }, [ehAluno])

  return null
}
