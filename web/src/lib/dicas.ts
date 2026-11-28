// Dicas do exercício: o aluno libera uma dica a cada ERROS_POR_DICA tentativas
// erradas no Rodar e abre quando quiser, uma de cada vez, na ordem. A contagem
// fica no navegador (como o rascunho do código): o Rodar acontece só ali.

export const ERROS_POR_DICA = 2
export const MAX_DICAS = 3
export const MAX_LETRAS_DA_DICA = 1000

const chaveErros = (id: number) => `orbita:tentativas-erradas:${id}`
const chaveAbertas = (id: number) => `orbita:dicas-abertas:${id}`

function ler(chave: string): number {
  try {
    const n = Number(localStorage.getItem(chave) ?? 0)
    return Number.isInteger(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

function gravar(chave: string, n: number) {
  try {
    localStorage.setItem(chave, String(n))
  } catch {
    // Sem armazenamento (aba anônima etc.): a contagem vale só enquanto a página está aberta.
  }
}

export const lerTentativasErradas = (exercicioId: number) => ler(chaveErros(exercicioId))
export const guardarTentativasErradas = (exercicioId: number, n: number) => gravar(chaveErros(exercicioId), n)
export const lerDicasAbertas = (exercicioId: number) => ler(chaveAbertas(exercicioId))
export const guardarDicasAbertas = (exercicioId: number, n: number) => gravar(chaveAbertas(exercicioId), n)

/** Quantas dicas já podem ser abertas com este número de tentativas erradas. */
export function dicasLiberadas(tentativasErradas: number, total: number): number {
  return Math.min(total, Math.floor(tentativasErradas / ERROS_POR_DICA))
}

/** Quantas tentativas erradas faltam para a próxima dica (0 quando já está liberada ou não há mais). */
export function faltamParaProxima(tentativasErradas: number, total: number): number {
  const liberadas = dicasLiberadas(tentativasErradas, total)
  if (liberadas >= total) return 0
  return (liberadas + 1) * ERROS_POR_DICA - tentativasErradas
}

/** Dicas do formulário do professor: sem as vazias, sem espaços nas pontas. */
export function limparDicas(dicas: string[]): string[] {
  return dicas.map((d) => d.trim()).filter((d) => d.length > 0)
}
