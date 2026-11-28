import { dicasLiberadas, faltamParaProxima, guardarTentativasErradas, lerTentativasErradas, limparDicas } from './dicas'

describe('dicas do exercício', () => {
  it('uma dica a cada 2 tentativas erradas, até o total', () => {
    expect([0, 1, 2, 3, 4, 6, 10].map((n) => dicasLiberadas(n, 3))).toEqual([0, 0, 1, 1, 2, 3, 3])
    expect(dicasLiberadas(10, 0)).toBe(0)
  })

  it('quantas tentativas faltam para a próxima', () => {
    expect([0, 1, 2, 3, 5, 6].map((n) => faltamParaProxima(n, 3))).toEqual([2, 1, 2, 1, 1, 0])
  })

  it('a contagem fica no navegador e começa do zero', () => {
    localStorage.clear()
    expect(lerTentativasErradas(9)).toBe(0)
    guardarTentativasErradas(9, 3)
    expect(lerTentativasErradas(9)).toBe(3)
    localStorage.setItem('orbita:tentativas-erradas:9', 'abc')
    expect(lerTentativasErradas(9)).toBe(0)
  })

  it('dicas vazias não são salvas', () => {
    expect(limparDicas(['  Use while. ', '', '   '])).toEqual(['Use while.'])
  })
})
