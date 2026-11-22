// Execução do JavaScript do aluno (usada dentro do worker). Fica separada do
// worker para poder ser testada.

const LIMITE_SAIDA = 20_000

/** Linhas que o Function acrescenta antes do código do aluno. */
const LINHAS_DO_CABECALHO = 3

function formatar(valor: unknown): string {
  if (typeof valor === 'string') return valor
  if (valor === undefined) return 'undefined'
  if (typeof valor === 'function') return `[função ${valor.name || 'anônima'}]`
  if (typeof valor === 'object' && valor !== null) {
    try {
      return JSON.stringify(valor)
    } catch {
      return String(valor)
    }
  }
  return String(valor)
}

/** Mensagem curta do erro, com a linha do código do aluno quando dá para saber. */
function mensagemDoErro(e: unknown): string {
  if (!(e instanceof Error)) return `Erro: ${formatar(e)}`
  const linha = /<anonymous>:(\d+):\d+/.exec(e.stack ?? '')?.[1]
  const numero = linha ? Number(linha) - LINHAS_DO_CABECALHO : 0
  return numero > 0 ? `${e.name} na linha ${numero}: ${e.message}` : `${e.name}: ${e.message}`
}

export function rodarJavaScript(
  codigo: string,
  entrada: string,
  mostrarPerguntas: boolean,
): { saida: string; erro: string | null; saidaGrande: boolean } {
  let saida = ''
  let saidaGrande = false
  const escrever = (texto: string) => {
    if (saida.length + texto.length <= LIMITE_SAIDA) saida += texto
    else {
      saida = (saida + texto).slice(0, LIMITE_SAIDA)
      saidaGrande = true
    }
  }
  const linhas = entrada.replace(/\r\n/g, '\n').split('\n')
  if (linhas.at(-1) === '') linhas.pop()

  const log = (...valores: unknown[]) => escrever(`${valores.map(formatar).join(' ')}\n`)
  const ler = (pergunta?: unknown) => {
    if (mostrarPerguntas && pergunta !== undefined) escrever(formatar(pergunta))
    const linha = linhas.shift()
    if (linha === undefined) throw new Error('a entrada acabou (input() sem mais linhas)')
    if (mostrarPerguntas) escrever(`${linha}\n`)
    return linha
  }
  const consoleDoAluno = { log, info: log, warn: log, error: log, debug: log }

  let erro: string | null = null
  try {
    // "use strict" fica na primeira linha do corpo; o cabeçalho do Function ocupa 2.
    const programa = new Function('console', 'input', 'prompt', 'alert', `"use strict";\n${codigo}`) as (
      ...a: unknown[]
    ) => void
    programa(consoleDoAluno, ler, ler, log)
  } catch (e) {
    erro = mensagemDoErro(e)
  }
  return { saida, erro, saidaGrande }
}
