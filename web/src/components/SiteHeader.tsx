import { Link } from 'react-router'
import { Logo } from './Logo'
import './SiteHeader.css'

/** Topo das páginas públicas: logo, atalhos da página inicial e botões de acesso. */
export function SiteHeader() {
  return (
    <header className="topo">
      <div className="container topo-linha">
        <div className="topo-esquerda">
          <Logo />
          <nav className="topo-nav" aria-label="Seções da página inicial">
            <Link to="/#disciplinas">Disciplinas</Link>
            <Link to="/#como-funciona">Como funciona</Link>
            <Link to="/creditos">Créditos</Link>
          </nav>
        </div>
        <div className="topo-acoes">
          <Link to="/entrar" className="botao botao-compacto">
            Entrar
          </Link>
          <Link to="/cadastro" className="botao botao-primario botao-compacto">
            Criar conta
          </Link>
        </div>
      </div>
    </header>
  )
}
