import { useEffect, useState } from 'react'
import { PECAS, type Camada, type Escolhas, type Peca } from '../arte/avatar'
import { Aviso } from '../components/Aviso'
import { Moeda, Moedas } from '../components/Moeda'
import {
  XP_POR_MOEDA,
  carregarMeusMovimentos,
  comprarPeca,
  moedasPossiveis,
  situacaoDaPeca,
  trocarXpPorMoedas,
  type Loja,
  type MovimentoDeMoedas,
} from '../lib/loja'
import { mensagemDeErro } from '../lib/erros'
import { OpcaoPeca } from '../components/OpcaoPeca'

const TITULOS: Partial<Record<Camada, string>> = {
  pele: 'Pele',
  rosto: 'Expressão',
  cabelo: 'Cabelo',
  'cor-do-cabelo': 'Cor do cabelo',
  roupa: 'Roupa',
  'parte-de-baixo': 'Parte de baixo',
  pes: 'Pés',
  'acessorio-cabeca': 'Acessório de cabeça',
  'acessorio-rosto': 'Acessório de rosto',
  'acessorio-corpo': 'Acessório de corpo',
}

/** Para o quadradinho: cor do cabelo e pele aparecem melhor na cabeça. */
const CAMADA_DO_RECORTE: Partial<Record<Camada, Camada>> = { 'cor-do-cabelo': 'cabelo', pele: 'rosto' }

interface Props {
  loja: Loja
  escolhas: Escolhas
  aoMudarLoja: (l: Loja) => void
  aoExperimentar: (p: Peca) => void
}

