// Tradução dos erros do Python e do JavaScript para português simples.
// A mensagem original continua aparecendo embaixo; a tradução só explica o que
// o erro quer dizer e onde olhar. Nunca dá a resposta do exercício.

import type { Linguagem } from './linguagens'

export interface ErroTraduzido {
  /** Nome do erro como a linguagem mostrou (ex.: NameError). */
  tipo: string
  /** Explicação em português simples. */
  explicacao: string
  /** Linha do código do aluno onde o erro aconteceu, quando dá para saber. */
  linha: number | null
}

type Regra = [RegExp, (m: RegExpMatchArray) => string]

const nome = (n: string | undefined) => `“${n ?? ''}”`

const REGRAS_PYTHON: Record<string, Regra[]> = {
  SyntaxError: [
    [/^'(.)' was never closed/, (m) => `Faltou fechar o ${m[1]}. Todo ${m[1]} aberto precisa do seu par ${par(m[1]!)}.`],
    [/^unmatched '(.)'/, (m) => `Tem um ${m[1]} sobrando, sem o ${abre(m[1]!)} que abre.`],
    [/^closing parenthesis '(.)' does not match opening parenthesis '(.)'/, (m) => `Você abriu com ${m[2]} e fechou com ${m[1]}. Use o par certo.`],
    [/^unterminated (?:triple-quoted )?string literal/, () => 'Faltou fechar as aspas do texto. Toda aspa aberta precisa ser fechada na mesma linha.'],
    [/^expected ':'/, () => 'Faltou os dois-pontos (:) no fim da linha. Eles vão depois de if, elif, else, for, while e def.'],
    [/Perhaps you forgot a comma\?/, () => 'Parece que faltou uma vírgula entre dois valores.'],
    [/Maybe you meant '==' or ':=' instead of '='\?|Maybe you meant '==' instead of '='\?/, () => 'Para comparar dois valores use == (dois iguais). Um = só guarda um valor numa variável.'],
    [/^cannot assign to/, () => 'Do lado esquerdo do = tem de ficar o nome de uma variável.'],
    [/^Missing parentheses in call to 'print'/, () => 'No Python 3 o print precisa de parênteses: print("texto").'],
    [/^invalid character '(.+?)'/, (m) => `O caractere ${m[1]} não vale em código. Ele costuma vir de texto copiado; apague e digite de novo (aspas e traço comuns).`],
    [/^f-string: expecting '}'/, () => 'Na f-string, cada { precisa do seu }.'],
    [/^invalid decimal literal/, () => 'Um número está grudado em letras. Nome de variável não pode começar com número.'],
    [/^'return' outside function/, () => 'O return só pode ficar dentro de uma função (def).'],
    [/^'break' outside loop/, () => 'O break só pode ficar dentro de um laço (for ou while).'],
    [/^invalid syntax/, () => 'Tem algo escrito fora das regras do Python nesta linha (ou no fim da linha de cima). Confira parênteses, aspas, vírgulas e dois-pontos.'],
    [/^unexpected EOF while parsing|^incomplete input/, () => 'O código acabou no meio de alguma coisa. Confira se fechou todos os parênteses e aspas.'],
  ],
  IndentationError: [
    [/^expected an indented block/, () => 'Depois de uma linha que termina com dois-pontos (:), a linha de baixo precisa começar mais para dentro (4 espaços).'],
    [/^unexpected indent/, () => 'Esta linha está mais para dentro do que devia. Alinhe com as linhas do mesmo bloco.'],
    [/^unindent does not match any outer indentation level/, () => 'O recuo desta linha não bate com nenhuma linha de cima. Use sempre 4 espaços por nível.'],
  ],
  TabError: [[/./, () => 'Este código mistura TAB e espaços no recuo. Use só espaços (4 por nível).']],
  NameError: [
    [/^name '(.+?)' is not defined/, (m) => `O nome ${nome(m[1])} não existe. Confira se escreveu certo (maiúsculas contam) e se a variável foi criada antes desta linha. Se era um texto, faltaram as aspas.`],
  ],
  UnboundLocalError: [
    [/local variable '(.+?)'/, (m) => `Dentro da função, ${nome(m[1])} foi usada antes de receber um valor. Crie a variável dentro da função ou passe o valor como parâmetro.`],
  ],
  TypeError: [
    [/^can only concatenate str \(not "(.+?)"\) to str/, () => 'Você tentou juntar texto com número usando +. Converta o número com str(), ou separe com vírgula no print.'],
    [/^unsupported operand type\(s\) for (.+?): '(.+?)' and '(.+?)'/, (m) => `A conta ${m[1]} não funciona entre ${tipo(m[2]!)} e ${tipo(m[3]!)}. Lembre: o input() sempre devolve texto; use int() ou float() para virar número.`],
    [/^'(.+?)' not supported between instances of '(.+?)' and '(.+?)'/, (m) => `Não dá para comparar (${m[1]}) ${tipo(m[2]!)} com ${tipo(m[3]!)}. Converta o texto com int() ou float() antes de comparar.`],
    [/^can't multiply sequence by non-int of type '(.+?)'/, (m) => `Só dá para multiplicar texto ou lista por número inteiro, não por ${tipo(m[1]!)}. Converta o valor com int().`],
    [/^'(.+?)' object is not callable/, (m) => `Você usou parênteses depois de ${tipo(m[1]!)}, como se fosse uma função. Confira se uma variável ficou com o mesmo nome de uma função.`],
    [/^(.+?)\(\) missing (\d+) required positional arguments?: (.+)/, (m) => `A função ${m[1]}() precisa de mais valores entre os parênteses (faltou ${m[3]}).`],
    [/^(.+?)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given/, (m) => `A função ${m[1]}() recebe ${m[2]} valor(es), mas foram passados ${m[3]}.`],
    [/^'(.+?)' object is not subscriptable/, (m) => `Colchetes [ ] só funcionam em listas, textos e dicionários, não em ${tipo(m[1]!)}.`],
    [/^'(.+?)' object is not iterable/, (m) => `O for não consegue percorrer ${tipo(m[1]!)}. Para repetir N vezes use range(N).`],
    [/^object of type '(.+?)' has no len\(\)/, (m) => `len() só mede textos, listas e dicionários, não ${tipo(m[1]!)}.`],
    [/^type str doesn't define __round__/, () => 'round() só arredonda números. Converta o texto com float() antes.'],
    [/^list indices must be integers/, () => 'A posição da lista tem de ser um número inteiro. Se veio do input(), use int().'],
    [/^string indices must be integers/, () => 'A posição no texto tem de ser um número inteiro.'],
  ],
  ValueError: [
    [/^invalid literal for int\(\) with base 10: (.+)/, (m) => `int() só converte texto com número inteiro, e recebeu ${m[1]}. Se o número tem ponto (3.5), use float().`],
    [/^could not convert string to float: (.+)/, (m) => `float() só converte texto com número, e recebeu ${m[1]}. Use ponto, não vírgula: 3.5.`],
    [/^not enough values to unpack/, () => 'Faltaram valores para todas as variáveis do lado esquerdo do =.'],
    [/^too many values to unpack/, () => 'Sobraram valores para as variáveis do lado esquerdo do =.'],
    [/^math domain error/, () => 'A conta não existe para este número (ex.: raiz de número negativo).'],
  ],
  ZeroDivisionError: [[/./, () => 'O programa tentou dividir por zero. Confira o valor que fica embaixo da divisão (/, // ou %).']],
  IndexError: [
    [/^list index out of range/, () => 'O programa pediu uma posição que não existe na lista. Lembre: a primeira posição é 0 e a última é len(lista) - 1.'],
    [/^string index out of range/, () => 'O programa pediu uma posição que não existe no texto. A primeira posição é 0 e a última é len(texto) - 1.'],
    [/^pop from empty list/, () => 'O pop() foi usado numa lista vazia.'],
  ],
  KeyError: [[/^(.+)/, (m) => `A chave ${m[1]} não existe no dicionário. Confira se escreveu igual (maiúsculas contam) ou use .get().`]],
  AttributeError: [
    [/^'(.+?)' object has no attribute '(.+?)'/, (m) => `${maiuscula(tipo(m[1]!))} não tem ${nome(m[2])}. Confira se o nome está escrito certo${dicaDeMetodo(m[1]!, m[2]!)}.`],
  ],
  EOFError: [[/./, () => 'O programa pediu mais input() do que a entrada tem. Confira quantas vezes o input() é chamado.']],
  RecursionError: [[/./, () => 'Uma função chama a si mesma sem parar. Ela precisa de um caso em que para de se chamar.']],
  ModuleNotFoundError: [[/^No module named '(.+?)'/, (m) => `A biblioteca ${nome(m[1])} não existe aqui. Confira o nome; neste laboratório só há as bibliotecas que já vêm com o Python.`]],
  ImportError: [[/./, () => 'Não foi possível importar isto. Confira o nome do que vem depois do import.']],
  OverflowError: [[/./, () => 'O número ficou grande demais para a conta.']],
}

const REGRAS_JAVASCRIPT: Record<string, Regra[]> = {
  ReferenceError: [
    [/^(.+?) is not defined/, (m) => `O nome ${nome(m[1])} não existe. Confira se escreveu certo (maiúsculas contam) e se criou a variável com let ou const antes. Se era um texto, faltaram as aspas.`],
    [/^Cannot access '(.+?)' before initialization/, (m) => `${nome(m[1])} foi usada antes da linha que cria a variável.`],
  ],
  TypeError: [
    [/^Cannot read properties of (undefined|null) \(reading '(.+?)'\)/, (m) => `O programa tentou ler ${nome(m[2])} de algo que está vazio (${m[1]}). Confira se a variável recebeu valor.`],
    [/^(.+?) is not a function/, (m) => `${nome(m[1])} não é uma função. Confira o nome (maiúsculas contam) e se ela existe.`],
    [/^Assignment to constant variable/, () => 'Uma variável criada com const não pode mudar de valor. Use let se ela precisa mudar.'],
    [/^(.+?) is not iterable/, (m) => `O for...of não consegue percorrer ${nome(m[1])}.`],
  ],
  SyntaxError: [
    [/^missing \) after argument list/, () => 'Faltou fechar um parêntese ), ou falta uma vírgula entre os valores.'],
    [/^Unexpected end of input/, () => 'O código acabou no meio de alguma coisa. Confira se fechou todas as chaves { } e parênteses.'],
    [/^Invalid or unexpected token/, () => 'Tem um caractere que não vale aqui. Costuma ser aspas sem fechar ou texto copiado com aspas diferentes.'],
    [/^Unexpected token '(.+?)'/, (m) => `O ${m[1]} apareceu num lugar onde não podia. Confira a linha e a de cima.`],
    [/^Unexpected identifier/, () => 'Um nome apareceu num lugar onde não podia. Talvez falte uma vírgula, um operador ou um ponto e vírgula antes dele.'],
    [/^Identifier '(.+?)' has already been declared/, (m) => `A variável ${nome(m[1])} foi criada duas vezes. Crie uma vez só com let e depois só mude o valor.`],
    [/^Unexpected number/, () => 'Um número apareceu grudado em outro valor. Talvez falte um operador (+, -, *) ou uma vírgula.'],
    [/^Unexpected string/, () => 'Um texto apareceu grudado em outro valor. Talvez falte um + ou uma vírgula.'],
  ],
  RangeError: [
    [/^Maximum call stack size exceeded/, () => 'Uma função chama a si mesma sem parar. Ela precisa de um caso em que para de se chamar.'],
    [/^Invalid array length/, () => 'O tamanho do array não pode ser negativo nem quebrado.'],
  ],
  Error: [[/^a entrada acabou/, () => 'O programa pediu mais input() do que a entrada tem. Confira quantas vezes o input() é chamado.']],
}

const GERAL_PYTHON = 'O Python parou com um erro. Leia a linha marcada e a mensagem original embaixo.'
const GERAL_JAVASCRIPT = 'O JavaScript parou com um erro. Leia a linha marcada e a mensagem original embaixo.'

function par(c: string) {
  return ({ '(': ')', '[': ']', '{': '}' } as Record<string, string>)[c] ?? c
}
function abre(c: string) {
  return ({ ')': '(', ']': '[', '}': '{' } as Record<string, string>)[c] ?? c
}
function maiuscula(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const TIPOS: Record<string, string> = {
  str: 'texto (str)',
  int: 'número inteiro (int)',
  float: 'número com ponto (float)',
  list: 'lista (list)',
  dict: 'dicionário (dict)',
  tuple: 'tupla (tuple)',
  bool: 'verdadeiro/falso (bool)',
  NoneType: 'vazio (None)',
  function: 'função',
  builtin_function_or_method: 'função',
  set: 'conjunto (set)',
}
const tipo = (t: string) => TIPOS[t] ?? t

function dicaDeMetodo(t: string, metodo: string): string {
  if (t === 'list' && metodo === 'push') return '. Em Python, para pôr na lista use append()'
  if (metodo === 'lenght' || metodo === 'length' || metodo === 'len') return '. Para saber o tamanho use len(valor)'
  if (t === 'NoneType') return '. A variável ficou vazia (None): talvez a função não tenha return'
  return ''
}

/** Linha do erro no traceback do Python: o último trecho do código do aluno. */
function linhaDoPython(texto: string): number | null {
  let linha: number | null = null
  for (const m of texto.matchAll(/File "<exec>", line (\d+)(?:, in (.+))?/g)) {
    // O input() do laboratório é do site, não do aluno: a linha dele não conta.
    if (m[2]?.trim() === 'input') continue
    linha = Number(m[1])
  }
  return linha
}

function traduzir(regras: Record<string, Regra[]>, tipoDoErro: string, mensagem: string): string | null {
  for (const [padrao, texto] of regras[tipoDoErro] ?? []) {
    const m = mensagem.match(padrao)
    if (m) return texto(m)
  }
  return null
}

/** Explica o erro do programa do aluno. Devolve null quando não há erro reconhecível. */
export function traduzirErro(erro: string | null, linguagem: Linguagem): ErroTraduzido | null {
  if (!erro?.trim()) return null
  if (linguagem === 'javascript') {
    // Formato do laboratório: "TypeError na linha 3: mensagem" ou "SyntaxError: mensagem".
    const m = /^(\w+)(?: na linha (\d+))?: ([\s\S]*)$/.exec(erro.trim())
    if (!m) return { tipo: 'Erro', explicacao: GERAL_JAVASCRIPT, linha: null }
    const [, tipoDoErro = 'Erro', linha, mensagem = ''] = m
    return {
      tipo: tipoDoErro,
      explicacao: traduzir(REGRAS_JAVASCRIPT, tipoDoErro, mensagem) ?? GERAL_JAVASCRIPT,
      linha: linha ? Number(linha) : null,
    }
  }
  if (linguagem !== 'python') return null
  const ultima = erro.trimEnd().split('\n').at(-1) ?? ''
  const m = /^(\w+(?:Error|Exception|Exit|Interrupt)?)(?:: (.*))?$/.exec(ultima.trim())
  const tipoDoErro = m?.[1] ?? 'Erro'
  const mensagem = m?.[2] ?? ''
  return {
    tipo: tipoDoErro,
    explicacao: traduzir(REGRAS_PYTHON, tipoDoErro, mensagem) ?? GERAL_PYTHON,
    linha: linhaDoPython(erro),
  }
}
