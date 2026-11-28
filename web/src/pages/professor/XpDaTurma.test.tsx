import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../../test/renderizar'

// Dados inventados. Os falsos ficam fora do vi.fn (promessas rejeitadas).
const falso = vi.hoisted(() => ({
  turmaPedida: 0,
  dados: [] as { alunoId: string; nome: string; xp: number; patente: string }[],
  enviados: [] as { alunoId: string; quantidade: number; descricao: string }[],
  erroAoDar: null as Error | null,
}))

vi.mock('../../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  buscarOferta: async (id: number) => ({
    id,
    turma: { id: 1, nome: '1º INFO M', turno: 'manha', anoLetivo: 2026 },
    disciplina: { id: 1, sigla: 'ALG', nome: 'Algoritmos e Lógica de Programação' },
  }),
}))

vi.mock('../../lib/progresso', async (original) => ({
  ...(await original<typeof import('../../lib/progresso')>()),
  carregarXpDaTurma: async (id: number) => {
    falso.turmaPedida = id
    return falso.dados.map((a) => ({ ...a }))
  },
  darXp: async (alunoId: string, quantidade: number, descricao: string) => {
    if (falso.erroAoDar) throw falso.erroAoDar
    falso.enviados.push({ alunoId, quantidade, descricao })
    const aluno = falso.dados.find((a) => a.alunoId === alunoId)
    if (aluno) aluno.xp += quantidade
  },
}))

const PROFESSOR = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'p1' } } as unknown as Session,
  perfil: { id: 'p1', nome: 'Professor Fictício', email: 'prof@academico.ifpb.edu.br', papel: 'professor' as const },
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.turmaPedida = 0
  falso.dados = [
    { alunoId: 'a1', nome: 'Andrômeda Vega', xp: 175, patente: 'Piloto' },
    { alunoId: 'a2', nome: 'Sírius Altair', xp: 30, patente: 'Cadete' },
  ]
  falso.enviados = []
  falso.erroAoDar = null
})

describe('XP da turma', () => {
  it('lista os alunos com patente e XP, avisando que só o professor vê', async () => {
    abrir('/professor/xp/11', PROFESSOR)
    expect(await screen.findByRole('heading', { name: '1º INFO M · ALG' })).toBeInTheDocument()
    expect(falso.turmaPedida).toBe(11)
    expect(screen.getByText(/os alunos não veem o XP dos colegas/)).toBeInTheDocument()
    const linha = screen.getByText('Andrômeda Vega', { selector: '.xp-turma-nome' }).closest('li') as HTMLElement
    expect(within(linha).getByText('Piloto')).toBeInTheDocument()
    expect(linha).toHaveTextContent('175 XP')
  })

  it('ordena a lista por nome ou por XP', async () => {
    falso.dados = [
      { alunoId: 'a1', nome: 'Andrômeda Vega', xp: 10, patente: 'Cadete' },
      { alunoId: 'a2', nome: 'Sírius Altair', xp: 90, patente: 'Piloto' },
    ]
    abrir('/professor/xp/11', PROFESSOR)
    await screen.findByRole('heading', { name: '1º INFO M · ALG' })
    const nomes = () => screen.getAllByText(/Andrômeda Vega|Sírius Altair/, { selector: '.xp-turma-nome' }).map((e) => e.firstChild?.textContent)
    expect(nomes()).toEqual(['Andrômeda Vega', 'Sírius Altair'])
    await userEvent.click(screen.getByRole('button', { name: 'XP' }))
    expect(nomes()).toEqual(['Sírius Altair', 'Andrômeda Vega'])
  })

  it('dá XP por participação e atualiza a lista', async () => {
    abrir('/professor/xp/11', PROFESSOR)
    await userEvent.click(await screen.findByRole('button', { name: 'Dar XP para Sírius Altair' }))
    expect(screen.getByLabelText('Aluno')).toHaveValue('a2')
    await userEvent.click(screen.getByRole('button', { name: '+20' }))
    await userEvent.click(screen.getByRole('button', { name: 'Dar XP' }))
    expect(await screen.findByText('+20 XP para Sírius Altair.')).toBeInTheDocument()
    expect(falso.enviados).toEqual([{ alunoId: 'a2', quantidade: 20, descricao: 'Participação na aula' }])
    const linha = screen.getByText('Sírius Altair', { selector: '.xp-turma-nome' }).closest('li') as HTMLElement
    expect(linha).toHaveTextContent('50 XP')
  })

  it('confere o aluno, o valor e o motivo antes de enviar', async () => {
    abrir('/professor/xp/11', PROFESSOR)
    const enviar = await screen.findByRole('button', { name: 'Dar XP' })
    await userEvent.click(enviar)
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha o aluno.')
    await userEvent.selectOptions(screen.getByLabelText('Aluno'), 'a1')
    const valor = screen.getByLabelText('Outro valor de XP')
    await userEvent.clear(valor)
    await userEvent.type(valor, '150')
    await userEvent.click(enviar)
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha de 1 a 100 XP.')
    await userEvent.clear(valor)
    await userEvent.type(valor, '15')
    await userEvent.clear(screen.getByLabelText('Motivo'))
    await userEvent.click(enviar)
    expect(screen.getByRole('alert')).toHaveTextContent('Escreva o motivo do XP.')
    expect(falso.enviados).toEqual([])
  })

  it('mostra o erro do banco em português', async () => {
    falso.erroAoDar = new Error('Failed to fetch')
    abrir('/professor/xp/11', PROFESSOR)
    await userEvent.selectOptions(await screen.findByLabelText('Aluno'), 'a1')
    await userEvent.click(screen.getByRole('button', { name: 'Dar XP' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Sem conexão com o servidor/)
  })

  it('turma sem alunos aprovados avisa', async () => {
    falso.dados = []
    abrir('/professor/xp/11', PROFESSOR)
    expect(await screen.findByText('Nenhum aluno aprovado nesta turma ainda.')).toBeInTheDocument()
  })

  it('aluno não entra', async () => {
    abrir('/professor/xp/11', { ...PROFESSOR, perfil: { ...PROFESSOR.perfil, papel: 'aluno' as const } })
    expect(screen.queryByText('XP da turma')).toBeNull()
    expect(falso.turmaPedida).toBe(0)
  })
})
