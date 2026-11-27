import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Perfil } from '../lib/api'
import { inicialDoPerfil } from '../lib/menu'
import './MenuDoPerfil.css'

interface Props {
  perfil: Perfil | null
  onSair: () => void
}

/** Bolinha de perfil no canto do topo, com o menu da conta. */
export function MenuDoPerfil({ perfil, onSair }: Props) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent | TouchEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('touchstart', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('touchstart', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  const nome = perfil?.nome.trim() || 'Minha conta'
  return (
    <div className="perfil-menu" ref={raiz}>
      <button
        type="button"
        className="perfil-bolinha"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={`Menu da conta de ${nome}`}
        onClick={() => setAberto((a) => !a)}
      >
        <span aria-hidden="true">{inicialDoPerfil(perfil)}</span>
      </button>
      {aberto && (
        <div className="perfil-painel" role="menu">
          <p className="perfil-quem">
            <strong>{nome}</strong>
            {perfil?.apelido && <span>{perfil.apelido}</span>}
          </p>
          <Link to="/hangar" role="menuitem" onClick={() => setAberto(false)}>
            Meu boneco
          </Link>
          {perfil?.papel === 'aluno' && (
            <Link to="/aguardando" role="menuitem" onClick={() => setAberto(false)}>
              Meus pedidos de acesso
            </Link>
          )}
          <Link to="/" role="menuitem" onClick={() => setAberto(false)}>
            Página inicial
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAberto(false)
              onSair()
            }}
          >
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
