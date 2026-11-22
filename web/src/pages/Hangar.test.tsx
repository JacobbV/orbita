import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'

// Dados inventados; o banco é trocado por versões falsas.
const falso = vi.hoisted(() => ({ salvos: [] as unknown[], xp: 120 }))

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../lib/avatar', async (original) => {
  const real = await original<typeof import('../lib/avatar')>()
  return {
    ...real,
    carregarAvatar: async (_id: string, papel: 'aluno' | 'professor') => real.avatarPadrao(papel),
    salvarAvatar: async (e: unknown) => {
      falso.salvos.push(e)
    },
  }
})

vi.mock('../lib/progresso', async (original) => ({
  ...(await original<typeof import('../lib/progresso')>()),
  carregarProgresso: async () => ({ xp: falso.xp, nivel: 2, patente: 'Piloto', xpDaPatente: 100, proxima: 'Navegador', xpDaProxima: 250 }),
}))

const ALUNO = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'a1' } } as unknown as Session,
  perfil: { id: 'a1', nome: 'Órbita Fictícia', email: 'orbita@academico.ifpb.edu.br', papel: 'aluno' as const },
}
const PROFESSOR = {
  ...ALUNO,
  perfil: { id: 'p1', nome: 'Professor Fictício', email: 'prof@academico.ifpb.edu.br', papel: 'professor' as const },
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.salvos = []
})

describe('Hangar', () => {
  it('peças acima do XP do aluno ficam trancadas', async () => {
    abrir('/hangar', ALUNO)
    await userEvent.click(await screen.findByRole('tab', { name: 'Cabelo' }))
    expect(screen.getByRole('button', { name: /Coque/ })).toBeEnabled()
    const arrepiado = screen.getByRole('button', { name: /Arrepiado/ })
    expect(arrepiado).toBeDisabled()
    expect(arrepiado).toHaveTextContent('250 XP')
  })

  it('aluno não vê as peças do professor', async () => {
    abrir('/hangar', ALUNO)
    await userEvent.click(await screen.findByRole('tab', { name: 'Roupa' }))
    expect(screen.getByRole('button', { name: /Uniforme da nave/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cardigã/ })).toBeNull()
  })

  it('escolher uma peça e salvar manda o boneco para o banco', async () => {
    abrir('/hangar', ALUNO)
    const salvar = await screen.findByRole('button', { name: 'Salvar boneco' })
    expect(salvar).toBeDisabled()
    await userEvent.click(screen.getByRole('tab', { name: 'Roupa' }))
    await userEvent.click(screen.getByRole('button', { name: /Moletom roxo/ }))
    expect(screen.getByRole('button', { name: /Moletom roxo/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(salvar)
    expect(await screen.findByText('Boneco salvo!')).toBeInTheDocument()
    expect(falso.salvos).toEqual([expect.objectContaining({ roupa: 'roupa-moletom' })])
  })

  it('professor monta o boneco com as peças de nerd, todas abertas', async () => {
    abrir('/hangar', PROFESSOR)
    expect(await screen.findByRole('heading', { name: 'Monte o seu boneco' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Acessório' }))
    expect(screen.getByRole('button', { name: /Notebook com adesivos/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Caneca de café/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: /Capacete espacial/ })).toBeNull()
  })
})
