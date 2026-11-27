import { describe, expect, it } from 'vitest'
import {
  doCampoDeData,
  duracaoEmTexto,
  estadoDaProvaDoAluno,
  momentoDaProva,
  nomeDasSaidas,
  paraCampoDeData,
  validarProva,
  type DadosDaProva,
  type ProvaDoAluno,
} from './provas'

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

describe('estadoDaProvaDoAluno', () => {
  const base: ProvaDoAluno = {
    id: 1,
    titulo: 'Prova',
    instrucoes: '',
    abreEm: '2026-12-01T08:00:00Z',
    fechaEm: '2026-12-01T10:00:00Z',
    duracaoMin: 60,
    saidasParaEncerrar: null,
    questoes: 2,
    comecouEm: null,
    terminaEm: null,
    entregueEm: null,
    encerradaPor: null,
    saidas: 0,
    nota: null,
  }
  const t = (iso: string) => Date.parse(iso)

  it('antes, aberta e perdida (sem ter começado)', () => {
    expect(estadoDaProvaDoAluno(base, t('2026-12-01T07:00:00Z'))).toBe('antes')
    expect(estadoDaProvaDoAluno(base, t('2026-12-01T09:00:00Z'))).toBe('aberta')
    expect(estadoDaProvaDoAluno(base, t('2026-12-01T11:00:00Z'))).toBe('perdida')
  })

  it('em andamento enquanto o tempo dele não acabou; depois, entregue', () => {
    const comecou = { ...base, comecouEm: '2026-12-01T08:30:00Z', terminaEm: '2026-12-01T09:30:00Z' }
    expect(estadoDaProvaDoAluno(comecou, t('2026-12-01T09:00:00Z'))).toBe('em_andamento')
    expect(estadoDaProvaDoAluno(comecou, t('2026-12-01T09:31:00Z'))).toBe('entregue')
    expect(estadoDaProvaDoAluno({ ...comecou, entregueEm: '2026-12-01T08:45:00Z' }, t('2026-12-01T08:50:00Z'))).toBe('entregue')
  })
})
