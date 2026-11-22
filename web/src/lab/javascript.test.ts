import { rodarJavaScript } from './javascript'

describe('rodarJavaScript', () => {
  it('console.log escreve a saída e input() lê a entrada', () => {
    const r = rodarJavaScript('const a = Number(input())\nconst b = Number(input())\nconsole.log(a + b)', '2\n3', false)
    expect(r).toEqual({ saida: '5\n', erro: null, saidaGrande: false })
  })

  it('prompt() também lê; no Rodar a pergunta aparece como no terminal', () => {
    const r = rodarJavaScript('const nome = prompt("Nome: ")\nconsole.log("Oi,", nome)', 'Lua', true)
    expect(r.saida).toBe('Nome: Lua\nOi, Lua\n')
  })

  it('mostra objetos e listas', () => {
    expect(rodarJavaScript('console.log([1, 2], { a: 1 })', '', false).saida).toBe('[1,2] {"a":1}\n')
  })

  it('erro curto com a linha do código do aluno', () => {
    const r = rodarJavaScript('console.log(1)\nconsole.log(x)', '', false)
    expect(r.saida).toBe('1\n')
    expect(r.erro).toBe('ReferenceError na linha 2: x is not defined')
  })

  it('erro de sintaxe e entrada que acabou', () => {
    expect(rodarJavaScript('console.log((', '', false).erro).toMatch(/^SyntaxError/)
    expect(rodarJavaScript('input()', '', false).erro).toMatch(/a entrada acabou/)
  })

  it('corta saída muito grande', () => {
    const r = rodarJavaScript('for (let i = 0; i < 10000; i++) console.log("linha comprida")', '', false)
    expect(r.saidaGrande).toBe(true)
    expect(r.saida.length).toBe(20_000)
  })
})
