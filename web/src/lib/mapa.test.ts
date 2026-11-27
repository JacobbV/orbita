import { describe, expect, it } from 'vitest'
import { corDaUnidade, posicaoNaTrilha, resumoDoPlaneta, situacaoDoPlaneta, unidadeAtual } from './mapa'
import type { AulaDaPonte, DisciplinaDaPonte, UnidadeDaPonte } from './ponte'

function aula(id: number, numero: number, liberada: boolean, liberadaEm: string | null = null): AulaDaPonte {
  return { id, numero, titulo: `Aula ${id}`, liberada, liberadaEm, materiais: [], exercicios: [] }
}
function unidade(id: number, numero: number, aulas: AulaDaPonte[]): UnidadeDaPonte {
  return { id, numero, titulo: `Unidade ${numero}`, aulas, liberadas: aulas.filter((a) => a.liberada).length }
}

describe('mapa da galáxia', () => {
  it('dá uma cor por unidade e repete a paleta', () => {
    expect(corDaUnidade(1)).toBe('var(--ciano)')
    expect(corDaUnidade(4)).toBe('var(--plasma)')
    expect(corDaUnidade(5)).toBe('var(--ciano)')
  })

  it('descreve o planeta pelo que foi liberado', () => {
    const vazia = unidade(1, 1, [])
    const trancada = unidade(2, 2, [aula(1, 1, false), aula(2, 2, false)])
    const parcial = unidade(3, 3, [aula(3, 1, true), aula(4, 2, false)])
    const toda = unidade(4, 4, [aula(5, 1, true)])
    expect(situacaoDoPlaneta(vazia)).toBe('em-breve')
    expect(situacaoDoPlaneta(trancada)).toBe('bloqueado')
    expect(situacaoDoPlaneta(parcial)).toBe('em-andamento')
    expect(situacaoDoPlaneta(toda)).toBe('completo')
    expect(resumoDoPlaneta(parcial)).toBe('1 de 2 liberadas')
    expect(resumoDoPlaneta(toda)).toBe('1 de 1 liberada')
    expect(resumoDoPlaneta(trancada)).toBe('nenhuma aula liberada')
    expect(resumoDoPlaneta(vazia)).toBe('aulas em breve')
  })

  it('a unidade atual é a da última aula aberta, senão a primeira com aula liberada', () => {
    const u1 = unidade(1, 1, [aula(11, 1, true, '2026-11-02T10:00:00Z')])
    const u2 = unidade(2, 2, [aula(21, 1, true, '2026-11-05T10:00:00Z'), aula(22, 2, false)])
    const d = { unidades: [u1, u2], ultimaLiberada: { unidade: u2, aula: u2.aulas[0] } } as unknown as DisciplinaDaPonte
    expect(unidadeAtual(d, 11)?.id).toBe(1)
    expect(unidadeAtual(d, null)?.id).toBe(2)
    const trancada = { unidades: [unidade(3, 1, [aula(31, 1, false)])], ultimaLiberada: null } as unknown as DisciplinaDaPonte
    expect(unidadeAtual(trancada, null)?.id).toBe(3)
    expect(unidadeAtual({ unidades: [], ultimaLiberada: null } as unknown as DisciplinaDaPonte, null)).toBeNull()
  })

  it('espalha os planetas pela trilha, alternando em cima e embaixo', () => {
    expect(posicaoNaTrilha(0, 4)).toEqual({ x: 12.5, y: 62 })
    expect(posicaoNaTrilha(1, 4)).toEqual({ x: 37.5, y: 38 })
    expect(posicaoNaTrilha(3, 4).x).toBe(87.5)
  })
})
