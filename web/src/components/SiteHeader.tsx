import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useModoNinja } from '../ninja/ModoNinja'
import { Logo } from './Logo'
import './SiteHeader.css'

/** Topo das páginas: logo, atalhos da página inicial e botões de acesso. */
export function SiteHeader() {
  const { sessao, perfil, sair } = useAuth()
  const navegar = useNavigate()
  const ninja = useModoNinja()

  const sairDaConta = async () => {
    await sair()
    navegar('/', { replace: true })
  }

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
          {sessao ? (
            <>
              <Link to={ninja.ativo ? '/ninja' : perfil?.papel === 'professor' ? '/professor' : '/aguardando'} className="botao botao-compacto">
                Minha área
              </Link>
              <button type="button" className="botao botao-compacto" onClick={() => void sairDaConta()}>
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/entrar" className="botao botao-compacto">
                Entrar
              </Link>
              <Link to="/cadastro" className="botao botao-primario botao-compacto">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
