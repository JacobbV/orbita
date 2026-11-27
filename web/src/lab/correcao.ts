// Correção dos testes no navegador. As regras são as mesmas do banco
// (privado.normalizar_saida e privado.forma_conferida, migration
// 20261127000500): o que o site calcula aqui tem de dar o mesmo resultado lá,
// porque os testes ocultos chegam ao aluno só como impressão digital.
//
// Três jeitos de conferir, escolhidos pelo professor em cada exercício:
// * valores (padrão): contam os números e as palavras que vieram da entrada do
//   teste (mais as palavras que o professor marcou), na ordem. O texto que o
//   aluno escreve em volta ("Lista de nomes:", "Resultado") não conta.
// * texto: contam todas as palavras e números, na ordem.
// * exato: a saída tem de ser igual, linha por linha.
// Nos dois primeiros, maiúsculas, acentos, espaços, aspas, colchetes, vírgulas
// e dois-pontos não contam, e 12.0 vale o mesmo que 12.

export type ModoDeConferencia = 'valores' | 'texto' | 'exato'

export const MODOS_DE_CONFERENCIA: ModoDeConferencia[] = ['valores', 'texto', 'exato']

export const NOME_DO_MODO: Record<ModoDeConferencia, string> = {
  valores: 'Só os valores',
  texto: 'Texto flexível',
  exato: 'Texto exato',
}

export const EXPLICACAO_DO_MODO: Record<ModoDeConferencia, string> = {
  valores:
    'Contam os números e as palavras que vieram da entrada do teste, na ordem. O texto que o aluno escreve em volta, as aspas, os colchetes, as maiúsculas e os acentos não contam.',
  texto: 'Contam todas as palavras e números, na ordem. Maiúsculas, acentos, espaços, aspas, colchetes, vírgulas e dois-pontos não contam.',
  exato: 'A saída tem de ser igual à esperada, linha por linha. Só os espaços no fim das linhas e as linhas vazias no fim não contam.',
}

/** Explicação curta para o aluno, na tela do exercício. */
export const COMO_CONFERE_PARA_O_ALUNO: Record<ModoDeConferencia, string> = {
  valores:
    'O site confere os valores que o seu programa mostra: os números e os nomes que vieram da entrada, na ordem. O texto que você escreve em volta, as aspas, os colchetes, as maiúsculas e os acentos não contam.',
  texto:
    'O site confere as palavras e os números que o seu programa mostra, na ordem. Maiúsculas, acentos, espaços, aspas, colchetes, vírgulas e dois-pontos não contam.',
  exato: 'Neste exercício a saída tem de ser exatamente igual à esperada, letra por letra.',
}

export interface TesteDoAluno {
  id: number
  tipo: 'visivel' | 'oculto'
  entrada: string
  /** Só nos visíveis. Nos ocultos vem null e vale a impressão digital. */
  saida_esperada: string | null
  saida_hash: string
  /** Jeito de conferir que vale para este teste (já resolvido pelo banco). */
  conferencia: ModoDeConferencia
  /** Palavras extras que o professor marcou no exercício. */
  palavras: string
}

/** Regra do exercício: o modo escolhido pelo professor e as palavras extras. */
export interface RegraDeConferencia {
  modo: ModoDeConferencia
  palavras: string
}

export const REGRA_PADRAO: RegraDeConferencia = { modo: 'valores', palavras: '' }

export function lerModo(valor: unknown): ModoDeConferencia {
  return valor === 'texto' || valor === 'exato' ? valor : 'valores'
}

/** Modo exato: quebras do Windows viram \n, sem espaços no fim das linhas e sem linhas vazias no fim. */
export function normalizarSaida(texto: string): string {
  return texto.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '')
}

// Letras com acento e maiúsculas viram minúsculas sem acento. A mesma tabela
// está no banco (privado.sem_acentos), na mesma ordem.
export const LETRAS_COM_ACENTO = 'áàâãäåāéèêëēíìîïīóòôõöōúùûüūçñýÿÁÀÂÃÄÅĀÉÈÊËĒÍÌÎÏĪÓÒÔÕÖŌÚÙÛÜŪÇÑÝABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const LETRAS_SEM_ACENTO = 'aaaaaaaeeeeeiiiiioooooouuuuucnyyaaaaaaaeeeeeiiiiioooooouuuuucnyabcdefghijklmnopqrstuvwxyz'

const TROCA = new Map<string, string>()
for (let i = 0; i < LETRAS_COM_ACENTO.length; i++) TROCA.set(LETRAS_COM_ACENTO[i]!, LETRAS_SEM_ACENTO[i]!)

