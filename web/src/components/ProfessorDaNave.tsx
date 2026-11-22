import { useEffect, useState } from 'react'
import { carregarProfessorDaNave, type ProfessorDaNave as Professor } from '../lib/avatar'
import { Avatar } from './Avatar'
import './ProfessorDaNave.css'

/** O boneco do professor na ponte dos alunos. Se não carregar, não aparece. */
export function ProfessorDaNave() {
  const [professor, setProfessor] = useState<Professor | null>(null)

  useEffect(() => {
    let ativo = true
    carregarProfessorDaNave().then(
      (p) => {
        if (ativo) setProfessor(p)
      },
      () => {},
    )
    return () => {
      ativo = false
    }
  }, [])

  if (!professor) return null
  return (
    <aside className="cartao professor-da-nave" aria-label="Seu professor">
      <span className="professor-da-nave-boneco">
        <Avatar escolhas={professor.escolhas} tamanho={72} rotulo="" />
      </span>
      <div>
        <p className="pixel professor-da-nave-selo">Comandante da nave</p>
        <p className="professor-da-nave-nome">{professor.nome}</p>
        <p className="professor-da-nave-texto">Libera as aulas e dá XP por participação.</p>
      </div>
    </aside>
  )
}
