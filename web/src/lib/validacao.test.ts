import { describe, expect, it } from 'vitest'
import { temErros, validarCadastro, type DadosCadastro } from './validacao'

const valido: DadosCadastro = {
  nome: 'Tripulante Fictício',
  email: 'tripulante.ficticio@academico.ifpb.edu.br',
  disciplinaId: '1',
  ofertaId: '3',
  quemEVoce: 'Tripulante Fictício, 1º INFO M, manhã',
  senha: 'senhaforte',
}

describe('validarCadastro', () => {
  it('aceita um cadastro completo', () => {
    expect(temErros(validarCadastro(valido))).toBe(false)
  })

  it('recusa e-mail que não é acadêmico', () => {
    expect(validarCadastro({ ...valido, email: 'tripulante@gmail.com' }).email).toMatch(/@academico\.ifpb\.edu\.br/)
  })

  it('exige senha com 8 caracteres ou mais', () => {
    expect(validarCadastro({ ...valido, senha: '1234567' }).senha).toMatch(/8 caracteres/)
    expect(validarCadastro({ ...valido, senha: '12345678' }).senha).toBeUndefined()
  })

  it('exige "Quem é você" com nome, turma e turno', () => {
    expect(validarCadastro({ ...valido, quemEVoce: 'eu' }).quemEVoce).toMatch(/turno/)
  })

  it('exige disciplina e turma', () => {
    const erros = validarCadastro({ ...valido, disciplinaId: '', ofertaId: '' })
    expect(erros.disciplinaId).toBeDefined()
    expect(erros.ofertaId).toBeDefined()
  })

  it('exige nome', () => {
    expect(validarCadastro({ ...valido, nome: ' ' }).nome).toBeDefined()
  })
})
