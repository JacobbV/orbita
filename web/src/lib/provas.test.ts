import { describe, expect, it } from 'vitest'
import { doCampoDeData, duracaoEmTexto, momentoDaProva, nomeDasSaidas, paraCampoDeData, validarProva, type DadosDaProva } from './provas'

const base: DadosDaProva = {
  ofertaId: 3,
  titulo: 'Prova de laços',
  instrucoes: '',
  abreEm: '2026-12-01T08:00',
  fechaEm: '2026-12-01T10:00',
  duracaoMin: '60',
  saidasParaEncerrar: null,
  questoes: [{ exercicioId: 1, peso: '1' }],
}

describe('datas da prova', () => {
  it('ida e volta do campo datetime-local na hora do aparelho', () => {
    const iso = doCampoDeData('2026-12-01T08:30')
    expect(iso).not.toBeNull()
    expect(paraCampoDeData(iso!)).toBe('2026-12-01T08:30')
  })

  it('recusa valor fora do formato', () => {
    expect(doCampoDeData('')).toBeNull()
    expect(doCampoDeData('01/12/2026 08:30')).toBeNull()
  })

  it('momento: antes, aberta, fechada', () => {
    const p = { abreEm: '2026-12-01T08:00:00Z', fechaEm: '2026-12-01T10:00:00Z' }
    expect(momentoDaProva(p, Date.parse('2026-12-01T07:59:59Z'))).toBe('antes')
    expect(momentoDaProva(p, Date.parse('2026-12-01T08:00:00Z'))).toBe('aberta')
    expect(momentoDaProva(p, Date.parse('2026-12-01T10:00:00Z'))).toBe('fechada')
  })
})

describe('textos', () => {
  it('duração e saídas', () => {
    expect(duracaoEmTexto(45)).toBe('45 min')
    expect(duracaoEmTexto(60)).toBe('1 h')
    expect(duracaoEmTexto(90)).toBe('1 h 30 min')
    expect(nomeDasSaidas(null)).toBe('Só avisar e registrar')
    expect(nomeDasSaidas(2)).toBe('Encerra na 2ª saída da aba')
  })
})

describe('validarProva', () => {
  it('aceita uma prova completa', () => {
    expect(validarProva(base)).toEqual({})
  })

  it('aponta cada campo com problema', () => {
    const erros = validarProva({ ...base, ofertaId: 0, titulo: ' ', fechaEm: '2026-12-01T07:00', duracaoMin: '4', questoes: [] })
    expect(Object.keys(erros).sort()).toEqual(['duracaoMin', 'fechaEm', 'ofertaId', 'questoes', 'titulo'])
  })

  it('peso com vírgula vale; zero e acima de 100 não', () => {
    expect(validarProva({ ...base, questoes: [{ exercicioId: 1, peso: '2,5' }] })).toEqual({})
    expect(validarProva({ ...base, questoes: [{ exercicioId: 1, peso: '0' }] }).questoes).toBeDefined()
    expect(validarProva({ ...base, questoes: [{ exercicioId: 1, peso: '101' }] }).questoes).toBeDefined()
  })

  it('limite de 30 questões', () => {
    const muitas = Array.from({ length: 31 }, (_, i) => ({ exercicioId: i + 1, peso: '1' }))
    expect(validarProva({ ...base, questoes: muitas }).questoes).toBe('Use até 30 questões.')
  })
})
