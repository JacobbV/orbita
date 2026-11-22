import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PADRAO_NINJA, type Escolhas } from '../arte/avatar'
import { useAuth } from '../auth/AuthContext'
import { avatarPadrao, carregarAvatar, carregarAvatarNinja } from '../lib/avatar'
import { useModoNinja } from '../ninja/ModoNinja'
import { Avatar } from './Avatar'
import './BonecoDoHangar.css'

/**
 * O boneco de quem está logado, com o atalho para o Hangar.
 * Para o professor, logo abaixo fica a chave do Modo Ninja.
 */
export function BonecoDoHangar() {
  const { perfil } = useAuth()
  const ninja = useModoNinja()
  const navegar = useNavigate()
  const papel = perfil?.papel === 'professor' ? 'professor' : 'aluno'
  const [escolhas, setEscolhas] = useState<Escolhas>(ninja.ativo ? PADRAO_NINJA : avatarPadrao(papel))

  useEffect(() => {
    if (!perfil) return
    let ativo = true
    // O boneco é um extra: se falhar, fica o padrão.
    const carregar = ninja.ativo ? carregarAvatarNinja(perfil.id) : carregarAvatar(perfil.id, papel)
    carregar.then(
      (e) => {
        if (ativo) setEscolhas(e)
      },
      () => {},
    )
    return () => {
      ativo = false
    }
  }, [perfil, papel, ninja.ativo])

  const boneco = (
    <Link to="/hangar" className={`boneco-hangar${ninja.ativo ? ' boneco-hangar-ninja' : ''}`}>
      <Avatar escolhas={escolhas} tamanho={96} rotulo="" />
      <span className="boneco-hangar-rotulo">Hangar</span>
      <span className="sr-only">: montar o seu boneco{ninja.ativo ? ' ninja' : ''}</span>
    </Link>
  )
  if (papel !== 'professor') return boneco

  return (
    <div className="boneco-hangar-coluna">
      {boneco}
      {/* No Modo Ninja, a saída fica na faixa do topo de todas as telas. */}
      {!ninja.ativo && (
        <button
          type="button"
          className="boneco-hangar-chave"
          onClick={() => {
            ninja.entrar()
            navegar('/ninja')
          }}
        >
          Modo Ninja
        </button>
      )}
    </div>
  )
}
