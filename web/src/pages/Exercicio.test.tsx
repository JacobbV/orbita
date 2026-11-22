import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'

// Dados inventados. O Python e o editor de verdade são trocados por versões falsas.
const falso = vi.hoisted(() => ({ saidas: new Map<string, string>(), codigosRodados: [] as string[] }))

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../lib/laboratorio', async (original) => ({
  ...(await original<typeof import('../lib/laboratorio')>()),
  carregarExercicio: async () => ({
    exercicio: {
      id: 7,
      titulo: 'Soma de dois números',
      enunciado: 'Leia dois números e mostre a soma.',
      linguagem: 'python',
      codigoInicial: 'a = int(input())\n',
      dificuldade: 1,
      aula: { id: 11, numero: 1, titulo: 'Entrada e saída', unidade: 1, sigla: 'ALG' },
    },
    testes: [
      { id: 1, tipo: 'visivel', entrada: '1\n2', saida_esperada: '3', saida_hash: 'h1' },
      // impressão digital de "10"
      { id: 2, tipo: 'oculto', entrada: '5\n5', saida_esperada: null, saida_hash: '4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5' },
    ],
  }),
}))

vi.mock('../lab/EditorCodigo', () => ({
  EditorCodigo: ({ valor, aoMudar, rotulo }: { valor: string; aoMudar: (v: string) => void; rotulo: string }) => (
    <textarea aria-label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)} />
  ),
}))

vi.mock('../lab/executor', async (original) => ({
  ...(await original<typeof import('../lab/executor')>()),
  ExecutorPython: class {
    async carregar() {}
    async rodar(codigo: string, entrada: string) {
      falso.codigosRodados.push(codigo)
      return { saida: falso.saidas.get(entrada) ?? '', erro: null, tempoEsgotado: false, saidaGrande: false }
    }
    encerrar() {}
  },
}))

const ALUNO = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'a1' } } as unknown as Session,
  perfil: { id: 'a1', nome: 'Nova Fictícia', email: 'nova@academico.ifpb.edu.br', papel: 'aluno' as const },
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.saidas.clear()
  falso.codigosRodados = []
  localStorage.clear()
})

describe('Exercício do laboratório', () => {
  it('mostra o enunciado, o XP e só o exemplo visível', async () => {
    abrir('/exercicio/7', ALUNO)
    expect(await screen.findByRole('heading', { name: 'Soma de dois números' })).toBeInTheDocument()
    expect(screen.getByText('+20 XP ao acertar tudo')).toBeInTheDocument()
    expect(screen.getByText('Exemplo 1')).toBeInTheDocument()
    expect(screen.queryByText('Exemplo 2')).toBeNull()
    expect(screen.getByLabelText('Editor de código Python')).toHaveValue('a = int(input())\n')
  })

  it('Testar confere o visível pela resposta e o oculto pela impressão digital', async () => {
    falso.saidas.set('1\n2', '3\n')
    falso.saidas.set('5\n5', '11\n')
    abrir('/exercicio/7', ALUNO)
    await userEvent.click(await screen.findByRole('button', { name: '✓ Testar' }))
    expect(await screen.findByRole('heading', { name: '1 de 2 testes certos' })).toBeInTheDocument()
    const lista = screen.getAllByRole('listitem').filter((li) => li.textContent?.includes('Teste'))
    expect(lista[0]).toHaveTextContent('certo')
    expect(lista[1]).toHaveTextContent('Resposta escondida')
    expect(within(lista[1] as HTMLElement).queryByText('10')).toBeNull()
  })

  it('acertando tudo, comemora; o código fica guardado como rascunho', async () => {
    falso.saidas.set('1\n2', '3')
    falso.saidas.set('5\n5', '10')
    abrir('/exercicio/7', ALUNO)
    const editor = await screen.findByLabelText('Editor de código Python')
    await userEvent.clear(editor)
    await userEvent.type(editor, 'print(3)')
    await userEvent.click(screen.getByRole('button', { name: '✓ Testar' }))
    expect(await screen.findByRole('heading', { name: 'Todos os 2 testes certos!' })).toBeInTheDocument()
    expect(falso.codigosRodados.at(-1)).toBe('print(3)')
    expect(localStorage.getItem('orbita:rascunho:7')).toBe('print(3)')
  })

  it('Rodar mostra a saída do programa com a entrada digitada', async () => {
    falso.saidas.set('1\n2', 'Soma: 3')
    abrir('/exercicio/7', ALUNO)
    await userEvent.click(await screen.findByRole('button', { name: '▶ Rodar' }))
    expect(await screen.findByText('Soma: 3')).toBeInTheDocument()
  })
})
