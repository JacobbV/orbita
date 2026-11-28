import type { TesteDoAluno } from './correcao'
import { compararListas, diferencaDoTeste, explicarPartes } from './diferenca'

const teste = (parte: Partial<TesteDoAluno>): TesteDoAluno => ({
  id: 1,
  tipo: 'visivel',
  entrada: '',
  saida_esperada: '',
  saida_hash: '',
  conferencia: 'valores',
  palavras: '',
  ...parte,
})

describe('compararListas', () => {
  it('marca o que é igual, o que faltou e o que sobrou, na ordem', () => {
    expect(compararListas(['1', '2', '3'], ['1', '3', '4'])).toEqual([
      { tipo: 'igual', valor: '1' },
      { tipo: 'faltou', valor: '2' },
      { tipo: 'igual', valor: '3' },
      { tipo: 'sobrou', valor: '4' },
    ])
  })

  it('listas vazias', () => {
    expect(compararListas([], [])).toEqual([])
    expect(compararListas(['a'], [])).toEqual([{ tipo: 'faltou', valor: 'a' }])
  })

  it('listas enormes não travam (compara posição por posição)', () => {
    const grande = Array.from({ length: 1000 }, (_, i) => String(i))
    const partes = compararListas(grande, [...grande.slice(0, 999), 'x'])
    expect(partes.filter((p) => p.tipo !== 'igual')).toEqual([
      { tipo: 'faltou', valor: '999' },
      { tipo: 'sobrou', valor: 'x' },
    ])
  })
})

describe('explicarPartes', () => {
  it('troca de um valor por outro vira "onde era X, mostrou Y"', () => {
    expect(explicarPartes(compararListas(['3'], ['12']), false)).toEqual(['Onde era 3, o seu programa mostrou 12.'])
  })

  it('faltou e sobrou separados', () => {
    expect(explicarPartes(compararListas(['1', '2', '3'], ['1']), false)).toEqual(['Faltou: 2 e 3.'])
    expect(explicarPartes(compararListas(['1'], ['1', '1']), false)).toEqual(['Sobrou: 1.'])
  })

  it('lista longa é resumida', () => {
    const f = explicarPartes(compararListas(['1', '2', '3', '4', '5', '6'], []), false)
    expect(f).toEqual(['Faltou: 1, 2, 3 e 4 e mais 2.'])
  })
})

describe('diferencaDoTeste', () => {
  it('só os valores: o texto em volta não aparece como diferença', () => {
    const d = diferencaDoTeste(teste({ entrada: '1\n2', saida_esperada: '3' }), 'A soma é: 12')
    expect(d?.frases).toEqual(['Onde era 3, o seu programa mostrou 12.'])
    expect(d?.porLinha).toBe(false)
  })

  it('programa sem nenhum valor que conta', () => {
    const d = diferencaDoTeste(teste({ entrada: '1\n2', saida_esperada: '3' }), 'Resultado')
    expect(d?.frases[0]).toBe('O seu programa não mostrou nenhum dos valores que contam.')
    expect(d?.frases).toContain('Faltou: 3.')
  })

  it('texto exato: compara por linha e avisa de maiúsculas e acentos', () => {
    const d = diferencaDoTeste(teste({ conferencia: 'exato', saida_esperada: 'Olá, mundo!' }), 'ola, mundo!')
    expect(d?.porLinha).toBe(true)
    expect(d?.frases).toEqual([
      'Onde era “Olá, mundo!”, o seu programa mostrou “ola, mundo!”.',
      'O texto é quase igual: neste exercício maiúsculas, acentos e espaços também contam.',
    ])
  })

  it('texto exato: linha a mais', () => {
    const d = diferencaDoTeste(teste({ conferencia: 'exato', saida_esperada: 'a\nb' }), 'a\nb\nc')
    expect(d?.frases).toEqual(['Sobrou: “c”.'])
  })

  it('teste oculto nunca mostra a diferença', () => {
    expect(diferencaDoTeste(teste({ tipo: 'oculto', saida_esperada: null }), '12')).toBeNull()
  })
})
