import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router'
import { AuthContext, type EstadoAuth } from '../auth/AuthContext'
import { SEM_LOGIN } from '../test/renderizar'
import { SiteHeader } from './SiteHeader'

// Dados inventados.
const ALUNO: EstadoAuth = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'a1' } } as unknown as Session,
  perfil: { id: 'a1', nome: 'Tripulante Fictício', email: 'tripulante@academico.ifpb.edu.br', papel: 'aluno', apelido: 'Cometa Veloz' },
}

function topo(rota: string, auth: EstadoAuth) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[rota]}>
        <SiteHeader />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('topo do site', () => {
  it('depois de entrar, nas telas do sistema, troca os links da página inicial pelos menus', () => {
    topo('/ponte', ALUNO)
    const menu = screen.getByRole('navigation', { name: 'Menu do sistema' })
    expect(within(menu).getAllByRole('link').map((l) => l.textContent)).toEqual(['Ponte', 'Mapa', 'Hangar', 'Medalhas', 'Ranking'])
    expect(screen.queryByRole('link', { name: 'Como funciona' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Créditos' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Minha área' })).toBeNull()
  })

  it('na página inicial, mesmo logado, mostra os menus públicos e o atalho Minha área', () => {
    topo('/', ALUNO)
    expect(screen.getByRole('link', { name: 'Como funciona' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Minha área' })).toHaveAttribute('href', '/ponte')
    expect(screen.queryByRole('navigation', { name: 'Menu do sistema' })).toBeNull()
  })

  it('sem login, mostra Entrar e Criar conta', () => {
    topo('/ponte', SEM_LOGIN)
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeInTheDocument()
  })

  it('a bolinha de perfil abre o menu da conta, com Sair, e fecha com Esc', async () => {
    const sair = vi.fn(async () => {})
    topo('/ponte', { ...ALUNO, sair })
    const bolinha = screen.getByRole('button', { name: /Menu da conta de Tripulante Fictício/ })
    expect(bolinha).toHaveTextContent('C')
    await userEvent.click(bolinha)
    const menu = screen.getByRole('menu')
    expect(within(menu).getByText('Cometa Veloz')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    await userEvent.click(bolinha)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sair' }))
    expect(sair).toHaveBeenCalled()
  })
})
