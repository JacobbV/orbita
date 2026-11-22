import { Link } from 'react-router'
import './SiteFooter.css'

/** Rodapé com créditos e a marca QYUDEV., igual em todas as páginas. */
export function SiteFooter() {
  return (
    <footer className="rodape">
      <div className="container rodape-linha">
        <p className="rodape-creditos">
          Fontes Inter, JetBrains Mono e Press Start 2P · SIL Open Font License ·{' '}
          <Link to="/creditos">Créditos e licenças</Link>
        </p>
        <p className="rodape-marca">
          Desenvolvido por{' '}
          <a href="https://jacobbv.github.io" className="qyudev" rel="noopener">
            QYUDEV.
          </a>
        </p>
      </div>
    </footer>
  )
}