function semAcentos(texto: string): string {
  let saida = ''
  for (const c of texto.normalize('NFC')) saida += TROCA.get(c) ?? c
  return saida
}

/** 12.50 → 12.5; 12.0 → 12. */
function normalizarNumero(n: string): string {
  return n.includes('.') ? n.replace(/0+$/, '').replace(/\.$/, '') : n
}

/**
 * Palavras e números do texto, na ordem, sem maiúsculas nem acentos. Todo o
 * resto (espaços, aspas, colchetes, vírgulas, dois-pontos…) só separa.
 */
export function fichas(texto: string): string[] {
  const achadas = semAcentos(texto).match(/-?[0-9]+(?:\.[0-9]+)?|[a-z]+/g) ?? []
  return achadas.map((f) => (/^[a-z]/.test(f) ? f : normalizarNumero(f)))
}

const ehNumero = (f: string) => !/^[a-z]/.test(f)

function palavrasQueContam(entrada: string, palavras: string): Set<string> {
  return new Set([...fichas(entrada), ...fichas(palavras)].filter((f) => !ehNumero(f)))
}

function soOsValores(texto: string, entrada: string, palavras: string): string[] {
  const contam = palavrasQueContam(entrada, palavras)
  return fichas(texto).filter((f) => ehNumero(f) || contam.has(f))
}

/**
 * Modo que vale para um teste. No modo "valores", quando a saída esperada não
 * tem nenhum número nem palavra da entrada (ex.: só imprime "Olá, mundo!"),
 * vale o texto flexível, senão qualquer saída passaria.
 */
export function modoDoTeste(esperada: string, entrada: string, regra: RegraDeConferencia): ModoDeConferencia {
  if (regra.modo !== 'valores') return regra.modo
  return soOsValores(esperada, entrada, regra.palavras).length > 0 ? 'valores' : 'texto'
}

/** O que de fato é comparado, no modo já resolvido para o teste. */
export function formaConferida(texto: string, entrada: string, palavras: string, modo: ModoDeConferencia): string {
  if (modo === 'exato') return normalizarSaida(texto)
  return (modo === 'valores' ? soOsValores(texto, entrada, palavras) : fichas(texto)).join(' ')
}

/** Lista do que conta na saída, para mostrar ao aluno e ao professor. */
export function valoresConferidos(texto: string, entrada: string, palavras: string, modo: ModoDeConferencia): string[] {
  if (modo === 'exato') return []
  return modo === 'valores' ? soOsValores(texto, entrada, palavras) : fichas(texto)
}

async function sha256(texto: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** SHA-256 (hexadecimal) da saída no modo exato. */
export async function impressaoDigital(texto: string): Promise<string> {
  return sha256(normalizarSaida(texto))
}

/** SHA-256 (hexadecimal) do que é comparado, no modo já resolvido para o teste. */
export async function impressaoDigitalConferida(
  texto: string,
  entrada: string,
  palavras: string,
  modo: ModoDeConferencia,
): Promise<string> {
  return sha256(formaConferida(texto, entrada, palavras, modo))
}

/** Compara duas saídas com a regra do exercício (professor, que tem a saída esperada de todos os testes). */
export function saidasConferem(saida: string, esperada: string, entrada: string, regra: RegraDeConferencia): boolean {
  const modo = modoDoTeste(esperada, entrada, regra)
  return formaConferida(saida, entrada, regra.palavras, modo) === formaConferida(esperada, entrada, regra.palavras, modo)
}

/** Teste do aluno: visível compara a saída; oculto compara a impressão digital. */
export async function saidaConfere(
  teste: Pick<TesteDoAluno, 'saida_esperada' | 'saida_hash' | 'entrada'> & Partial<Pick<TesteDoAluno, 'conferencia' | 'palavras'>>,
  saida: string,
): Promise<boolean> {
  const modo = teste.conferencia ?? 'exato'
  const palavras = teste.palavras ?? ''
  if (teste.saida_esperada !== null) {
    return formaConferida(saida, teste.entrada, palavras, modo) === formaConferida(teste.saida_esperada, teste.entrada, palavras, modo)
  }
  return (await impressaoDigitalConferida(saida, teste.entrada, palavras, modo)) === teste.saida_hash
}

/** Modo do exercício visto pelo aluno, a partir dos testes que chegaram. */
export function modoDoExercicio(testes: Pick<TesteDoAluno, 'conferencia'>[]): ModoDeConferencia | null {
  if (testes.length === 0) return null
  if (testes.some((t) => t.conferencia === 'exato')) return 'exato'
  return testes.some((t) => t.conferencia === 'valores') ? 'valores' : 'texto'
}
