import { describe, expect, it } from 'vitest'
import { isAcademicEmail, normalizeEmail } from './email'

describe('isAcademicEmail', () => {
  it.each([
    'aluno.teste@academico.ifpb.edu.br',
    '20269999@academico.ifpb.edu.br',
    '  Tripulante.Ficticio@Academico.IFPB.edu.br  ',
    'nome_sobrenome+turma@academico.ifpb.edu.br',
  ])('aceita %s', (email) => {
    expect(isAcademicEmail(email)).toBe(true)
  })

  it.each([
    '',
    '@academico.ifpb.edu.br',
    'visitante@gmail.com',
    'professor@ifpb.edu.br',
    'aluno@academico.ifpb.edu.br.golpe.com',
    'aluno@academico-ifpb.edu.br',
    'aluno@xacademico.ifpb.edu.br',
    'a@b@academico.ifpb.edu.br',
    'aluno com espaco@academico.ifpb.edu.br',
    '.aluno@academico.ifpb.edu.br',
    'aluno.@academico.ifpb.edu.br',
    'aluno..teste@academico.ifpb.edu.br',
  ])('recusa %s', (email) => {
    expect(isAcademicEmail(email)).toBe(false)
  })
})

describe('normalizeEmail', () => {
  it('tira espaços e deixa minúsculo', () => {
    expect(normalizeEmail('  ALUNO@Academico.IFPB.edu.br ')).toBe('aluno@academico.ifpb.edu.br')
  })
})
