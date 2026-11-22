// HTML e CSS: a página do aluno abre numa moldura isolada, sem rodar scripts,
// e cada teste é uma consulta à página pronta:
//   "h1"                  → o texto do primeiro <h1>
//   "h1 | color"          → o valor final da propriedade CSS (ex.: rgb(255, 0, 0))
//   "img @ alt"           → o valor do atributo
//   "contar li"           → quantos elementos combinam com o seletor
import type { Executor, ResultadoDaExecucao } from './executor'

export const NENHUM_ELEMENTO = '(nenhum elemento encontrado)'

type Consulta =
  | { tipo: 'texto'; seletor: string }
  | { tipo: 'css'; seletor: string; propriedade: string }
  | { tipo: 'atributo'; seletor: string; atributo: string }
  | { tipo: 'contar'; seletor: string }

export function lerConsulta(texto: string): Consulta {
  const t = texto.trim()
  const contar = /^contar\s+(.+)$/i.exec(t)
  if (contar?.[1]) return { tipo: 'contar', seletor: contar[1].trim() }
  const barra = t.lastIndexOf('|')
  if (barra > 0) return { tipo: 'css', seletor: t.slice(0, barra).trim(), propriedade: t.slice(barra + 1).trim() }
  const arroba = t.lastIndexOf(' @')
  if (arroba > 0) return { tipo: 'atributo', seletor: t.slice(0, arroba).trim(), atributo: t.slice(arroba + 2).trim() }
  return { tipo: 'texto', seletor: t }
}

/** Responde uma consulta numa página já carregada. Seletor inválido vira erro. */
export function consultarPagina(doc: Document, texto: string): string {
  const c = lerConsulta(texto)
  if (!c.seletor) throw new Error('Consulta vazia: escreva um seletor CSS, como h1 ou .titulo.')
  let elementos: NodeListOf<Element>
  try {
    elementos = doc.querySelectorAll(c.seletor)
  } catch {
    throw new Error(`Seletor CSS inválido: ${c.seletor}`)
  }
  if (c.tipo === 'contar') return String(elementos.length)
  const el = elementos[0]
  if (!el) return NENHUM_ELEMENTO
  if (c.tipo === 'texto') return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (c.tipo === 'atributo') return el.getAttribute(c.atributo) ?? '(sem o atributo)'
  const janela = doc.defaultView
  return janela ? janela.getComputedStyle(el).getPropertyValue(c.propriedade).trim() : ''
}

/** Abre o HTML numa moldura escondida, sem scripts, e espera carregar. */
function abrirPagina(codigo: string): Promise<{ doc: Document; fechar: () => void }> {
  return new Promise((resolve, reject) => {
    const moldura = document.createElement('iframe')
    // Sem allow-scripts: nenhum script do aluno roda. allow-same-origin deixa a tela ler a página.
    moldura.setAttribute('sandbox', 'allow-same-origin')
    moldura.setAttribute('aria-hidden', 'true')
    moldura.tabIndex = -1
    moldura.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;visibility:hidden'
    const fechar = () => moldura.remove()
    moldura.onload = () => {
      const doc = moldura.contentDocument
      if (doc) resolve({ doc, fechar })
      else {
        fechar()
        reject(new Error('Não foi possível abrir a página.'))
      }
    }
    moldura.srcdoc = codigo
    document.body.appendChild(moldura)
  })
}

/** Mesmo jeito dos outros executores: a "entrada" é a consulta e a "saída" é a resposta. */
export class ExecutorHtml implements Executor {
  async carregar() {}

  async rodar(codigo: string, entrada = ''): Promise<ResultadoDaExecucao> {
    const { doc, fechar } = await abrirPagina(codigo)
    try {
      return { saida: consultarPagina(doc, entrada), erro: null, tempoEsgotado: false, saidaGrande: false }
    } catch (e) {
      return { saida: '', erro: e instanceof Error ? e.message : String(e), tempoEsgotado: false, saidaGrande: false }
    } finally {
      fechar()
    }
  }

  encerrar() {}
}
