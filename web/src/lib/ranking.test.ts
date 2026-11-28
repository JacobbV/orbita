import { describe, expect, it } from 'vitest'
import { separarVoce, turmasAprovadas, type LinhaDoRanking } from './ranking'

const pedido = (status: string, id: number, nome: string) => ({ status, oferta: { turma: { id, nome } } })

describe('turmasAprovadas', () => {
  it('junta as disciplinas da mesma turma e ignora pedidos que não foram aprovados', () => {
    const lista = turmasAprovadas([
      pedido('aprovado', 1, '1º INFO M'),
      pedido('aprovado', 1, '1º INFO M'),
      pedido('pendente', 2, '3º INFO M'),
      pedido('recusado', 3, '3º INFO V'),
    ])
    expect(lista).toEqual([{ id: 1, nome: '1º INFO M' }])
  })
})

const l = (posicao: number, ehVoce = false): LinhaDoRanking => ({ posicao, apelido: `A${posicao}`, escolhas: {}, patente: 'Cadete', xp: 0, ehVoce })

describe('separarVoce', () => {
  it('põe a própria linha à parte só quando ela vem depois das 10 primeiras', () => {
    const dez = Array.from({ length: 10 }, (_, i) => l(i + 1))
    expect(separarVoce([...dez, l(17, true)]).voce?.posicao).toBe(17)
    expect(separarVoce([...dez, l(17, true)]).top).toHaveLength(10)
    expect(separarVoce(dez).voce).toBeNull()
    const dentro = [...dez.slice(0, 9), l(10, true)]
    expect(separarVoce(dentro)).toEqual({ top: dentro, voce: null })
  })
})
