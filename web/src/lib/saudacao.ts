// Saudação do topo das telas ("Olá, Ana."). Usa o primeiro nome, mas mantém
// junto o nome que vem depois de um título abreviado ("Prof. Jacó"), e não
// repete o ponto final quando o nome já termina com ponto.

/** "Ana Exemplo da Silva" → "Ana"; "Prof. Jacó" → "Prof. Jacó"; vazio → padrão. */
export function nomeDaSaudacao(nome: string | null | undefined, padrao: string): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  const [primeira, segunda] = partes
  if (!primeira) return padrao
  if (primeira.endsWith('.') && segunda) return `${primeira} ${segunda}`
  return primeira
}

/** "Olá, Ana." sem ponto duplicado: "Olá, Prof." em vez de "Olá, Prof..". */
export function saudacao(nome: string | null | undefined, padrao: string): string {
  const quem = nomeDaSaudacao(nome, padrao)
  return quem.endsWith('.') ? `Olá, ${quem}` : `Olá, ${quem}.`
}
