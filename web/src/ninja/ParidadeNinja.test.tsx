import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router'
import { App } from '../App'
import { AuthContext, type EstadoAuth } from '../auth/AuthContext'
import type { DisciplinaDaPonte } from '../lib/ponte'
import type { ProvaDoAluno, QuestaoDaProva } from '../lib/provas'
import { prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'
import { ModoNinjaContext } from './ModoNinja'
import { estudoDoNinja, registrarAulaDoNinja } from './progressoNinja'

// O Modo Ninja tem tudo o que o aluno tem, sem gravar nada no banco. Dados inventados.
const falso = vi.hoisted(() => ({ apelidosGravados: [] as string[], respostas: 0, entregas: 0 }))

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

const OFERTA = {
  id: 11,
  turma: { id: 1, nome: '1º INFO M', turno: 'manha', anoLetivo: 2026 },
  disciplina: { id: 1, sigla: 'ALG', nome: 'Algoritmos e Lógica de Programação' },
}

function disciplinaAberta(): DisciplinaDaPonte {
  const aula = {
    id: 21,
    numero: 1,
    titulo: 'O que é um algoritmo?',
    liberada: true,
    liberadaEm: '',
    materiais: [{ id: 1, tipo: 'slide' as const, titulo: 'Slides', url: null }],
    exercicios: [{ id: 31, titulo: 'Olá, nave', dificuldade: 1 }],
  }
  const unidade = { id: 41, numero: 1, titulo: 'Primeiros passos', aulas: [aula], liberadas: 1 }
  return { oferta: OFERTA, unidades: [unidade], totalAulas: 1, totalLiberadas: 1, ultimaLiberada: { unidade, aula } }
}

vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  listarOfertas: async () => [OFERTA],
}))

vi.mock('../lib/ponte', async (original) => ({
  ...(await original<typeof import('../lib/ponte')>()),
  carregarPonteNinja: async () => [disciplinaAberta()],
}))

vi.mock('../lib/progresso', async (original) => ({
  ...(await original<typeof import('../lib/progresso')>()),
  maiorPatente: async () => 'Almirante Galáctico',
}))

vi.mock('../lib/medalhas', async (original) => ({
  ...(await original<typeof import('../lib/medalhas')>()),
  carregarMedalhas: async () => [
    { codigo: 'primeira-aula', nome: 'Primeira Aula', descricao: 'Abriu a primeira aula.', ganhaEm: null },
    { codigo: 'estilista', nome: 'Estilista Espacial', descricao: 'Montou o boneco.', ganhaEm: null },
  ],
}))

vi.mock('../lib/avatar', async (original) => {
  const real = await original<typeof import('../lib/avatar')>()
  return {
    ...real,
    carregarAvatar: async (_id: string, papel: 'aluno' | 'professor') => real.avatarPadrao(papel),
    carregarAvatarNinja: async () => (await import('../arte/avatar')).PADRAO_NINJA,
    carregarProfessorDaNave: async () => null,
  }
})

vi.mock('../lib/apelidos', async (original) => ({
  ...(await original<typeof import('../lib/apelidos')>()),
  sortearApelido: async () => 'Cometa Veloz',
  escolherApelido: async (a: string) => {
    falso.apelidosGravados.push(a)
  },
}))

const PROVA: ProvaDoAluno = {
  id: 5,
  titulo: 'Prova da unidade I',
  instrucoes: '',
  // Só abre amanhã: o treino do ninja vale a qualquer hora.
  abreEm: new Date(Date.now() + 86_400_000).toISOString(),
  fechaEm: new Date(Date.now() + 90_000_000).toISOString(),
  duracaoMin: 60,
  saidasParaEncerrar: null,
  questoes: 1,
  comecouEm: null,
  terminaEm: null,
  entregueEm: null,
  encerradaPor: null,
  saidas: 0,
  nota: null,
}

const QUESTAO: QuestaoDaProva = {
  questaoId: 51,
  titulo: 'Soma',
  enunciado: 'Leia dois números e mostre a soma.',
  linguagem: 'python',
  codigoInicial: '',
  peso: 1,
  testes: [],
  minhaResposta: null,
}

vi.mock('../lib/provas', async (original) => ({
  ...(await original<typeof import('../lib/provas')>()),
  provasDoNinja: async () => [PROVA],
  provaDoNinja: async () => PROVA,
  questoesDaProvaNinja: async () => [QUESTAO],
  minhasProvas: async () => {
    throw new Error('o ninja não usa as provas do aluno')
  },
  responderQuestao: async () => {
    falso.respostas += 1
  },
  entregarProva: async () => {
    falso.entregas += 1
  },
}))

const PROFESSOR: EstadoAuth = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'p1' } } as unknown as Session,
  perfil: { id: 'p1', nome: 'Professor Fictício', email: 'prof@academico.ifpb.edu.br', papel: 'professor', apelido: 'Lua Serena' },
}

