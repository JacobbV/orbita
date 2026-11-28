// Ordem das listas de alunos no painel do professor.

export type CriterioDeOrdem = 'nome' | 'xp'

export const CRITERIOS_DE_ORDEM: { id: CriterioDeOrdem; rotulo: string }[] = [
  { id: 'nome', rotulo: 'Nome' },
  { id: 'xp', rotulo: 'XP' },
]

const comparar = new Intl.Collator('pt-BR', { sensitivity: 'base' })

/** Nome em ordem alfabética (sem diferenciar acento ou maiúscula) ou XP do maior para o menor, desempatando pelo nome. */
export function ordenarAlunos<T extends { nome: string; xp: number }>(lista: readonly T[], criterio: CriterioDeOrdem): T[] {
  return [...lista].sort((a, b) =>
    criterio === 'xp' ? b.xp - a.xp || comparar.compare(a.nome, b.nome) : comparar.compare(a.nome, b.nome),
  )
}
