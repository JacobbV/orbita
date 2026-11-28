import { traduzirErro } from './traducaoDeErros'

// Mensagens reais do Pyodide 0.28 (Python 3.13) e do laboratório de JavaScript.
const tb = (linha: number, final: string, extra = '') =>
  `Traceback (most recent call last):\n  File "<exec>", line ${linha}${extra}\n${final}`

describe('erros do Python em português', () => {
  it.each([
    [tb(2, "NameError: name 'y' is not defined", ', in <module>'), 2, /O nome “y” não existe/],
    [tb(1, "SyntaxError: '(' was never closed"), 1, /Faltou fechar o \(/],
    [tb(1, 'SyntaxError: unterminated string literal (detected at line 1)'), 1, /Faltou fechar as aspas/],
    [tb(1, "SyntaxError: expected ':'"), 1, /Faltou os dois-pontos/],
    [tb(2, "IndentationError: expected an indented block after 'if' statement on line 1"), 2, /mais para dentro/],
    [tb(2, 'IndentationError: unexpected indent'), 2, /mais para dentro do que devia/],
    [tb(3, 'IndentationError: unindent does not match any outer indentation level'), 3, /recuo desta linha/],
    [tb(1, 'SyntaxError: invalid syntax. Perhaps you forgot a comma?'), 1, /faltou uma vírgula/],
    [tb(1, "SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?"), 1, /use == \(dois iguais\)/],
    [tb(1, 'TypeError: can only concatenate str (not "int") to str', ', in <module>'), 1, /juntar texto com número/],
    [tb(1, "TypeError: unsupported operand type(s) for +: 'int' and 'str'", ', in <module>'), 1, /número inteiro \(int\) e texto \(str\).*input\(\)/],
    [tb(1, "TypeError: '<' not supported between instances of 'str' and 'int'", ', in <module>'), 1, /Não dá para comparar/],
    [tb(1, "ValueError: invalid literal for int() with base 10: 'abc'", ', in <module>'), 1, /int\(\) só converte.*'abc'/],
    [tb(1, "ValueError: could not convert string to float: 'abc'", ', in <module>'), 1, /Use ponto, não vírgula/],
    [tb(1, 'ZeroDivisionError: division by zero', ', in <module>'), 1, /dividir por zero/],
    [tb(2, 'IndexError: list index out of range', ', in <module>'), 2, /posição que não existe na lista/],
    [tb(2, "KeyError: 'a'", ', in <module>'), 2, /chave 'a' não existe/],
    [tb(2, "AttributeError: 'list' object has no attribute 'push'", ', in <module>'), 2, /Lista \(list\) não tem “push”.*append\(\)/],
    [tb(1, "ModuleNotFoundError: No module named 'numpyy'", ', in <module>'), 1, /biblioteca “numpyy”/],
    [tb(2, "TypeError: f() missing 1 required positional argument: 'a'", ', in <module>'), 2, /f\(\) precisa de mais valores/],
    [tb(1, "TypeError: 'int' object is not iterable", ', in <module>'), 1, /range\(N\)/],
    [tb(1, "SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...)?"), 1, /print precisa de parênteses/],
    [tb(1, "SyntaxError: invalid character '–' (U+2013)"), 1, /O caractere – não vale/],
    [tb(3, "UnboundLocalError: cannot access local variable 'x' where it is not associated with a value", ', in f'), 3, /“x” foi usada antes/],
  ])('%s', (erro, linha, explicacao) => {
    const t = traduzirErro(erro, 'python')
    expect(t?.linha).toBe(linha)
    expect(t?.explicacao).toMatch(explicacao)
  })

  it('a linha é a do último trecho do aluno (erro dentro de função)', () => {
    const erro = [
      'Traceback (most recent call last):',
      '  File "<exec>", line 5, in <module>',
      '  File "<exec>", line 2, in dobro',
      'ZeroDivisionError: division by zero',
    ].join('\n')
    expect(traduzirErro(erro, 'python')?.linha).toBe(2)
  })

  it('o input() do laboratório não conta: a linha é a do aluno que chamou', () => {
    const erro = [
      'Traceback (most recent call last):',
      '  File "<exec>", line 3, in <module>',
      '  File "<exec>", line 13, in input',
      'EOFError: a entrada acabou (input() sem mais linhas)',
    ].join('\n')
    const t = traduzirErro(erro, 'python')
    expect(t?.linha).toBe(3)
    expect(t?.explicacao).toMatch(/mais input\(\) do que a entrada tem/)
  })

  it('erro desconhecido: explicação geral, sem inventar', () => {
    const t = traduzirErro(tb(1, 'SystemError: algo estranho'), 'python')
    expect(t?.tipo).toBe('SystemError')
    expect(t?.explicacao).toMatch(/O Python parou com um erro/)
  })

  it('sem erro: nada para explicar', () => {
    expect(traduzirErro(null, 'python')).toBeNull()
    expect(traduzirErro('  ', 'python')).toBeNull()
  })
})

describe('erros do JavaScript em português', () => {
  it.each([
    ['ReferenceError na linha 1: y is not defined', 1, /O nome “y” não existe/],
    ["TypeError na linha 1: Cannot read properties of undefined (reading 'b')", 1, /ler “b” de algo que está vazio/],
    ['TypeError na linha 2: x is not a function', 2, /“x” não é uma função/],
    ['TypeError na linha 2: Assignment to constant variable.', 2, /const não pode mudar/],
    ['SyntaxError: missing ) after argument list', null, /Faltou fechar um parêntese/],
    ['SyntaxError: Unexpected end of input', null, /acabou no meio/],
    ["SyntaxError: Identifier 'a' has already been declared", null, /criada duas vezes/],
    ['RangeError na linha 1: Maximum call stack size exceeded', 1, /chama a si mesma/],
    ['Error na linha 1: a entrada acabou (input() sem mais linhas)', 1, /mais input\(\)/],
  ])('%s', (erro, linha, explicacao) => {
    const t = traduzirErro(erro, 'javascript')
    expect(t?.linha).toBe(linha)
    expect(t?.explicacao).toMatch(explicacao)
  })
})
