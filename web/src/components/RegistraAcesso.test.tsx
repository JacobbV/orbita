import { render } from '@testing-library/react'
import { AuthContext } from '../auth/AuthContext'
import { SEM_LOGIN } from '../test/renderizar'
import { RegistraAcesso } from './RegistraAcesso'

const chamadas = vi.hoisted(() => ({ n: 0 }))
vi.mock('../lib/acessos', async (original) => ({
  ...(await original<typeof import('../lib/acessos')>()),
  registrarAcesso: async () => {
    chamadas.n += 1
  },
}))

const com = (papel: 'aluno' | 'professor') => ({
  ...SEM_LOGIN,
  perfil: { id: 'x', nome: 'Fictício', email: 'f@academico.ifpb.edu.br', papel, apelido: null },
})

describe('RegistraAcesso', () => {
  beforeEach(() => {
    chamadas.n = 0
  })

  it('avisa o banco quando é aluno', () => {
    render(
      <AuthContext.Provider value={com('aluno')}>
        <RegistraAcesso />
      </AuthContext.Provider>,
    )
    expect(chamadas.n).toBe(1)
  })

  it('não avisa quando é professor', () => {
    render(
      <AuthContext.Provider value={com('professor')}>
        <RegistraAcesso />
      </AuthContext.Provider>,
    )
    expect(chamadas.n).toBe(0)
  })
})
