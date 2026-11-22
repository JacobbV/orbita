import { screen } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'

// A resposta falsa fica fora do vi.fn: promessa rejeitada criada pelo vi.fn vira erro solto no Vitest.
const falso = vi.hoisted(() => ({ chamadas: vi.fn(), resposta: null as unknown, aberturas: [] as number[] }))

vi.mock('../lib/progresso', async (original) => ({
  ...(await original<typeof import('../lib/progresso')>()),
  registrarAberturaEmSilencio: (aulaId: number) => falso.aberturas.push(aulaId),
}))

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../lib/slides', async (original) => ({
  ...(await original<typeof import('../lib/slides')>()),
  carregarSlides: async (id: number) => {
    falso.chamadas(id)
    if (falso.resposta instanceof Error) throw falso.resposta
    return falso.resposta
  },
}))

const ALUNO = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'a1' } } as unknown as Session,
  perfil: { id: 'a1', nome: 'Estrela Cadente', email: 'estrela@academico.ifpb.edu.br', papel: 'aluno' as const },
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.chamadas.mockReset()
  falso.resposta = null
  falso.aberturas = []
})

describe('Slides da aula', () => {
  it('mostra os slides numa moldura isolada, com tela cheia e caminho de volta', async () => {
    falso.resposta = {
      id: 7,
      aulaId: 41,
      onde: 'ALG · Unidade IV · Aula 1',
      titulo: 'Listas',
      html: '<h1>Slide 1</h1><script>window.parent.document.title = "x"</script>',
    }
    abrir('/slides/7', ALUNO)
    const moldura = await screen.findByTitle('Slides: Listas')
    expect(falso.chamadas).toHaveBeenCalledWith(7)
    expect(moldura).toHaveAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox')
    expect(moldura.getAttribute('sandbox')).not.toContain('allow-same-origin')
    expect(moldura.getAttribute('srcdoc')).toContain('<h1>Slide 1</h1>')
    expect(screen.getByRole('heading', { level: 1, name: 'Listas' })).toBeInTheDocument()
    expect(screen.getByText('ALG · Unidade IV · Aula 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tela cheia' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar/ })).toHaveAttribute('href', '/ponte')
    expect(screen.getByTestId('marca-dagua')).toHaveTextContent('Estrela Cadente · estrela@academico.ifpb.edu.br')
    expect(falso.aberturas).toEqual([41])
  })

  it('professor apresenta sem marca-d\'água', async () => {
    falso.resposta = { id: 7, aulaId: 41, onde: 'ALG · Unidade IV · Aula 1', titulo: 'Listas', html: '<h1>Slide 1</h1>' }
    abrir('/slides/7', { ...ALUNO, perfil: { ...ALUNO.perfil, nome: 'Professor Fictício', papel: 'professor' as const } })
    await screen.findByTitle('Slides: Listas')
    expect(screen.queryByTestId('marca-dagua')).not.toBeInTheDocument()
    expect(falso.aberturas).toEqual([])
  })

  it('explica quando os slides não estão liberados', async () => {
    const { SlidesIndisponiveis } = await import('../lib/slides')
    falso.resposta = new SlidesIndisponiveis()
    abrir('/slides/8', ALUNO)
    expect(await screen.findByText(/ainda não foram liberados para a sua turma/)).toBeInTheDocument()
  })

  it('quem não entrou vai para o login', async () => {
    abrir('/slides/7')
    expect(await screen.findByRole('heading', { name: /Entrar/ })).toBeInTheDocument()
    expect(falso.chamadas).not.toHaveBeenCalled()
  })
})
