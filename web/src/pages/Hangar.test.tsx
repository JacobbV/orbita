import { fireEvent, screen } from '@testing-library/react'
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
    await userEvent.click(screen.getByRole('tab', { name: 'Acessórios' }))
    await userEvent.click(screen.getByRole('button', { name: 'Corpo e mãos' }))
    expect(screen.getByRole('button', { name: /Notebook com adesivos/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Caneca de café/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: /Capacete espacial/ })).toBeNull()
  })

  it('corpo: base, altura e tipo, um embaixo do outro', async () => {
    abrir('/hangar', ALUNO)
    await screen.findByRole('tab', { name: 'Corpo' })
    expect(screen.getByRole('heading', { name: 'Base' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Altura' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Feminino/ }))
    await userEvent.click(screen.getByRole('button', { name: /Alto/ }))
    await userEvent.click(screen.getByRole('button', { name: /Gordinho/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar boneco' }))
    expect(await screen.findByText('Boneco salvo!')).toBeInTheDocument()
    expect(falso.salvos).toEqual([expect.objectContaining({ base: 'base-feminina', altura: 'altura-alta', corpo: 'corpo-gordinho' })])
  })

  it('pele e cor do cabelo são bolinhas; cor trancada mostra o XP', async () => {
    abrir('/hangar', ALUNO)
    await userEvent.click(await screen.findByRole('tab', { name: 'Pele' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tom 7' }))
    expect(screen.getByRole('button', { name: 'Tom 7' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('tab', { name: 'Cabelo' }))
    expect(screen.getByRole('button', { name: 'Galáxia (abre com 250 XP)' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Rosa' }))
    expect(screen.getByRole('button', { name: 'Rosa' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('escolher minha cor guarda a cor livre do cabelo', async () => {
    abrir('/hangar', ALUNO)
    await userEvent.click(await screen.findByRole('tab', { name: 'Cabelo' }))
    const seletor = screen.getByLabelText('Escolher minha cor')
    fireEvent.input(seletor, { target: { value: '#22AA88' } })
    await userEvent.click(screen.getByRole('button', { name: 'Salvar boneco' }))
    expect(await screen.findByText('Boneco salvo!')).toBeInTheDocument()
    expect(falso.salvos).toEqual([expect.objectContaining({ 'cor-do-cabelo': 'cabelo-cor-livre', 'cor-livre': '#22aa88' })])
  })

  it('roupa e acessórios abrem em grupos; acessório pode ficar em "Nenhum"', async () => {
    abrir('/hangar', ALUNO)
    await userEvent.click(await screen.findByRole('tab', { name: 'Roupa' }))
    await userEvent.click(screen.getByRole('button', { name: 'Parte de baixo' }))
    await userEvent.click(screen.getByRole('button', { name: /Calça jeans preta/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pés' }))
    await userEvent.click(screen.getByRole('button', { name: /Tênis preto/ }))
    await userEvent.click(screen.getByRole('tab', { name: 'Acessórios' }))
    await userEvent.click(screen.getByRole('button', { name: 'Rosto' }))
    await userEvent.click(screen.getByRole('button', { name: /Óculos escuros/ }))
    await userEvent.click(screen.getByRole('button', { name: /Óculos escuros/ }))
    await userEvent.click(screen.getByRole('button', { name: /Nenhum/ }))
    await userEvent.click(screen.getByRole('button', { name: /Óculos quadrados/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar boneco' }))
    expect(await screen.findByText('Boneco salvo!')).toBeInTheDocument()
    expect(falso.salvos).toEqual([
      expect.objectContaining({ 'parte-de-baixo': 'baixo-jeans-preta', pes: 'pes-tenis-preto', 'acessorio-rosto': 'acessorio-oculos-quadrados' }),
    ])
  })
})

describe('limparEscolhas', () => {
  it('leva o acessório antigo para o grupo novo e descarta cor inválida', async () => {
    const { limparEscolhas } = await vi.importActual<typeof import('../lib/avatar')>('../lib/avatar')
    expect(limparEscolhas({ acessorio: 'acessorio-bone', roupa: 'roupa-uniforme', 'cor-livre': 'red' })).toEqual({
      'acessorio-cabeca': 'acessorio-bone',
      roupa: 'roupa-uniforme',
    })
    expect(limparEscolhas({ 'cor-livre': '#22aa88', cabelo: 'roupa-uniforme' })).toEqual({ 'cor-livre': '#22aa88' })
  })
})
