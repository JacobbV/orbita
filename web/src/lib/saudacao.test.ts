import { describe, expect, it } from 'vitest'
import { nomeDaSaudacao, saudacao } from './saudacao'

describe('saudacao', () => {
  it('usa o primeiro nome', () => {
    expect(saudacao('Ana Exemplo da Silva', 'tripulante')).toBe('Olá, Ana.')
  })

  it('mantém o nome depois de um título abreviado', () => {
    expect(nomeDaSaudacao('Prof. Fulano Exemplo', 'professor')).toBe('Prof. Fulano')
    expect(saudacao('Prof. Fulano Exemplo', 'professor')).toBe('Olá, Prof. Fulano.')
  })

  it('não repete o ponto final', () => {
    expect(saudacao('Prof.', 'professor')).toBe('Olá, Prof.')
  })

  it('usa o padrão quando não há nome', () => {
    expect(saudacao('   ', 'tripulante')).toBe('Olá, tripulante.')
    expect(saudacao(undefined, 'professor')).toBe('Olá, professor.')
  })
})
