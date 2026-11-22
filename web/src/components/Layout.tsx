import { Outlet } from 'react-router'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'
import { ScrollToHash } from './ScrollToHash'

/** Moldura das páginas públicas: topo, conteúdo e rodapé. */
export function PublicLayout() {
  return (
    <>
      <a href="#conteudo" className="pular-link">
        Pular para o conteúdo
      </a>
      <ScrollToHash />
      <SiteHeader />
      <main id="conteudo" className="principal" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  )
}
