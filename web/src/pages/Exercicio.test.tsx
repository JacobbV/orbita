import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'

// Dados inventados. O Python e o editor de verdade são trocados por versões falsas.
const falso = vi.hoisted(() => ({
  saidas: new Map<string, string>(),
  codigosRodados: [] as string[],
  entradasDoTerminal: [] as string[],
  pedeNumero: false,
  comErro: false,
  entregues: [] as { exercicioId: number; codigo: string; certos: number }[],
  linguagem: 'python' as 'python' | 'javascript' | 'html',
  /** Entregas que o banco devolve para a tela (da mais nova para a mais antiga). */
  jaEntregues: [] as Record<string, unknown>[],
}))

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../lib/laboratorio', async (original) => ({
  ...(await original<typeof import('../lib/laboratorio')>()),
  minhasEntregas: async () => [
    ...falso.entregues
      .map((e, i) => ({
        id: i + 1,
        tentativa: i + 1,
        testesCertos: e.certos,
        testesTotal: 2,
        situacao: 'a_confirmar',
        criadoEm: '2026-11-22T13:00:00Z',
        nota: (10 * e.certos) / 2,
        notaProfessor: null,
        comentario: null,
        devolvidaEm: null,
      }))
      .reverse(),
    ...falso.jaEntregues,
  ],
  entregar: async (exercicioId: number, codigo: string, certos: number) => {
    falso.entregues.push({ exercicioId, codigo, certos })
    const tudo = certos === 2 && falso.entregues.filter((e) => e.certos === 2).length === 1
    return { tentativa: falso.entregues.length, conquista: tudo ? { xp: 20, ganhos: [], medalhas: [] } : { xp: 0 } }
  },
  carregarExercicio: async () => ({
    exercicio: {
      id: 7,
      titulo: 'Soma de dois números',
      enunciado: 'Leia dois números e mostre a soma.',
      linguagem: falso.linguagem,
      codigoInicial: 'a = int(input())\n',
      dificuldade: 1,
      aula: { id: 11, numero: 1, titulo: 'Entrada e saída', unidade: 1, sigla: 'ALG' },
    },
    testes: [
      { id: 1, tipo: 'visivel', entrada: '1\n2', saida_esperada: '3', saida_hash: 'h1', conferencia: 'valores', palavras: '' },
      // impressão digital de "10"
      { id: 2, tipo: 'oculto', entrada: '5\n5', saida_esperada: null, saida_hash: '4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5', conferencia: 'valores', palavras: '' },
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
    async rodar(codigo: string, entrada: string, mostrar = false) {
      falso.codigosRodados.push(codigo)
      falso.entradasDoTerminal.push(entrada)
      if (mostrar && falso.comErro) {
        return { saida: '', erro: "NameError: name 'y' is not defined", tempoEsgotado: false, saidaGrande: false, precisaDeEntrada: false }
      }
      if (mostrar && falso.pedeNumero) {
        // Programa que pergunta um número: espera a resposta e depois mostra o dobro.
        const [resposta] = entrada.split('\n')
        if (entrada === '') return { saida: 'Número: ', erro: null, tempoEsgotado: false, saidaGrande: false, precisaDeEntrada: true }
        return { saida: `Número: ${resposta}\nDobro: ${Number(resposta) * 2}\n`, erro: null, tempoEsgotado: false, saidaGrande: false, precisaDeEntrada: false }
      }
      return { saida: falso.saidas.get(entrada) ?? '', erro: null, tempoEsgotado: false, saidaGrande: false, precisaDeEntrada: false }
    }
    encerrar() {}
  },
}))

