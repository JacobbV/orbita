import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'
import type { DadosDaAula } from '../lib/aula'

const falso = vi.hoisted(() => ({
  resposta: null as unknown,
  aberturas: [] as number[],
  audios: [] as number[],
  audioCarregado: [] as string[],
}))

vi.mock('../lib/progresso', async (original) => ({
  ...(await original<typeof import('../lib/progresso')>()),
  registrarAberturaEmSilencio: (aulaId: number) => falso.aberturas.push(aulaId),
  registrarAudioOuvido: async (aulaId: number) => {
    falso.audios.push(aulaId)
    return { xp: 10, ganhos: [], medalhas: [], novaPatente: null }
  },
}))

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../lib/aula', async (original) => ({
  ...(await original<typeof import('../lib/aula')>()),
  carregarAula: async () => {
    if (falso.resposta instanceof Error) throw falso.resposta
    return falso.resposta
  },
  carregarAudio: async (caminho: string) => {
    falso.audioCarregado.push(caminho)
    return 'blob:audio-falso'
  },
}))

const ALUNO = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'a1' } } as unknown as Session,
  perfil: { id: 'a1', nome: 'Estrela Cadente', email: 'estrela@academico.ifpb.edu.br', papel: 'aluno' as const },
}
const PROFESSOR = { ...ALUNO, perfil: { ...ALUNO.perfil, nome: 'Professor Fictício', papel: 'professor' as const } }

const AULA: DadosDaAula = {
  id: 41,
  onde: 'ALG · Unidade IV · Aula 1',
  titulo: 'Listas',
  topicos: ['O que é uma lista', 'Percorrer com for'],
  exercicios: [{ id: 5, titulo: 'Soma da lista', dificuldade: 2, linguagem: 'python' }],
  slides: '<h1>Slide 1</h1>',
  slidesId: 7,
  apostila: '<h1>Apostila</h1>',
  audio: 'aulas/41/audio-1.mp3',
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.resposta = AULA
  falso.aberturas = []
  falso.audios = []
  falso.audioCarregado = []
})

describe('Página da aula', () => {
  it('mostra slides, "Nesta aula", exercícios, apostila e áudio', async () => {
    abrir('/aula/41', ALUNO)
    expect(await screen.findByTitle('Slides: Listas')).toHaveAttribute('srcdoc', '<h1>Slide 1</h1>')
    expect(screen.getByTitle('Apostila: Listas')).toHaveAttribute('srcdoc', '<h1>Apostila</h1>')
    expect(screen.getByRole('heading', { level: 1, name: 'Listas' })).toBeInTheDocument()
    expect(screen.getByText('ALG · Unidade IV · Aula 1')).toBeInTheDocument()
    expect(screen.getByText('O que é uma lista')).toBeInTheDocument()
    expect(screen.getByText('Percorrer com for')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Soma da lista/ })).toHaveAttribute('href', '/exercicio/5')
    expect(screen.getByText(/\+35 XP/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar/ })).toHaveAttribute('href', '/ponte')
    // Marca-d'água nos slides e na apostila.
    expect(screen.getAllByTestId('marca-dagua')).toHaveLength(2)
    expect(falso.aberturas).toEqual([41])
  })

  it('o áudio só baixa quando o aluno pede e dá XP ao terminar', async () => {
    abrir('/aula/41', ALUNO)
    await userEvent.click(await screen.findByRole('button', { name: 'Carregar o áudio' }))
    expect(falso.audioCarregado).toEqual(['aulas/41/audio-1.mp3'])
    const player = document.querySelector('audio') as HTMLAudioElement
    expect(player).toHaveAttribute('controlslist', 'nodownload')
    player.dispatchEvent(new Event('ended'))
    await vi.waitFor(() => expect(falso.audios).toEqual([41]))
  })

  it('professor vê sem marca-d\'água e sem ganhar XP; "ver como aluno" mostra a marca', async () => {
    abrir('/aula/41', PROFESSOR)
    await screen.findByTitle('Slides: Listas')
    expect(screen.queryByTestId('marca-dagua')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar/ })).toHaveAttribute('href', '/professor?aba=aulas')
    expect(screen.queryByText(/ganhe \+10 XP/)).not.toBeInTheDocument()
    expect(falso.aberturas).toEqual([])
  })

  it('aula sem material avisa o que falta', async () => {
    falso.resposta = { ...AULA, topicos: [], exercicios: [], slides: null, slidesId: null, apostila: null, audio: null }
    abrir('/aula/41', ALUNO)
    expect(await screen.findByText('Os slides desta aula ainda não foram enviados.')).toBeInTheDocument()
    expect(screen.getByText('A apostila desta aula ainda não foi enviada.')).toBeInTheDocument()
    expect(screen.getByText('O professor ainda não listou os tópicos.')).toBeInTheDocument()
    expect(screen.getByText('Esta aula não tem exercícios.')).toBeInTheDocument()
    expect(screen.queryByText('Áudio da aula')).not.toBeInTheDocument()
  })

  it('aula não liberada mostra o aviso e o caminho de volta', async () => {
    const { AulaIndisponivel } = await import('../lib/aula')
    falso.resposta = new AulaIndisponivel()
    abrir('/aula/42', ALUNO)
    expect(await screen.findByText(/não existe ou ainda não foi liberada/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/ponte')
  })
})
