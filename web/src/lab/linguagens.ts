// As linguagens do laboratório: nome, arquivo, textos da tela e executor.
import { ExecutorJavaScript, ExecutorPython, type Executor } from './executor'
import { ExecutorHtml } from './html'

export type Linguagem = 'python' | 'javascript' | 'html'

interface InfoDaLinguagem {
  nome: string
  arquivo: string
  /** Rótulo da entrada de cada teste (no exemplo e no painel). */
  entrada: string
  saida: string
}

export const LINGUAGENS: Record<Linguagem, InfoDaLinguagem> = {
  python: { nome: 'Python', arquivo: 'main.py', entrada: 'Entrada', saida: 'Saída esperada' },
  javascript: { nome: 'JavaScript', arquivo: 'main.js', entrada: 'Entrada', saida: 'Saída esperada' },
  html: { nome: 'HTML e CSS', arquivo: 'index.html', entrada: 'O que é conferido', saida: 'Resultado esperado' },
}

export const ORDEM_DAS_LINGUAGENS: Linguagem[] = ['python', 'javascript', 'html']

export function ehLinguagem(valor: string): valor is Linguagem {
  return valor in LINGUAGENS
}

export function criarExecutor(linguagem: Linguagem): Executor {
  if (linguagem === 'javascript') return new ExecutorJavaScript()
  if (linguagem === 'html') return new ExecutorHtml()
  return new ExecutorPython()
}
