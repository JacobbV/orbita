import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Escolhas } from '../arte/avatar'
import { useAuth } from '../auth/AuthContext'
import { avatarPadrao, carregarAvatar } from '../lib/avatar'
import { Avatar } from './Avatar'
import './BonecoDoHangar.css'

/** O boneco de quem está logado, com o atalho para o Hangar. */
export function BonecoDoHangar() {
  const { perfil } = useAuth()
  const papel = perfil?.papel === 'professor' ? 'professor' : 'aluno'
  const [escolhas, setEscolhas] = useState<Escolhas>(avatarPadrao(papel))

  useEffect(() => {
    if (!perfil) return
    let ativo = true
    // O boneco é um extra: se falhar, fica o padrão.
    carregarAvatar(perfil.id, papel).then(
      (e) => {
        if (ativo) setEscolhas(e)
      },
      () => {},
    )
    return () => {
      ativo = false
    }
  }, [perfil, papel])

  return (
    <Link to="/hangar" className="boneco-hangar">
      <Avatar escolhas={escolhas} tamanho={96} rotulo="" />
      <span className="boneco-hangar-rotulo">Hangar</span>
      <span className="sr-only">: montar o seu boneco</span>
    </Link>
  )
}