/** Aba Loja do Hangar: saldo, peças à venda (clicar experimenta; a compra fica ao lado do boneco) e troca de XP. */
export function LojaDoHangar({ loja, escolhas, aoMudarLoja, aoExperimentar }: Props) {
  const [movimentos, setMovimentos] = useState<MovimentoDeMoedas[] | null>(null)

  useEffect(() => {
    let ativo = true
    carregarMeusMovimentos(8).then(
      (m) => ativo && setMovimentos(m),
      () => ativo && setMovimentos([]),
    )
    return () => {
      ativo = false
    }
  }, [loja.moedas])

  // Só as peças que estão à venda (e as que o aluno já comprou), por grupo.
  const aVenda = PECAS.filter((p) => {
    const l = loja.pecas.get(p.id)
    return l?.preco != null && (l.naLoja || loja.compradas.has(p.id)) && p.para !== 'professor'
  }).sort((a, b) => (loja.pecas.get(a.id)?.preco ?? 0) - (loja.pecas.get(b.id)?.preco ?? 0))
  const grupos = Object.entries(TITULOS)
    .map(([camada, titulo]) => ({ camada: camada as Camada, titulo, pecas: aVenda.filter((p) => p.camada === camada) }))
    .filter((g) => g.pecas.length > 0)

  function experimentar(p: Peca) {
    aoExperimentar(p)
  }

  return (
    <div className="loja">
      <section className="loja-saldo" aria-labelledby="loja-titulo">
        <h2 id="loja-titulo" className="hangar-grupo-titulo">
          Loja da nave
        </h2>
        <p className="loja-saldo-valor">
          <Moeda tamanho={30} />
          <span>
            <strong>{loja.moedas}</strong> {loja.moedas === 1 ? 'moeda' : 'moedas'}
          </span>
        </p>
        <p className="loja-regras">
          Toque numa peça para experimentar no boneco. O botão de comprar aparece ao lado dele. Moedas vêm de nota máxima na prova, de acertar todos os exercícios de uma aula ou unidade, do professor na
          sala e da troca de XP. São só da nave: não valem dinheiro e não dá para comprar moedas.
        </p>
      </section>

      {grupos.length === 0 ? (
        <p className="loja-vazia">Nenhuma peça à venda agora. Volte depois!</p>
      ) : (
        grupos.map((g) => (
          <div key={g.camada} className="hangar-grupo">
            <h3 className="hangar-grupo-titulo">{g.titulo}</h3>
            <div className="hangar-grade">
              {g.pecas.map((p) => (
                <OpcaoPeca
                  key={p.id}
                  nome={loja.compradas.has(p.id) ? `${p.nome} (sua)` : p.nome}
                  escolhida={escolhas[p.camada] === p.id}
                  situacao={situacaoDaPeca(p.id, loja, p.xpMinimo)}
                  aoEscolher={() => experimentar(p)}
                  previa={{ ...escolhas, [p.camada]: p.id }}
                  camada={CAMADA_DO_RECORTE[p.camada] ?? p.camada}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <TrocaDeXp loja={loja} aoMudarLoja={aoMudarLoja} />

      <section className="loja-movimentos" aria-labelledby="loja-movimentos-titulo">
        <h3 id="loja-movimentos-titulo" className="hangar-grupo-titulo">
          Últimas moedas
        </h3>
        {movimentos === null ? (
          <p className="loja-vazia">Carregando…</p>
        ) : movimentos.length === 0 ? (
          <p className="loja-vazia">Nenhuma moeda ainda.</p>
        ) : (
          <ul role="list">
            {movimentos.map((m, i) => (
              <li key={i} className="loja-movimento">
                <span className={m.quantidade > 0 ? 'loja-ganho' : 'loja-perda'}>
                  {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}
                </span>
                <span>{m.descricao}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/** Troca opcional: 50 XP por moeda. O XP trocado sai do total. */
function TrocaDeXp({ loja, aoMudarLoja }: { loja: Loja; aoMudarLoja: (l: Loja) => void }) {
  const maximo = moedasPossiveis(loja.xp)
  const [quantas, setQuantas] = useState(1)
  const [confirmando, setConfirmando] = useState(false)
  const [trocando, setTrocando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const n = Math.min(Math.max(1, quantas), Math.max(1, maximo))
  const xpDepois = loja.xp - n * XP_POR_MOEDA
  const desce = xpDepois < loja.xpDaPatente

  async function trocar() {
    setTrocando(true)
    setAviso(null)
    try {
      const r = await trocarXpPorMoedas(n)
      aoMudarLoja({ ...loja, moedas: r.moedas, xp: r.xp, patente: r.patente })
      setAviso({ tipo: 'sucesso', texto: `Pronto: +${n} ${n === 1 ? 'moeda' : 'moedas'}. Agora você tem ${r.xp} XP.` })
      setConfirmando(false)
      setQuantas(1)
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) })
    } finally {
      setTrocando(false)
    }
  }

  return (
    <section className="loja-troca" aria-labelledby="loja-troca-titulo">
      <h3 id="loja-troca-titulo" className="hangar-grupo-titulo">
        Trocar XP por moedas
      </h3>
      <p className="loja-regras">
        Cada moeda custa {XP_POR_MOEDA} XP. O XP trocado sai do seu total, e a sua patente pode descer. Só troque se
        quiser muito alguma peça.
      </p>
      {maximo === 0 ? (
        <p className="loja-falta">Você precisa de pelo menos {XP_POR_MOEDA} XP para trocar.</p>
      ) : confirmando ? (
        <div className="loja-confirmar" role="alertdialog" aria-labelledby="loja-troca-confirmar">
          <p id="loja-troca-confirmar">
            Trocar {n * XP_POR_MOEDA} XP por {n} {n === 1 ? 'moeda' : 'moedas'}? Você fica com {xpDepois} XP
            {desce ? ' e volta de patente' : ''}.
          </p>
          <div className="loja-botoes">
            <button type="button" className="botao botao-primario" onClick={() => void trocar()} disabled={trocando}>
              {trocando ? 'Trocando…' : 'Sim, trocar'}
            </button>
            <button type="button" className="botao" onClick={() => setConfirmando(false)} disabled={trocando}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="loja-troca-form">
          <label htmlFor="loja-quantas">Quantas moedas</label>
          <input
            id="loja-quantas"
            type="number"
            inputMode="numeric"
            min={1}
            max={maximo}
            value={quantas}
            onChange={(e) => setQuantas(Number(e.target.value) || 1)}
          />
          <button type="button" className="botao" onClick={() => setConfirmando(true)}>
            Trocar {n * XP_POR_MOEDA} XP
          </button>
        </div>
      )}
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
    </section>
  )
}

/** Ao lado do boneco: comprar a peça da loja que o aluno está experimentando. */
export function CompraDaPeca({ peca, loja, aoComprar }: { peca: Peca; loja: Loja; aoComprar: (moedas: number) => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const [comprando, setComprando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const linha = loja.pecas.get(peca.id)
  const preco = linha?.preco ?? 0
  const faltam = preco - loja.moedas

  async function comprar() {
    setComprando(true)
    setErro(null)
    try {
      aoComprar(await comprarPeca(peca.id))
    } catch (e) {
      setErro(mensagemDeErro(e))
      setComprando(false)
    }
  }

  return (
    <div className="loja-escolhida" aria-live="polite">
      <p>
        <strong>{peca.nome}</strong> · <Moedas quantidade={preco} />
      </p>
      {confirmando ? (
        <div className="loja-confirmar" role="alertdialog" aria-labelledby={`comprar-${peca.id}`}>
          <p id={`comprar-${peca.id}`}>
            Comprar {peca.nome} por {preco} moedas? Sobram {loja.moedas - preco}.
          </p>
          <div className="loja-botoes">
            <button type="button" className="botao botao-primario" onClick={() => void comprar()} disabled={comprando}>
              {comprando ? 'Comprando…' : 'Sim, comprar'}
            </button>
            <button type="button" className="botao" onClick={() => setConfirmando(false)} disabled={comprando}>
              Cancelar
            </button>
          </div>
        </div>
      ) : faltam > 0 ? (
        <p className="loja-falta">Faltam {faltam} moedas. Continue estudando!</p>
      ) : (
        <button type="button" className="botao botao-primario" onClick={() => setConfirmando(true)}>
          Comprar por {preco} moedas
        </button>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </div>
  )
}
