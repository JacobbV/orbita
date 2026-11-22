import { Link, useLocation, useNavigate } from 'react-router'
import { useModoNinja } from './ModoNinja'
import './Ninja.css'

/** Faixa no topo de todas as telas enquanto o Modo Ninja está ligado. */
export function FaixaNinja() {
  const ninja = useModoNinja()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  if (!ninja.ativo) return null
  return (
    <div className="faixa-ninja" role="region" aria-label="Modo Ninja">
      <div className="container faixa-ninja-linha">
        <p>
          <span className="pixel faixa-ninja-selo">Modo Ninja</span> Nada é entregue e ninguém ganha XP.
        </p>
        <div className="faixa-ninja-acoes">
          {pathname !== '/ninja' && (
            <Link to="/ninja" className="botao botao-compacto">
              Ponte ninja
            </Link>
          )}
          <button
            type="button"
            className="botao botao-compacto"
            onClick={() => {
              ninja.sair()
              navegar('/professor')
            }}
          >
            Sair do modo Ninja
          </button>
        </div>
      </div>
    </div>
  )
}
