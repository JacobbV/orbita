import { describe, expect, it } from 'vitest'
import { ultimasGanhas, type MedalhaDoAluno } from './medalhas'

const m = (codigo: string, ganhaEm: string | null): MedalhaDoAluno => ({ codigo, nome: codigo, descricao: '', ganhaEm })

describe('ultimasGanhas', () => {
  it('fica só com as ganhas, da mais recente para a mais antiga', () => {
    const lista = [
      m('a', '2026-11-01T10:00:00Z'),
      m('b', null),
      m('c', '2026-11-03T10:00:00Z'),
      m('d', '2026-11-02T10:00:00Z'),
      m('e', '2026-10-01T10:00:00Z'),
    ]
    expect(ultimasGanhas(lista).map((x) => x.codigo)).toEqual(['c', 'd', 'a'])
    expect(ultimasGanhas(lista, 10).map((x) => x.codigo)).toEqual(['c', 'd', 'a', 'e'])
    expect(ultimasGanhas([m('b', null)])).toEqual([])
  })
})