vi.mock('../lab/html', async (original) => ({
  ...(await original<typeof import('../lab/html')>()),
  ExecutorHtml: class {
    async carregar() {}
    async rodar(codigo: string, consulta: string) {
      falso.codigosRodados.push(codigo)
      return { saida: falso.saidas.get(consulta) ?? '', erro: null, tempoEsgotado: false, saidaGrande: false, precisaDeEntrada: false }
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
  falso.entradasDoTerminal = []
  falso.pedeNumero = false
  falso.comErro = false
  falso.jaEntregues = []
  falso.entregues = []
  falso.linguagem = 'python'
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

  it('Rodar confere o visível pela resposta e o oculto pela impressão digital', async () => {
    falso.saidas.set('1\n2', '3\n')
    falso.saidas.set('5\n5', '11\n')
    abrir('/exercicio/7', ALUNO)
    await userEvent.click(await screen.findByRole('button', { name: '▶ Rodar' }))
    expect(await screen.findByRole('heading', { name: '1 de 2 testes certos' })).toBeInTheDocument()
    const lista = screen.getAllByRole('listitem').filter((li) => li.textContent?.includes('Teste'))
    expect(lista[0]).toHaveTextContent('certo')
    expect(lista[1]).toHaveTextContent('Resposta escondida')
    expect(within(lista[1] as HTMLElement).queryByText('10')).toBeNull()
  })

  it('enunciado numa caixa própria, com o jeito de conferir', async () => {
    abrir('/exercicio/7', ALUNO)
    const caixa = await screen.findByRole('region', { name: 'Enunciado' })
    expect(caixa).toHaveTextContent('Leia dois números e mostre a soma.')
    expect(caixa).toHaveTextContent('Como o site confere:')
    expect(caixa).toHaveTextContent('O texto que você escreve em volta')
  })

  it('só os valores: o texto em volta do número não conta, e o erro mostra o que foi comparado', async () => {
    falso.saidas.set('1\n2', 'A soma é: 3\n')
    falso.saidas.set('5\n5', 'A soma é: 11\n')
    abrir('/exercicio/7', ALUNO)
    await userEvent.click(await screen.findByRole('button', { name: '▶ Rodar' }))
    expect(await screen.findByRole('heading', { name: '1 de 2 testes certos' })).toBeInTheDocument()
    const lista = screen.getAllByRole('listitem').filter((li) => li.textContent?.includes('Teste'))
    expect(lista[0]).toHaveTextContent('certo')
    expect(lista[1]).toHaveTextContent('O que o site comparou')
    expect(lista[1]).toHaveTextContent('No seu programa: 11')
  })

  it('acertando tudo, comemora; o código fica guardado como rascunho', async () => {
    falso.saidas.set('1\n2', '3')
    falso.saidas.set('5\n5', '10')
    abrir('/exercicio/7', ALUNO)
    const editor = await screen.findByLabelText('Editor de código Python')
    await userEvent.clear(editor)
    await userEvent.type(editor, 'print(3)')
    await userEvent.click(screen.getByRole('button', { name: '▶ Rodar' }))
    expect(await screen.findByRole('heading', { name: 'Todos os 2 testes certos!' })).toBeInTheDocument()
    expect(falso.codigosRodados.at(-1)).toBe('print(3)')
    expect(localStorage.getItem('orbita:rascunho:7')).toBe('print(3)')
  })

  it('Rodar mostra a saída do programa no terminal', async () => {
    falso.saidas.set('', 'Soma: 3')
    abrir('/exercicio/7', ALUNO)
    await userEvent.click(await screen.findByRole('button', { name: '▶ Rodar' }))
    const terminal = await screen.findByRole('region', { name: 'Terminal' })
    expect(await within(terminal).findByText('Soma: 3')).toBeInTheDocument()
  })

  it('o input() pede a resposta no próprio terminal e continua o programa', async () => {
    const u = userEvent.setup()
    falso.pedeNumero = true
    abrir('/exercicio/7', ALUNO)
    await u.click(await screen.findByRole('button', { name: '▶ Rodar' }))
    const terminal = await screen.findByRole('region', { name: 'Terminal' })
    const campo = await within(terminal).findByLabelText('Resposta para o input()')
    expect(terminal).toHaveTextContent('Número:')
    await u.type(campo, '21{Enter}')
    expect(await within(terminal).findByText(/Dobro: 42/)).toBeInTheDocument()
    expect(within(terminal).queryByLabelText('Resposta para o input()')).toBeNull()
    expect(falso.entradasDoTerminal.filter((e) => e !== '1\n2' && e !== '5\n5')).toEqual(['', '21\n'])
  })

  it('programa com erro mostra o erro no terminal e não roda os testes', async () => {
    falso.comErro = true
    abrir('/exercicio/7', ALUNO)
    await userEvent.click(await screen.findByRole('button', { name: '▶ Rodar' }))
    const terminal = await screen.findByRole('region', { name: 'Terminal' })
    expect(await within(terminal).findByText("NameError: name 'y' is not defined")).toBeInTheDocument()
    expect(screen.getByText('Corrija o erro e rode de novo para conferir os testes.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /testes certos/ })).toBeNull()
    expect(falso.entradasDoTerminal).toEqual([''])
  })

  it('resposta vazia também conta como uma resposta', async () => {
    const u = userEvent.setup()
    falso.pedeNumero = true
    abrir('/exercicio/7', ALUNO)
    await u.click(await screen.findByRole('button', { name: '▶ Rodar' }))
    const campo = await screen.findByLabelText('Resposta para o input()')
    await u.type(campo, '{Enter}')
    await screen.findByText(/Dobro/)
    expect(falso.entradasDoTerminal).toContain('\n')
  })

  it('Entregar pede confirmação, avisa que não dá para desfazer e então envia', async () => {
    const u = userEvent.setup()
    falso.saidas.set('1\n2', '3')
    falso.saidas.set('5\n5', '10')
    abrir('/exercicio/7', ALUNO)
    const editor = await screen.findByLabelText('Editor de código Python')
    await u.clear(editor)
    await u.type(editor, 'print(3)')
    await u.click(screen.getByRole('button', { name: '▶ Rodar' }))
    await screen.findByRole('heading', { name: 'Todos os 2 testes certos!' })
    await u.click(screen.getByRole('button', { name: 'Entregar' }))
    const pergunta = screen.getByRole('alertdialog')
    expect(pergunta).toHaveTextContent('Deseja realmente entregar?')
    expect(pergunta).toHaveTextContent('não dá para desfazer nem mudar')
    expect(falso.entregues).toEqual([])
    await u.click(screen.getByRole('button', { name: 'Sim, entregar' }))
    expect(
      await screen.findByText('Entrega 1 enviada: 2 de 2 testes certos. +20 XP, a confirmar pelo professor.'),
    ).toBeInTheDocument()
    expect(falso.entregues).toEqual([{ exercicioId: 7, codigo: 'print(3)', certos: 2 }])
    const entregas = screen.getByRole('region', { name: 'Suas entregas' })
    expect(entregas).toHaveTextContent('Entrega 1')
    expect(entregas).toHaveTextContent('2 de 2 testes certos')
    expect(entregas).toHaveTextContent('a confirmar pelo professor')
    // Entrega única: depois de entregar, o botão some.
    expect(screen.queryByRole('button', { name: 'Entregar' })).toBeNull()
    expect(screen.getByText(/Você já entregou este exercício/)).toBeInTheDocument()
  })

  it('Cancelar na confirmação não entrega nada', async () => {
    const u = userEvent.setup()
    abrir('/exercicio/7', ALUNO)
    await u.click(await screen.findByRole('button', { name: 'Entregar' }))
    await u.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(falso.entregues).toEqual([])
    expect(screen.getByRole('button', { name: 'Entregar' })).toBeEnabled()
  })

  it('mudou o código depois de rodar: ao entregar, confere de novo e entrega o código atual', async () => {
    const u = userEvent.setup()
    falso.saidas.set('1\n2', '3')
    falso.saidas.set('5\n5', '10')
    abrir('/exercicio/7', ALUNO)
    const editor = await screen.findByLabelText('Editor de código Python')
    await u.clear(editor)
    await u.type(editor, 'print(1)')
    await u.click(screen.getByRole('button', { name: '▶ Rodar' }))
    await screen.findByRole('heading', { name: 'Todos os 2 testes certos!' })
    await u.type(editor, '{backspace}{backspace}3)')
    await u.click(screen.getByRole('button', { name: 'Entregar' }))
    await u.click(screen.getByRole('button', { name: 'Sim, entregar' }))
    await screen.findByText(/Entrega 1 enviada/)
    expect(falso.entregues).toEqual([{ exercicioId: 7, codigo: 'print(3)', certos: 2 }])
  })

  it('entrega em aberto: não dá para entregar de novo', async () => {
    falso.jaEntregues = [
      { id: 9, tentativa: 1, testesCertos: 1, testesTotal: 2, situacao: 'a_confirmar', criadoEm: '2026-11-22T13:00:00Z', nota: 5, notaProfessor: 8, comentario: 'Quase lá.', devolvidaEm: null },
    ]
    abrir('/exercicio/7', ALUNO)
    expect(await screen.findByText(/Você já entregou este exercício/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entregar' })).toBeNull()
    const entregas = screen.getByRole('region', { name: 'Suas entregas' })
    expect(entregas).toHaveTextContent('Nota do professor: 8,0')
    expect(entregas).toHaveTextContent('Comentário do professor: Quase lá.')
  })

  it('entrega devolvida: mostra o comentário e deixa entregar de novo', async () => {
    falso.jaEntregues = [
      { id: 9, tentativa: 1, testesCertos: 1, testesTotal: 2, situacao: 'a_confirmar', criadoEm: '2026-11-22T13:00:00Z', nota: 5, notaProfessor: null, comentario: 'Leia a entrada com input().', devolvidaEm: '2026-11-23T13:00:00Z' },
    ]
    abrir('/exercicio/7', ALUNO)
    expect(await screen.findByText('O professor devolveu a sua entrega para você refazer')).toBeInTheDocument()
    expect(screen.getAllByText(/Leia a entrada com input\(\)\./).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Entregar' })).toBeEnabled()
  })

  it('o professor roda, mas não vê o botão Entregar', async () => {
    const u = userEvent.setup()
    abrir('/exercicio/7', { ...ALUNO, perfil: { ...ALUNO.perfil, papel: 'professor' as const } })
    await u.click(await screen.findByRole('button', { name: '▶ Rodar' }))
    await screen.findByRole('heading', { name: '0 de 2 testes certos' })
    expect(screen.queryByRole('button', { name: 'Entregar' })).toBeNull()
  })

  it('HTML e CSS: prévia ao vivo, sem terminal, e Rodar confere a página', async () => {
    const u = userEvent.setup()
    falso.linguagem = 'html'
    falso.saidas.set('1\n2', '3')
    falso.saidas.set('5\n5', '10')
    abrir('/exercicio/7', ALUNO)
    expect(await screen.findByText('HTML e CSS')).toBeInTheDocument()
    expect(screen.getByText('index.html')).toBeInTheDocument()
    expect(screen.getByText('O que é conferido')).toBeInTheDocument()
    expect(screen.getByTitle('Prévia da sua página')).toHaveAttribute('sandbox', '')
    expect(screen.queryByRole('region', { name: 'Terminal' })).toBeNull()
    await u.click(screen.getByRole('button', { name: '▶ Rodar' }))
    expect(await screen.findByRole('heading', { name: 'Todos os 2 testes certos!' })).toBeInTheDocument()
  })

  it('JavaScript: editor e terminal', async () => {
    falso.linguagem = 'javascript'
    abrir('/exercicio/7', ALUNO)
    expect(await screen.findByLabelText('Editor de código JavaScript')).toBeInTheDocument()
    expect(screen.getByText('main.js')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Terminal' })).toBeInTheDocument()
  })
})
