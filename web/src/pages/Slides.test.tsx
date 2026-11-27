import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'

// A resposta falsa fica fora do vi.fn: promessa rejeitada criada pelo vi.fn vira erro solto no Vitest.
const falso = vi.hoisted(() => ({
  chamadas: vi.fn(),
  resposta: null as unknown,
  aberturas: [] as number[],
  anotacoes: { marcador: null, rabiscos: {} } as { marcador: number | null; rabiscos: Record<string, unknown> },
  guardadas: [] as unknown[],
}))

vi.mock('../lib/anotacoes', () => ({
  carregarAnotacoes: async () => falso.anotacoes,
  guardarAnotacoes: async (usuarioId: string, materialId: number, parte: unknown) => {
    falso.guardadas.push({ usuarioId, materialId, parte })
  },
}))

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
  falso.anotacoes = { marcador: null, rabiscos: {} }
  falso.guardadas = []
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

  it('no "Ver como aluno", o professor vê a marca-d\'água de exemplo', async () => {
    falso.resposta = { id: 7, aulaId: 41, onde: 'ALG · Unidade IV · Aula 1', titulo: 'Listas', html: '<h1>Slide 1</h1>' }
    abrir('/slides/7?comoAluno=1', { ...ALUNO, perfil: { ...ALUNO.perfil, nome: 'Professor Fictício', papel: 'professor' as const } })
    await screen.findByTitle('Slides: Listas')
    expect(screen.getByTestId('marca-dagua')).toHaveTextContent('Nome do aluno · aluno@academico.ifpb.edu.br')
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

const SLIDES = { id: 7, aulaId: 41, onde: 'ALG · Unidade IV · Aula 1', titulo: 'Listas', html: '<h1>Slide 1</h1>' }

/** O slide avisa, de dentro da moldura isolada, qual slide está aberto. */
function slideAberto(moldura: HTMLElement, n: number) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', { data: { orbita: 'slide', n }, source: (moldura as HTMLIFrameElement).contentWindow }),
    )
  })
}

