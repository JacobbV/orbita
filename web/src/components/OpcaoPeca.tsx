import { recorteDaCamada, type Camada, type Escolhas } from '../arte/avatar'
import type { SituacaoDaPeca } from '../lib/loja'
import { Avatar } from './Avatar'
import { Moeda } from './Moeda'

/** Quadradinho de uma peça do Hangar (e da Loja), com cadeado de XP ou preço. */
export function OpcaoPeca({
  nome,
  escolhida,
  situacao = { tipo: 'livre' },
  aoEscolher,
  previa,
  camada,
}: {
  nome: string
  escolhida: boolean
  situacao?: SituacaoDaPeca
  aoEscolher: () => void
  previa: Partial<Record<string, string | undefined>>
  camada: Camada
}) {
  const limpa: Escolhas = Object.fromEntries(Object.entries(previa).filter(([, v]) => v)) as Escolhas
  // O quadradinho mostra só a parte que muda: a cabeça, o tronco, as pernas ou os pés.
  const recorte = recorteDaCamada(camada, limpa)
  const trancada = situacao.tipo === 'xp'
  return (
    <button
      type="button"
      className={`hangar-opcao${escolhida ? ' hangar-opcao-escolhida' : ''}${trancada ? ' hangar-opcao-trancada' : ''}`}
      aria-pressed={escolhida}
      disabled={trancada}
      onClick={aoEscolher}
    >
      <span className="hangar-opcao-desenho">
        <Avatar escolhas={limpa} tamanho={recorte ? 72 : 56} rotulo="" recorte={recorte} />
      </span>
      <span className="hangar-opcao-nome">{nome}</span>
      {situacao.tipo === 'xp' && <span className="hangar-opcao-cadeado">🔒 {situacao.xp} XP</span>}
      {situacao.tipo === 'loja' && (
        <span className="hangar-opcao-preco">
          <Moeda tamanho={12} /> {situacao.preco}
        </span>
      )}
    </button>
  )
}

