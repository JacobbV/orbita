// Correção dos testes no navegador. A normalização é a mesma do banco
// (privado.normalizar_saida): quebras de linha do Windows viram \n, espaços no
// fim das linhas e linhas vazias no fim não contam.

export interface TesteDoAluno {
  id: number
  tipo: 'visivel' | 'oculto'
  entrada: string
  /** Só nos visíveis. Nos ocultos vem null e vale a impressão digital. */
  saida_esperada: string | null
  saida_hash: string
}

export function normalizarSaida(texto: string): string {
  return texto.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '')
}

/** SHA-256 (hexadecimal) da saída normalizada. */
export async function impressaoDigital(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizarSaida(texto))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function saidaConfere(teste: Pick<TesteDoAluno, 'saida_esperada' | 'saida_hash'>, saida: string): Promise<boolean> {
  if (teste.saida_esperada !== null) return normalizarSaida(saida) === normalizarSaida(teste.saida_esperada)
  return (await impressaoDigital(saida)) === teste.saida_hash
}
