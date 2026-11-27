import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useModoNinja } from '../ninja/ModoNinja'
import { ehRotaDoSistema, itensDoMenu } from '../lib/menu'
import { Logo } from './Logo'
import { MenuDoPerfil } from './MenuDoPerfil'
import './SiteHeader.css'

/** Topo das páginas: logo, atalhos da página inicial e botões de acesso. */
export function SiteHeader() {
  const { sessao, perfil, sair } = useAuth()
  const navegar = useNavigate()
  const ninja = useModoNinja()
  const { pathname } = useLocation()
  const noSistema = Boolean(sessao && perfil && ehRotaDoSistema(pathname))

  const sairDaConta = async () => {
    await sair()
    navegar('/', { replace: true })
  }

  return (
    <header className="topo">
      <div className="container topo-linha">
        <div className="topo-esquerda">
          <Logo />
          {noSistema && perfil ? (
            <nav className="topo-nav topo-nav-sistema" aria-label="Menu do sistema">
              {itensDoMenu(perfil.papel, ninja.ativo).map((i) => (
                <NavLink key={i.para} to={i.para} end={i.para === '/professor'} {...(i.secundario ? { className: 'topo-nav-secundario' } : {})}>
                  {i.rotulo}
                </NavLink>
              ))}
            </nav>
          ) : (
            <nav className="topo-nav" aria-label="Seções da página inicial">
              <Link to="/#disciplinas">Disciplinas</Link>
              <Link to="/#como-funciona">Como funciona</Link>
              <Link to="/creditos">Créditos</Link>
            </nav>
          )}
        </div>
        <div className="topo-acoes">
          {sessao ? (
            <>
              {!noSistema && (
                <Link to={ninja.ativo ? '/ninja' : perfil?.papel === 'professor' ? '/professor' : '/ponte'} className="botao botao-compacto">
                  Minha área
                </Link>
              )}
              <MenuDoPerfil perfil={perfil} onSair={() => void sairDaConta()} />
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
