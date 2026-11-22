import type { Pedido, Perfil, StatusPedido } from './api'
import { MAX_TENTATIVAS_POR_TURMA } from './api'

/** Para onde mandar a pessoa depois de entrar. */
export function rotaInicial(perfil: Pick<Perfil, 'papel'> | null, pedidos: Array<{ status: StatusPedido }>): string {
  if (!perfil) return '/entrar'
  if (perfil.papel === 'professor') return '/professor'
  if (pedidos.some((p) => p.status === 'aprovado')) return '/ponte'
  return '/aguardando'
}

/**
 * Resumo por turma + disciplina: o pedido mais recente de cada uma e quantas
 * tentativas ainda restam. Usado na tela "Aguardando aprovação".
 */
export interface SituacaoOferta {
  pedido: Pedido
  tentativasUsadas: number
  podeTentarDeNovo: boolean
}

export function situacoesPorOferta(pedidos: Pedido[]): SituacaoOferta[] {
  const porOferta = new Map<number, Pedido[]>()
  for (const p of pedidos) {
    const lista = porOferta.get(p.oferta.id) ?? []
    lista.push(p)
    porOferta.set(p.oferta.id, lista)
  }
  // Disciplinas que já têm pedido pendente ou aprovado (em qualquer turma).
  const disciplinasAtivas = new Set(
    pedidos.filter((p) => p.status !== 'recusado').map((p) => p.oferta.disciplina.id),
  )
  const situacoes: SituacaoOferta[] = []
  for (const lista of porOferta.values()) {
    const maisRecente = lista.reduce((a, b) => (b.tentativa > a.tentativa ? b : a))
    const usadas = lista.length
    situacoes.push({
      pedido: maisRecente,
      tentativasUsadas: usadas,
      podeTentarDeNovo:
        maisRecente.status === 'recusado' &&
        usadas < MAX_TENTATIVAS_POR_TURMA &&
        !disciplinasAtivas.has(maisRecente.oferta.disciplina.id),
    })
  }
  const ordem: Record<StatusPedido, number> = { aprovado: 0, pendente: 1, recusado: 2 }
  return situacoes.sort(
    (a, b) =>
      ordem[a.pedido.status] - ordem[b.pedido.status] ||
      a.pedido.oferta.disciplina.nome.localeCompare(b.pedido.oferta.disciplina.nome, 'pt-BR'),
  )
}
