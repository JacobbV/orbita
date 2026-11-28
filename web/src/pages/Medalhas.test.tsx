import { screen, within } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'

// Dados inventados. O falso fica fora do vi.fn (promessas rejeitadas).
const falso = vi.hoisted(() => ({ resposta: null as unknown, pedido: '' }))

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../lib/medalhas', async (original) => ({
  ...(await original<typeof import('../lib/medalhas')>()),
  carregarMedalhas: async (id: string) => {
    falso.pedido = id
    if (falso.resposta instanceof Error) throw falso.resposta
    return falso.resposta
  },
}))

const ALUNO = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'a1' } } as unknown as Session,
  perfil: { id: 'a1', nome: 'Vega Fictícia', email: 'vega@academico.ifpb.edu.br', papel: 'aluno' as const },
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.pedido = ''
  falso.resposta = [
    { codigo: 'primeira-aula', nome: 'Primeira Aula', descricao: 'Abriu a primeira aula liberada.', ganhaEm: '2026-11-20T13:00:00Z' },
    { codigo: 'maratonista', nome: 'Maratonista', descricao: 'Estudou em 5 dias seguidos.', ganhaEm: null },
  ]
})

describe('Medalhas', () => {
  it('mostra as ganhas com a data e as que faltam com como ganhar', async () => {
    abrir('/medalhas', ALUNO)
    expect(await screen.findByRole('heading', { name: 'Suas medalhas' })).toBeInTheDocument()
    expect(falso.pedido).toBe('a1')
    expect(screen.getByText('1 de 2 medalhas ganhas')).toBeInTheDocument()
    const ganha = screen.getByRole('heading', { name: 'Primeira Aula' }).closest('li') as HTMLElement
    expect(within(ganha).getByText('Ganha em 20/11/2026')).toBeInTheDocument()
    const falta = screen.getByRole('heading', { name: 'Maratonista' }).closest('li') as HTMLElement
    expect(falta).toHaveTextContent('Como ganhar: Estudou em 5 dias seguidos.')
    expect(within(falta).getByText('Ainda falta')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar à ponte' })).toHaveAttribute('href', '/ponte')
  })

  it('mostra a barra de progresso nas medalhas de contagem que faltam', async () => {
    falso.resposta = [
      { codigo: 'cobra-criada', nome: 'Cobra Criada', descricao: 'Resolveu 15 exercícios em Python.', ganhaEm: null, progresso: { atual: 10, meta: 15 } },
      { codigo: 'estilista', nome: 'Estilista Espacial', descricao: 'Montou o boneco.', ganhaEm: null },
    ]
    abrir('/medalhas', ALUNO)
    await screen.findByRole('heading', { name: 'Cobra Criada' })
    const cobra = screen.getByRole('heading', { name: 'Cobra Criada' }).closest('li') as HTMLElement
    expect(within(cobra).getByText('10 de 15')).toBeInTheDocument()
    expect(within(cobra).getByRole('progressbar', { name: 'Progresso em Cobra Criada' })).toHaveAttribute('value', '10')
    const estilista = screen.getByRole('heading', { name: 'Estilista Espacial' }).closest('li') as HTMLElement
    expect(within(estilista).getByText('Ainda falta')).toBeInTheDocument()
  })

  it('mostra o erro em português', async () => {
    falso.resposta = new Error('Failed to fetch')
    abrir('/medalhas', ALUNO)
    expect(await screen.findByText('Não foi possível abrir as medalhas')).toBeInTheDocument()
  })

  it('quem não entrou vai para o login', async () => {
    abrir('/medalhas')
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(falso.pedido).toBe('')
  })
})
