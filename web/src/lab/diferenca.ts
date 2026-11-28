// Diferença entre a saída esperada e a do aluno, para os testes visíveis.
// Usa a mesma forma da correção (correcao.ts): no modo "valores" compara os
// valores que contam; no "texto", as palavras e números; no "exato", as linhas.

import { normalizarSaida, valoresConferidos, type TesteDoAluno } from './correcao'

export type TipoDaParte = 'igual' | 'faltou' | 'sobrou'
export interface Parte {
  tipo: TipoDaParte
  valor: string
}

export interface Diferenca {
  /** Valores (ou linhas, no modo exato) em ordem, marcados. */
  partes: Parte[]
  /** Frases curtas que explicam a diferença. */
  frases: string[]
  /** true quando compara linhas (modo exato). */
  porLinha: boolean
}

/** Maior sequência comum (LCS) entre as duas listas, marcando o que faltou e o que sobrou. */
export function compararListas(esperado: string[], obtido: string[]): Parte[] {
  const n = esperado.length
  const m = obtido.length
  // Listas muito grandes: compara posição por posição, sem a tabela (evita travar a tela).
  if (n * m > 250_000) {
    const partes: Parte[] = []
    for (let i = 0; i < Math.max(n, m); i++) {
      const e = esperado[i]
      const o = obtido[i]
      if (e === o) partes.push({ tipo: 'igual', valor: e! })
      else {
        if (e !== undefined) partes.push({ tipo: 'faltou', valor: e })
        if (o !== undefined) partes.push({ tipo: 'sobrou', valor: o })
      }
    }
    return partes
  }
  const t: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      t[i]![j] = esperado[i] === obtido[j] ? t[i + 1]![j + 1]! + 1 : Math.max(t[i + 1]![j]!, t[i]![j + 1]!)
  const partes: Parte[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (esperado[i] === obtido[j]) {
      partes.push({ tipo: 'igual', valor: esperado[i]! })
      i++
      j++
    } else if (t[i + 1]![j]! >= t[i]![j + 1]!) {
      partes.push({ tipo: 'faltou', valor: esperado[i++]! })
    } else {
      partes.push({ tipo: 'sobrou', valor: obtido[j++]! })
    }
  }
  while (i < n) partes.push({ tipo: 'faltou', valor: esperado[i++]! })
  while (j < m) partes.push({ tipo: 'sobrou', valor: obtido[j++]! })
  return partes
}

const LIMITE_NA_FRASE = 4

function listar(valores: string[], porLinha: boolean): string {
  const mostrar = valores.slice(0, LIMITE_NA_FRASE).map((v) => (porLinha ? `“${v || '(linha vazia)'}”` : v))
  const resto = valores.length - mostrar.length
  const texto = mostrar.length > 1 ? `${mostrar.slice(0, -1).join(', ')} e ${mostrar.at(-1)}` : (mostrar[0] ?? '')
  return resto > 0 ? `${texto} e mais ${resto}` : texto
}

/** Frases para o aluno: o que estava no lugar errado, o que faltou e o que sobrou. */
export function explicarPartes(partes: Parte[], porLinha: boolean): string[] {
  const frases: string[] = []
  const trocas: [string, string][] = []
  const faltou: string[] = []
  const sobrou: string[] = []
  // Um bloco de "faltou" seguido de "sobrou" do mesmo tamanho é uma troca: onde era X, veio Y.
  for (let k = 0; k < partes.length; ) {
    if (partes[k]!.tipo === 'igual') {
      k++
      continue
    }
    const f: string[] = []
    const s: string[] = []
    while (k < partes.length && partes[k]!.tipo !== 'igual') {
      const p = partes[k++]!
      ;(p.tipo === 'faltou' ? f : s).push(p.valor)
    }
    if (f.length === s.length) f.forEach((v, i) => trocas.push([v, s[i]!]))
    else {
      faltou.push(...f)
      sobrou.push(...s)
    }
  }
  const unidade = porLinha ? 'linha' : 'valor'
  for (const [era, veio] of trocas.slice(0, LIMITE_NA_FRASE)) {
    frases.push(porLinha ? `Onde era ${listar([era], true)}, o seu programa mostrou ${listar([veio], true)}.` : `Onde era ${era}, o seu programa mostrou ${veio}.`)
  }
  if (trocas.length > LIMITE_NA_FRASE) frases.push(`E mais ${trocas.length - LIMITE_NA_FRASE} ${unidade === 'linha' ? 'linhas trocadas' : 'valores trocados'}.`)
  if (faltou.length > 0) frases.push(`Faltou: ${listar(faltou, porLinha)}.`)
  if (sobrou.length > 0) frases.push(`Sobrou: ${listar(sobrou, porLinha)}.`)
  return frases
}

/**
 * Diferença de um teste visível (com a saída esperada). Devolve null nos
 * testes ocultos, que nunca mostram a resposta.
 */
export function diferencaDoTeste(teste: TesteDoAluno, saida: string): Diferenca | null {
  if (teste.saida_esperada === null) return null
  if (teste.conferencia === 'exato') {
    const esperado = normalizarSaida(teste.saida_esperada).split('\n')
    const obtido = normalizarSaida(saida).split('\n')
    const partes = compararListas(esperado, obtido)
    const frases = explicarPartes(partes, true)
    // Mesmas linhas, mas não bateu: só pode ser diferença que a vista não pega.
    if (frases.length === 0) frases.push('As linhas parecem iguais. Confira espaços no começo das linhas e letras parecidas.')
    else frases.push(...dicasDoTextoExato(esperado, obtido))
    return { partes, frases, porLinha: true }
  }
  const esperado = valoresConferidos(teste.saida_esperada, teste.entrada, teste.palavras, teste.conferencia)
  const obtido = valoresConferidos(saida, teste.entrada, teste.palavras, teste.conferencia)
  const partes = compararListas(esperado, obtido)
  const frases = explicarPartes(partes, false)
  if (obtido.length === 0 && esperado.length > 0) frases.unshift('O seu programa não mostrou nenhum dos valores que contam.')
  return { partes, frases, porLinha: false }
}

/** No modo exato, avisa das diferenças que mais confundem: maiúsculas, acentos e espaços. */
function dicasDoTextoExato(esperado: string[], obtido: string[]): string[] {
  const simples = (l: string) =>
    l
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  const iguaisNoSimples = esperado.length === obtido.length && esperado.every((l, i) => simples(l) === simples(obtido[i]!))
  return iguaisNoSimples ? ['O texto é quase igual: neste exercício maiúsculas, acentos e espaços também contam.'] : []
}
