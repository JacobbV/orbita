import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'

// Dados inventados; o banco é trocado por versões falsas.
const falso = vi.hoisted(() => ({ salvos: [] as unknown[], xp: 120, moedas: 20, compras: [] as string[], trocas: [] as number[] }))

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

// Catálogo igual ao do banco: as peças "todos" que abriam por XP viram peças da loja.
vi.mock('../lib/loja', async (original) => {
  const real = await original<typeof import('../lib/loja')>()
  const { PECAS } = await import('../arte/avatar')
  const preco: Record<number, number> = { 100: 15, 250: 40, 500: 80 }
  return {
    ...real,
    carregarLoja: async () => ({
      moedas: falso.moedas,
      xp: falso.xp,
      patente: 'Piloto',
      xpDaPatente: 100,
      pecas: real.lerCatalogo(
        PECAS.map((p) =>
          p.para === 'todos' && p.xpMinimo > 0
            ? { id: p.id, preco: preco[p.xpMinimo] ?? 80, na_loja: true, xp_minimo: 0 }
            : { id: p.id, preco: null, na_loja: false, xp_minimo: p.xpMinimo },
        ),
      ),
      compradas: new Set<string>(),
    }),
    carregarMeusMovimentos: async () => [{ quantidade: 5, descricao: 'Boas-vindas à nave', criadoEm: '2026-11-28T12:00:00Z' }],
    comprarPeca: async (id: string) => {
      falso.compras.push(id)
      return falso.moedas - 15
    },
    trocarXpPorMoedas: async (n: number) => {
      falso.trocas.push(n)
      return { moedas: falso.moedas + n, xp: falso.xp - n * 50, patente: 'Cadete' }
    },
  }
})

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
  falso.compras = []
  falso.trocas = []
})

describe('Hangar', () => {
  it('peças do uniforme acima do XP ficam trancadas; as da loja mostram o preço', async () => {
    abrir('/hangar', ALUNO)
    await userEvent.click(await screen.findByRole('tab', { name: 'Roupa' }))
    const jaqueta = screen.getByRole('button', { name: /Jaqueta de piloto/ })
    expect(jaqueta).toBeDisabled()
    expect(jaqueta).toHaveTextContent('250 XP')
    expect(screen.getByRole('button', { name: /Camiseta estrela/ })).toBeEnabled()
    await userEvent.click(screen.getByRole('tab', { name: 'Cabelo' }))
    const arrepiado = screen.getByRole('button', { name: /Arrepiado/ })
    expect(arrepiado).toBeEnabled()
    expect(arrepiado).toHaveTextContent('40')
  })

  it('experimentar peça da loja não deixa salvar antes de comprar', async () => {
    abrir('/hangar', ALUNO)
    await userEvent.click(await screen.findByRole('tab', { name: 'Cabelo' }))
    await userEvent.click(screen.getByRole('button', { name: /Arrepiado/ }))
    expect(screen.getByRole('button', { name: 'Salvar boneco' })).toBeDisabled()
    expect(screen.getByText('Peça da loja: compre antes de salvar o boneco.')).toBeInTheDocument()
    expect(screen.getByText('Faltam 20 moedas. Continue estudando!')).toBeInTheDocument()
  })

  it('na Loja, o aluno experimenta, confirma e compra', async () => {
    abrir('/hangar?aba=loja', ALUNO)
    expect(await screen.findByRole('heading', { name: 'Loja da nave' })).toBeInTheDocument()
    expect(await screen.findByText('Boas-vindas à nave')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Jaqueta de piloto/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /^Coque/ }))
    expect(screen.getByRole('button', { name: /^Coque/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Comprar por 15 moedas' }))
    expect(screen.getByText('Comprar Coque por 15 moedas? Sobram 5.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sim, comprar' }))
    expect(await screen.findByText(/Coque agora é sua!/)).toBeInTheDocument()
    expect(falso.compras).toEqual(['cabelo-coque'])
    await userEvent.click(screen.getByRole('button', { name: 'Salvar boneco' }))
    expect(await screen.findByText('Boneco salvo!')).toBeInTheDocument()
    expect(falso.salvos).toEqual([expect.objectContaining({ cabelo: 'cabelo-coque' })])
  })

  it('peça cara mostra quanto falta', async () => {
    abrir('/hangar?aba=loja', ALUNO)
    await userEvent.click(await screen.findByRole('button', { name: /^Chapéu viking/ }))
    expect(screen.getByText('Faltam 60 moedas. Continue estudando!')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Comprar por/ })).toBeNull()
  })

  it('troca de XP avisa que a patente desce e pede confirmação', async () => {
    abrir('/hangar?aba=loja', ALUNO)
    await userEvent.click(await screen.findByRole('button', { name: 'Trocar 50 XP' }))
    expect(screen.getByText('Trocar 50 XP por 1 moeda? Você fica com 70 XP e volta de patente.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sim, trocar' }))
    expect(await screen.findByText('Pronto: +1 moeda. Agora você tem 70 XP.')).toBeInTheDocument()
    expect(falso.trocas).toEqual([1])
  })

  it('professor não tem loja', async () => {
    abrir('/hangar', PROFESSOR)
    await screen.findByRole('heading', { name: 'Monte o seu boneco' })
    expect(screen.queryByRole('tab', { name: 'Loja' })).toBeNull()
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
    expect(screen.getByRole('button', { name: 'Galáxia (na loja por 40 moedas)' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Castanho' }))
    expect(screen.getByRole('button', { name: 'Castanho' })).toHaveAttribute('aria-pressed', 'true')
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
