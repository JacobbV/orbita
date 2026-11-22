import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { abrir, prepararNavegadorFalso } from '../test/renderizar'

// Banco falso: as telas não falam com o Supabase de verdade nestes testes.
const signUp = vi.fn()
const signInWithPassword = vi.fn()
const resetPasswordForEmail = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({ auth: { signUp, signInWithPassword, resetPasswordForEmail } }),
}))

vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  listarOfertas: async () => [
    {
      id: 11,
      turma: { id: 1, nome: '1º INFO M', turno: 'manha', anoLetivo: 2026 },
      disciplina: { id: 1, sigla: 'ALG', nome: 'Algoritmos e Lógica de Programação' },
    },
    {
      id: 12,
      turma: { id: 2, nome: '1º INFO V', turno: 'tarde', anoLetivo: 2026 },
      disciplina: { id: 1, sigla: 'ALG', nome: 'Algoritmos e Lógica de Programação' },
    },
    {
      id: 31,
      turma: { id: 3, nome: '3º INFO M', turno: 'manha', anoLetivo: 2026 },
      disciplina: { id: 3, sigla: 'WEB', nome: 'Desenvolvimento de Aplicações Web' },
    },
  ],
}))

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  signUp.mockReset()
  signInWithPassword.mockReset()
  resetPasswordForEmail.mockReset()
})

describe('Cadastro', () => {
  it('mostra o aviso de que só funciona com e-mail acadêmico', async () => {
    abrir('/cadastro')
    expect(await screen.findByText('Só funciona com e-mail acadêmico')).toBeInTheDocument()
  })

  it('não envia e mostra os erros quando o formulário está incompleto', async () => {
    const usuario = userEvent.setup()
    abrir('/cadastro')
    await usuario.type(await screen.findByLabelText('E-mail acadêmico'), 'tripulante@gmail.com')
    await usuario.click(screen.getByRole('button', { name: 'Enviar pedido de acesso' }))
    expect(screen.getByText('Use o e-mail que termina em @academico.ifpb.edu.br.')).toBeInTheDocument()
    expect(screen.getByText(/A senha precisa ter pelo menos 8 caracteres/)).toBeInTheDocument()
    expect(screen.getByText(/Conte quem você é/)).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('mostra só as turmas da disciplina escolhida e envia o pedido junto com o cadastro', async () => {
    signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null })
    const usuario = userEvent.setup()
    abrir('/cadastro')

    await usuario.type(await screen.findByLabelText('Nome completo'), 'Tripulante Fictício')
    await usuario.type(screen.getByLabelText('E-mail acadêmico'), ' Tripulante@Academico.IFPB.edu.br ')
    const disciplina = screen.getByLabelText('Disciplina')
    await waitFor(() => expect(disciplina).toBeEnabled())
    await usuario.selectOptions(disciplina, '1')
    const turma = screen.getByLabelText('Turma')
    expect(turma.querySelectorAll('option')).toHaveLength(3) // "Escolha" + 2 turmas de Algoritmos
    await usuario.selectOptions(turma, '12')
    await usuario.type(screen.getByLabelText('Quem é você'), 'Tripulante Fictício, 1º INFO V, tarde')
    await usuario.type(screen.getByLabelText('Senha'), 'senha-forte-123')
    await usuario.click(screen.getByRole('button', { name: 'Enviar pedido de acesso' }))

    await screen.findByText('Confirme o seu e-mail')
    expect(signUp).toHaveBeenCalledWith({
      email: 'tripulante@academico.ifpb.edu.br',
      password: 'senha-forte-123',
      options: {
        emailRedirectTo: 'http://localhost/orbita/entrar',
        data: {
          nome: 'Tripulante Fictício',
          turma_disciplina_id: '12',
          quem_e_voce: 'Tripulante Fictício, 1º INFO V, tarde',
        },
      },
    })
  })

  it('mostra o erro do servidor em português', async () => {
    signUp.mockResolvedValue({ data: { session: null, user: null }, error: { message: 'Database error saving new user' } })
    const usuario = userEvent.setup()
    abrir('/cadastro')
    await usuario.type(await screen.findByLabelText('Nome completo'), 'Tripulante Fictício')
    await usuario.type(screen.getByLabelText('E-mail acadêmico'), 'tripulante@academico.ifpb.edu.br')
    await waitFor(() => expect(screen.getByLabelText('Disciplina')).toBeEnabled())
    await usuario.selectOptions(screen.getByLabelText('Disciplina'), '3')
    await usuario.selectOptions(screen.getByLabelText('Turma'), '31')
    await usuario.type(screen.getByLabelText('Quem é você'), 'Tripulante Fictício, 3º INFO M, manhã')
    await usuario.type(screen.getByLabelText('Senha'), 'senha-forte-123')
    await usuario.click(screen.getByRole('button', { name: 'Enviar pedido de acesso' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível criar a conta')
  })
})

describe('Entrar', () => {
  it('mostra "e-mail ou senha incorretos" quando o login falha', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } })
    const usuario = userEvent.setup()
    abrir('/entrar')
    await usuario.type(screen.getByLabelText('E-mail acadêmico'), 'tripulante@academico.ifpb.edu.br')
    await usuario.type(screen.getByLabelText('Senha'), 'senha-errada')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
  })

  it('não chama o servidor com e-mail fora do domínio', async () => {
    const usuario = userEvent.setup()
    abrir('/entrar')
    await usuario.type(screen.getByLabelText('E-mail acadêmico'), 'tripulante@gmail.com')
    await usuario.type(screen.getByLabelText('Senha'), 'qualquer-senha')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByText('Use o e-mail que termina em @academico.ifpb.edu.br.')).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })
})

describe('Recuperar senha', () => {
  it('pede o link com o endereço da página de nova senha', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    const usuario = userEvent.setup()
    abrir('/recuperar-senha')
    await usuario.type(screen.getByLabelText('E-mail acadêmico'), 'tripulante@academico.ifpb.edu.br')
    await usuario.click(screen.getByRole('button', { name: 'Enviar link' }))
    expect(await screen.findByText(/enviamos um link/)).toBeInTheDocument()
    expect(resetPasswordForEmail).toHaveBeenCalledWith('tripulante@academico.ifpb.edu.br', {
      redirectTo: 'http://localhost/orbita/nova-senha',
    })
  })

  it('a página de nova senha sem link válido explica o que fazer', () => {
    abrir('/nova-senha')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Este link não funciona mais')
  })
})