describe('Slides: marcador de página', () => {
  it('marca onde parou e guarda na hora; a pontinha aparece no slide marcado', async () => {
    const u = userEvent.setup()
    falso.resposta = SLIDES
    abrir('/slides/7', ALUNO)
    const moldura = await screen.findByTitle('Slides: Listas')
    const botao = await screen.findByRole('button', { name: 'Marcar onde parei' })
    expect(botao).toBeDisabled()
    slideAberto(moldura, 5)
    expect(botao).toBeEnabled()
    await u.click(botao)
    expect(await screen.findByRole('button', { name: 'Parei aqui' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('fita-do-marcador')).toBeInTheDocument()
    expect(falso.guardadas).toEqual([{ usuarioId: 'a1', materialId: 7, parte: { marcador: 5 } }])
    // Em outro slide, a pontinha some e dá para voltar ao marcador.
    slideAberto(moldura, 6)
    expect(screen.queryByTestId('fita-do-marcador')).toBeNull()
    expect(screen.getByRole('button', { name: 'Ir ao marcador (slide 5)' })).toBeInTheDocument()
    // Tocar de novo no slide marcado tira o marcador.
    slideAberto(moldura, 5)
    await u.click(screen.getByRole('button', { name: 'Parei aqui' }))
    expect(falso.guardadas.at(-1)).toEqual({ usuarioId: 'a1', materialId: 7, parte: { marcador: null } })
  })

  it('ao abrir, oferece continuar de onde parou e manda o slide ir até lá', async () => {
    const u = userEvent.setup()
    falso.anotacoes = { marcador: 12, rabiscos: {} }
    falso.resposta = SLIDES
    abrir('/slides/7', ALUNO)
    const moldura = (await screen.findByTitle('Slides: Listas')) as HTMLIFrameElement
    const enviadas: unknown[] = []
    vi.spyOn(moldura.contentWindow!, 'postMessage').mockImplementation(((m: unknown) => void enviadas.push(m)) as typeof window.postMessage)
    slideAberto(moldura, 1)
    expect(await screen.findByText('Você parou no slide 12.')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Continuar do slide 12' }))
    expect(enviadas).toEqual([{ orbita: 'ir', n: 12 }])
    expect(screen.queryByText('Você parou no slide 12.')).toBeNull()
  })

  it('"Ficar aqui" dispensa a oferta, e ela não volta ao mudar de slide', async () => {
    const u = userEvent.setup()
    falso.anotacoes = { marcador: 12, rabiscos: {} }
    falso.resposta = SLIDES
    abrir('/slides/7', ALUNO)
    const moldura = await screen.findByTitle('Slides: Listas')
    slideAberto(moldura, 1)
    await u.click(await screen.findByRole('button', { name: 'Ficar aqui' }))
    slideAberto(moldura, 2)
    expect(screen.queryByText('Você parou no slide 12.')).toBeNull()
  })

  it('não oferece nada quando já abriu no slide marcado', async () => {
    falso.anotacoes = { marcador: 1, rabiscos: {} }
    falso.resposta = SLIDES
    abrir('/slides/7', ALUNO)
    const moldura = await screen.findByTitle('Slides: Listas')
    slideAberto(moldura, 1)
    expect(await screen.findByTestId('fita-do-marcador')).toBeInTheDocument()
    expect(screen.queryByText(/Você parou no slide/)).toBeNull()
  })

  it('ignora aviso de slide que não veio da moldura dos slides', async () => {
    falso.resposta = SLIDES
    abrir('/slides/7', ALUNO)
    await screen.findByTitle('Slides: Listas')
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { orbita: 'slide', n: 9 }, source: window }))
    })
    expect(screen.getByRole('button', { name: 'Marcar onde parei' })).toBeDisabled()
  })

  it('o professor também tem marcador e rabiscos', async () => {
    falso.resposta = SLIDES
    abrir('/slides/7', { ...ALUNO, perfil: { ...ALUNO.perfil, nome: 'Professor Fictício', papel: 'professor' as const } })
    expect(await screen.findByRole('button', { name: 'Marcar onde parei' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lápis' })).toBeInTheDocument()
  })
})

describe('Slides: lápis, marca-texto, borracha e limpar', () => {
  const traco = { c: '#e11d48', w: 8, t: 'l', p: [100, 100, 400, 300] }

  it('mostra as ferramentas, as cores e os tamanhos só quando o lápis está ligado', async () => {
    const u = userEvent.setup()
    falso.resposta = SLIDES
    abrir('/slides/7', ALUNO)
    await screen.findByTitle('Slides: Listas')
    expect(screen.queryByRole('group', { name: 'Cor' })).toBeNull()
    await u.click(await screen.findByRole('button', { name: 'Lápis' }))
    expect(screen.getByRole('button', { name: 'Lápis' })).toHaveAttribute('aria-pressed', 'true')
    expect(contarBotoes(screen.getByRole('group', { name: 'Cor' }))).toBe(5)
    expect(screen.getByRole('group', { name: 'Tamanho' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Mudar de slide' })).toBeInTheDocument()
    expect(screen.getByTestId('camada-de-rabiscos')).toHaveClass('rabiscos-camada-ativa')
    await u.click(screen.getByRole('button', { name: 'Lápis' }))
    expect(screen.getByTestId('camada-de-rabiscos')).not.toHaveClass('rabiscos-camada-ativa')
  })

  it('com o lápis ligado, os botões de slide mandam o slide mudar', async () => {
    const u = userEvent.setup()
    falso.resposta = SLIDES
    abrir('/slides/7', ALUNO)
    const moldura = (await screen.findByTitle('Slides: Listas')) as HTMLIFrameElement
    const enviadas: unknown[] = []
    vi.spyOn(moldura.contentWindow!, 'postMessage').mockImplementation(((m: unknown) => void enviadas.push(m)) as typeof window.postMessage)
    await u.click(await screen.findByRole('button', { name: 'Marca-texto' }))
    await u.click(screen.getByRole('button', { name: 'Próximo slide' }))
    await u.click(screen.getByRole('button', { name: 'Slide anterior' }))
    expect(enviadas).toEqual([
      { orbita: 'mover', d: 1 },
      { orbita: 'mover', d: -1 },
    ])
  })

  it('limpar tela pede confirmação e guarda sozinho, sem botão de salvar', async () => {
    const u = userEvent.setup()
    falso.anotacoes = { marcador: null, rabiscos: { '3': [traco], '4': [traco] } }
    falso.resposta = SLIDES
    abrir('/slides/7', ALUNO)
    const moldura = await screen.findByTitle('Slides: Listas')
    slideAberto(moldura, 3)
    const limpar = await screen.findByRole('button', { name: 'Limpar tela' })
    await waitFor(() => expect(limpar).toBeEnabled())
    await u.click(limpar)
    await u.click(screen.getByRole('button', { name: 'Não' }))
    expect(falso.guardadas).toEqual([])
    await u.click(screen.getByRole('button', { name: 'Limpar tela' }))
    await u.click(screen.getByRole('button', { name: 'Sim, limpar o slide' }))
    expect(screen.queryByRole('button', { name: /^Salvar/ })).toBeNull()
    await waitFor(() => expect(falso.guardadas).toHaveLength(1), { timeout: 4000 })
    // Só o slide 3 foi limpo; o 4 continua.
    expect(falso.guardadas[0]).toEqual({ usuarioId: 'a1', materialId: 7, parte: { rabiscos: { '4': [traco] } } })
    expect(await screen.findByText(/Rabiscos guardados/)).toBeInTheDocument()
  })

  it('desfazer tira o último traço do slide aberto', async () => {
    const u = userEvent.setup()
    const outro = { ...traco, c: '#2563eb' }
    falso.anotacoes = { marcador: null, rabiscos: { '2': [traco, outro] } }
    falso.resposta = SLIDES
    abrir('/slides/7', ALUNO)
    const moldura = await screen.findByTitle('Slides: Listas')
    slideAberto(moldura, 2)
    const desfazer = await screen.findByRole('button', { name: 'Desfazer' })
    await waitFor(() => expect(desfazer).toBeEnabled())
    await u.click(desfazer)
    await waitFor(() => expect(falso.guardadas).toHaveLength(1), { timeout: 4000 })
    expect(falso.guardadas[0]).toEqual({ usuarioId: 'a1', materialId: 7, parte: { rabiscos: { '2': [traco] } } })
  })
})

function contarBotoes(grupo: HTMLElement) {
  return grupo.querySelectorAll('button').length
}