function abrirNinja(rota: string) {
  return render(
    <AuthContext.Provider value={PROFESSOR}>
      <ModoNinjaContext.Provider value={{ ativo: true, entrar: () => {}, sair: () => {} }}>
        <MemoryRouter initialEntries={[rota]}>
          <App />
        </MemoryRouter>
      </ModoNinjaContext.Provider>
    </AuthContext.Provider>,
  )
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  localStorage.clear()
  falso.apelidosGravados = []
  falso.respostas = 0
  falso.entregas = 0
})

describe('Paridade do Modo Ninja', () => {
  it('ponte ninja tem resumo, patente, medalhas, provas e apelido como a do aluno', async () => {
    abrirNinja('/ninja')
    expect(await screen.findByRole('heading', { name: 'Ninja na nave' })).toBeInTheDocument()

    const resumo = await screen.findByRole('region', { name: 'Resumo dos estudos' })
    expect(within(resumo).getByText('Próxima missão')).toBeInTheDocument()
    expect(within(resumo).getByRole('link', { name: 'Começar aula' })).toHaveAttribute('href', '/aula/21')
    expect(within(resumo).getByRole('link', { name: /Olá, nave/ })).toHaveAttribute('href', '/exercicio/31')
    expect(within(resumo).getByText('dias seguidos estudando')).toBeInTheDocument()

    expect(screen.getByText('XP não conta')).toBeInTheDocument()
    expect(await screen.findByText('Almirante Galáctico')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Medalhas: 2 de 2' })).toBeInTheDocument()

    expect(await screen.findByText('Treino livre')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Treinar: Prova da unidade I' })).toHaveAttribute('href', '/prova/5')

    // Apelido do ninja: sorteado como o do aluno, guardado só neste navegador.
    const apelido = screen.getByRole('region', { name: 'Apelido do ninja' })
    await userEvent.click(within(apelido).getByRole('button', { name: 'Sortear apelido' }))
    await userEvent.click(await within(apelido).findByRole('button', { name: 'Usar este' }))
    expect(await screen.findByText('Cometa Veloz', { selector: '.ponte-apelido' })).toBeInTheDocument()
    expect(falso.apelidosGravados).toEqual([])
    expect(localStorage.getItem('orbita:ninja:p1')).toContain('Cometa Veloz')
  })

  it('a última aula aberta pelo ninja vira "Continuar aula"', async () => {
    registrarAulaDoNinja('p1', 21)
    abrirNinja('/ninja')
    const resumo = await screen.findByRole('region', { name: 'Resumo dos estudos' })
    expect(within(resumo).getByText('De onde você parou')).toBeInTheDocument()
    expect(within(resumo).getByRole('link', { name: 'Continuar aula' })).toBeInTheDocument()
    expect(within(resumo).getByText('dia seguido estudando')).toBeInTheDocument()
  })

  it('menu do ninja leva ao mapa da galáxia, com tudo aberto', async () => {
    abrirNinja('/mapa')
    expect(await screen.findByRole('heading', { name: 'Mapa da galáxia' })).toBeInTheDocument()
    expect(screen.getByText(/No Modo Ninja todas as aulas estão abertas/)).toBeInTheDocument()
    expect(screen.queryByText('bloqueada')).toBeNull()
    expect(screen.getByRole('link', { name: /Abrir a aula 1/ })).toHaveAttribute('href', '/aula/21')
    const menu = screen.getByRole('navigation', { name: /menu|sistema/i })
    expect(within(menu).getByRole('link', { name: 'Mapa' })).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: 'Medalhas' })).toBeInTheDocument()
  })

  it('prova de treino abre a qualquer hora e não grava nada', async () => {
    abrirNinja('/prova/5')
    expect(await screen.findByText('Prova de treino do Modo Ninja')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Começar o treino' }))
    expect(await screen.findByText('Treino em andamento')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Soma' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Entregar a prova' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sim, entregar' }))
    expect(await screen.findByText(/Nota do treino: 0/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar à ponte' })).toHaveAttribute('href', '/ninja')
    expect(falso.respostas).toBe(0)
    expect(falso.entregas).toBe(0)
  })
})

describe('progresso do ninja no navegador', () => {
  beforeEach(() => localStorage.clear())

  it('conta dias seguidos e guarda a última aula', () => {
    registrarAulaDoNinja('p9', 3, new Date('2026-11-26T15:00:00Z'))
    registrarAulaDoNinja('p9', 4, new Date('2026-11-27T15:00:00Z'))
    registrarAulaDoNinja('p9', 5, new Date('2026-11-27T16:00:00Z'))
    expect(estudoDoNinja('p9', new Date('2026-11-27T18:00:00Z'))).toEqual({ seguidos: 2, estudouHoje: true, ultimaAulaId: 5 })
    expect(estudoDoNinja('outra', new Date('2026-11-27T18:00:00Z'))).toEqual({ seguidos: 0, estudouHoje: false, ultimaAulaId: null })
  })

  it('aguenta dados estragados no armazenamento', () => {
    localStorage.setItem('orbita:ninja:p9', '{quebrado')
    expect(estudoDoNinja('p9').ultimaAulaId).toBeNull()
  })
})
