import { describe, expect, it } from 'vitest'
import { mensagemDeErro } from './erros'

describe('mensagemDeErro', () => {
  it.each([
    ['Invalid login credentials', 'E-mail ou senha incorretos.'],
    ['Email not confirmed', 'Confirme o seu e-mail'],
    ['User already registered', 'Já existe uma conta'],
    ['Database error saving new user', 'Não foi possível criar a conta'],
    ['Failed to fetch', 'Sem conexão'],
    ['For security purposes, you can only request this after 30 seconds.', 'Muitas tentativas'],
  ])('traduz "%s"', (original, esperado) => {
    expect(mensagemDeErro({ message: original })).toContain(esperado)
  })

  it('mantém as mensagens das regras do banco', () => {
    const msg = 'Você já fez 3 pedidos para esta turma. Fale com o professor.'
    expect(mensagemDeErro({ message: msg, code: 'P0001' })).toBe(msg)
  })

  it('usa uma mensagem genérica quando não reconhece o erro', () => {
    expect(mensagemDeErro(new Error('xyz'))).toBe('Algo deu errado. Tente de novo em instantes.')
    expect(mensagemDeErro(undefined)).toBe('Algo deu errado. Tente de novo em instantes.')
  })
})
