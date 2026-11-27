// Roda o Python do aluno (Pyodide) fora da tela principal. Se o código travar
// (laço infinito), a tela encerra este worker e cria outro.
import type { PyodideAPI } from 'pyodide'

export type PedidoAoPython = { id: number; codigo: string; entrada: string; mostrarPerguntas: boolean }
export type RespostaDoPython =
  | { tipo: 'pronto' }
  | { tipo: 'falha-ao-carregar'; mensagem: string }
  | { tipo: 'resultado'; id: number; saida: string; erro: string | null; saidaGrande: boolean; precisaDeEntrada: boolean }

const LIMITE_SAIDA = 20_000

const responder = (r: RespostaDoPython) => (self as unknown as { postMessage(m: RespostaDoPython): void }).postMessage(r)

// input() lê as linhas da entrada; sem a pergunta na saída quando é teste.
// No terminal (Rodar), quando as linhas acabam o programa para e a tela pede a
// próxima resposta ao aluno; depois roda de novo com todas as respostas.
const PRELUDIO = `
import sys as __orbita_sys
class __OrbitaPrecisaDeEntrada(BaseException):
    pass
def input(pergunta=''):
    if __orbita_mostrar:
        print(pergunta, end='')
    if not __orbita_linhas:
        if __orbita_mostrar:
            __orbita_sys.stdout.flush()
            raise __OrbitaPrecisaDeEntrada()
        raise EOFError('a entrada acabou (input() sem mais linhas)')
    linha = __orbita_linhas.pop(0)
    if __orbita_mostrar:
        print(linha)
    return linha
`

function limparTraceback(texto: string): string {
  const linhas = texto.trimEnd().split('\n')
  const inicio = linhas.findIndex((l) => l.includes('File "<exec>"'))
  if (inicio < 0) return linhas.slice(-1).join('\n')
  return ['Traceback (most recent call last):', ...linhas.slice(inicio)].join('\n')
}

let pyodide: PyodideAPI | null = null

async function carregar() {
  try {
    const base = new URL(`${import.meta.env.BASE_URL}pyodide/`, self.location.origin).href
    const modulo = (await import(/* @vite-ignore */ `${base}pyodide.mjs`)) as typeof import('pyodide')
    pyodide = await modulo.loadPyodide({ indexURL: base })
    responder({ tipo: 'pronto' })
  } catch (e) {
    responder({ tipo: 'falha-ao-carregar', mensagem: String(e) })
  }
}

const carregando = carregar()

self.onmessage = async (evento: MessageEvent<PedidoAoPython>) => {
  await carregando
  const py = pyodide
  if (!py) return
  const { id, codigo, entrada, mostrarPerguntas } = evento.data
  let saida = ''
  let saidaGrande = false
  const decodificador = new TextDecoder()
  const escrever = (buffer: Uint8Array) => {
    if (saida.length < LIMITE_SAIDA) saida += decodificador.decode(buffer, { stream: true })
    else saidaGrande = true
    return buffer.length
  }
  py.setStdout({ write: escrever })
  py.setStderr({ write: escrever })
  py.setStdin({ error: true })

  const globais = py.globals.get('dict')()
  const linhas = entrada.replace(/\r\n/g, '\n').split('\n')
  if (linhas.at(-1) === '') linhas.pop()
  globais.set('__orbita_linhas', py.toPy(linhas))
  globais.set('__orbita_mostrar', mostrarPerguntas)
  let erro: string | null = null
  let precisaDeEntrada = false
  try {
    py.runPython(PRELUDIO, { globals: globais })
    await py.runPythonAsync(codigo, { globals: globais })
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e)
    if (mostrarPerguntas && mensagem.includes('__OrbitaPrecisaDeEntrada')) precisaDeEntrada = true
    else erro = limparTraceback(mensagem)
  } finally {
    globais.destroy()
  }
  if (saidaGrande) saida = saida.slice(0, LIMITE_SAIDA)
  responder({ tipo: 'resultado', id, saida, erro, saidaGrande, precisaDeEntrada })
}
