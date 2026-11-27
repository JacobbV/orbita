import { rodarJavaScript } from './javascript'

describe('rodarJavaScript', () => {
  it('console.log escreve a saída e input() lê a entrada', () => {
    const r = rodarJavaScript('const a = Number(input())\nconst b = Number(input())\nconsole.log(a + b)', '2\n3', false)
    expect(r).toEqual({ saida: '5\n', erro: null, saidaGrande: false, precisaDeEntrada: false })
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

describe('rodarJavaScript no terminal', () => {
  it('sem resposta para o input(), para e avisa que precisa de entrada', () => {
    const r = rodarJavaScript('const n = prompt("Número: ")\nconsole.log(n * 2)', '', true)
    expect(r).toEqual({ saida: 'Número: ', erro: null, saidaGrande: false, precisaDeEntrada: true })
  })

  it('com a resposta, termina o programa', () => {
    const r = rodarJavaScript('const n = prompt("Número: ")\nconsole.log(n * 2)', '21\n', true)
    expect(r.precisaDeEntrada).toBe(false)
    expect(r.saida).toBe('Número: 21\n42\n')
  })

  it('resposta vazia vale como resposta', () => {
    const r = rodarJavaScript('const n = prompt("Nome: ")\nconsole.log("[" + n + "]")', '\n', true)
    expect(r.saida).toBe('Nome: \n[]\n')
  })

  it('nos testes (sem terminal), faltar entrada continua sendo erro', () => {
    expect(rodarJavaScript('input()', '', false)).toMatchObject({ precisaDeEntrada: false, erro: expect.stringMatching(/a entrada acabou/) })
  })
})
