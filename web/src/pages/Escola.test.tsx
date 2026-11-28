import { screen } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { PADRAO_ALUNO } from '../arte/avatar'
import type { DadosDaPonte } from '../lib/ponte'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'

// Banco falso e canvas falso (o jsdom não desenha). Dados inventados.
const carregarPonte = vi.fn<() => Promise<DadosDaPonte | Error>>()

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../lib/ponte', async (original) => ({
  ...(await original<typeof import('../lib/ponte')>()),
  carregarPonte: async () => {
    const r = await carregarPonte()
    if (r instanceof Error) throw r
    return r
  },
}))

vi.mock('../lib/avatar', async (original) => ({
  ...(await original<typeof import('../lib/avatar')>()),
  carregarAvatar: async () => PADRAO_ALUNO,
}))

const ALUNO = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'a1' } } as unknown as Session,
  perfil: { id: 'a1', nome: 'Tripulante Fictício', email: 'tripulante@academico.ifpb.edu.br', papel: 'aluno' as const },
}

beforeAll(() => {
  prepararNavegadorFalso()
  const ctx = new Proxy({}, { get: (_, nome) => (nome === 'measureText' ? () => ({ width: 10 }) : () => undefined), set: () => true })
  HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  globalThis.requestAnimationFrame = () => 0
})

describe('Escola virtual', () => {
  it('abre o térreo, com o mapa e o painel do corredor', async () => {
    carregarPonte.mockResolvedValue({ temOutrosPedidos: false, disciplinas: [] })
    abrir('/escola', ALUNO)
    expect(await screen.findByRole('heading', { name: 'Térreo' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Mapa da escola, térreo/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No corredor' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Andar para/ })).toHaveLength(4)
  })
})
