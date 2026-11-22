import { useEffect, useMemo, useState } from 'react'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { MAX_TENTATIVAS_POR_TURMA, nomeTurno, type StatusPedido } from '../../lib/api'
import { mensagemDeErro } from '../../lib/erros'
import {
  agruparPorOferta,
  aprovarTodos,
  decidirPedido,
  listarPedidos,
  type GrupoDePedidos,
  type PedidoDoPainel,
} from '../../lib/professor'

const FILTROS: Array<{ status: StatusPedido; rotulo: string }> = [
  { status: 'pendente', rotulo: 'Aguardando' },
  { status: 'aprovado', rotulo: 'Aprovados' },
  { status: 'recusado', rotulo: 'Recusados' },
]

const MOTIVO_MAX = 300

const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function Pedidos() {
  const [pedidos, setPedidos] = useState<PedidoDoPainel[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [recado, setRecado] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<StatusPedido>('pendente')
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    listarPedidos()
      .then((p) => {
        if (!ativo) return
        setPedidos(p)
        setErro(null)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [versao])

  const contagem = useMemo(() => {
    const c: Record<StatusPedido, number> = { pendente: 0, aprovado: 0, recusado: 0 }
    for (const p of pedidos ?? []) c[p.status] += 1
    return c
  }, [pedidos])

  const grupos = useMemo(
    () => agruparPorOferta((pedidos ?? []).filter((p) => p.status === filtro)),
    [pedidos, filtro],
  )

  if (!pedidos && !erro) return <Carregando />

  function depoisDeDecidir(texto: string) {
    setRecado(texto)
    setVersao((v) => v + 1)
  }

  return (
    <section className="painel-secao" aria-labelledby="pedidos-titulo">
      <div className="painel-secao-topo">
        <h2 id="pedidos-titulo">Pedidos de acesso</h2>
        <div className="painel-filtros" role="group" aria-label="Mostrar pedidos">
          {FILTROS.map((f) => (
            <button
              key={f.status}
              type="button"
              className={`botao painel-filtro${filtro === f.status ? ' painel-filtro-atual' : ''}`}
              aria-pressed={filtro === f.status}
              onClick={() => setFiltro(f.status)}
            >
              {f.rotulo} ({contagem[f.status]})
            </button>
          ))}
        </div>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {recado && <Aviso tipo="sucesso">{recado}</Aviso>}

      {grupos.length === 0 ? (
        <p className="painel-vazio">
          {filtro === 'pendente' ? 'Nenhum pedido aguardando. Tudo em dia.' : 'Nenhum pedido aqui.'}
        </p>
      ) : (
        grupos.map((g) => (
          <GrupoOferta key={g.oferta.id} grupo={g} aoDecidir={depoisDeDecidir} aoErrar={setErro} />
        ))
      )}
    </section>
  )
}

function GrupoOferta({
  grupo,
  aoDecidir,
  aoErrar,
}: {
  grupo: GrupoDePedidos
  aoDecidir: (texto: string) => void
  aoErrar: (texto: string) => void
}) {
  const { oferta, pedidos } = grupo
  const pendentes = pedidos.filter((p) => p.status === 'pendente').length
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const idTitulo = `grupo-${oferta.id}`

  async function aprovarTodosDaTurma() {
    setOcupado(true)
    try {
      const total = await aprovarTodos(oferta.id)
      aoDecidir(`${total} ${total === 1 ? 'pedido aprovado' : 'pedidos aprovados'} em ${oferta.disciplina.nome}, ${oferta.turma.nome}.`)
    } catch (e) {
      aoErrar(mensagemDeErro(e))
    } finally {
      setOcupado(false)
      setConfirmando(false)
    }
  }

  return (
    <section className="painel-grupo" aria-labelledby={idTitulo}>
      <div className="painel-grupo-topo">
        <div>
          <h3 id={idTitulo}>{oferta.disciplina.nome}</h3>
          <p className="painel-grupo-turma">
            {oferta.turma.nome} · {nomeTurno(oferta.turma.turno)} · {oferta.turma.anoLetivo}
          </p>
        </div>
        {pendentes > 1 &&
          (confirmando ? (
            <div className="painel-confirmar">
              <p>Aprovar os {pendentes} pedidos desta turma?</p>
              <div className="painel-botoes">
                <button type="button" className="botao botao-primario" disabled={ocupado} onClick={aprovarTodosDaTurma}>
                  Sim, aprovar {pendentes}
                </button>
                <button type="button" className="botao" disabled={ocupado} onClick={() => setConfirmando(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="botao" onClick={() => setConfirmando(true)}>
              Aprovar todos ({pendentes})
            </button>
          ))}
      </div>
      <ul className="painel-lista" role="list">
        {pedidos.map((p) => (
          <CartaoPedido key={p.id} pedido={p} aoDecidir={aoDecidir} aoErrar={aoErrar} />
        ))}
      </ul>
    </section>
  )
}

function CartaoPedido({
  pedido,
  aoDecidir,
  aoErrar,
}: {
  pedido: PedidoDoPainel
  aoDecidir: (texto: string) => void
  aoErrar: (texto: string) => void
}) {
  const [recusando, setRecusando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const idMotivo = `motivo-${pedido.id}`

  async function decidir(aprovar: boolean) {
    setOcupado(true)
    try {
      await decidirPedido(pedido.id, aprovar, aprovar ? undefined : motivo)
      aoDecidir(`Pedido de ${pedido.aluno.nome} ${aprovar ? 'aprovado' : 'recusado'}.`)
    } catch (e) {
      aoErrar(mensagemDeErro(e))
      setOcupado(false)
    }
  }

  return (
    <li className="cartao painel-pedido">
      <div className="painel-pedido-topo">
        <div className="painel-pedido-quem">
          <p className="painel-pedido-nome">
            {pedido.aluno.nome}
            {pedido.aluno.apelido && <span className="painel-pedido-apelido"> · {pedido.aluno.apelido}</span>}
          </p>
          <p className="painel-pedido-email">{pedido.aluno.email}</p>
        </div>
        <p className="painel-pedido-data">
          {pedido.tentativa > 1 && (
            <span className="painel-etiqueta">
              Tentativa {pedido.tentativa} de {MAX_TENTATIVAS_POR_TURMA}
            </span>
          )}
          <span>Pedido em {formatoData.format(new Date(pedido.criadoEm))}</span>
        </p>
      </div>

      <blockquote className="painel-quem-e-voce">
        <p className="painel-rotulo">Quem é você</p>
        <p>{pedido.quemEVoce}</p>
      </blockquote>

      {pedido.status === 'recusado' && (
        <p className="painel-motivo">
          <strong>Motivo da recusa:</strong> {pedido.motivoRecusa ?? 'sem motivo informado'}
        </p>
      )}
      {pedido.status !== 'pendente' && pedido.decididoEm && (
        <p className="painel-decidido">
          {pedido.status === 'aprovado' ? 'Aprovado' : 'Recusado'} em {formatoData.format(new Date(pedido.decididoEm))}
        </p>
      )}

      {pedido.status === 'pendente' &&
        (recusando ? (
          <div className="painel-recusa">
            <div className="campo">
              <label htmlFor={idMotivo}>Motivo da recusa (opcional)</label>
              <textarea
                id={idMotivo}
                rows={2}
                maxLength={MOTIVO_MAX}
                value={motivo}
                aria-describedby={`${idMotivo}-dica`}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <p id={`${idMotivo}-dica`} className="campo-dica">
                O aluno vê este texto e pode pedir de novo até {MAX_TENTATIVAS_POR_TURMA} vezes por turma.
              </p>
            </div>
            <div className="painel-botoes">
              <button type="button" className="botao painel-botao-perigo" disabled={ocupado} onClick={() => decidir(false)}>
                Confirmar recusa
              </button>
              <button type="button" className="botao" disabled={ocupado} onClick={() => setRecusando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="painel-botoes">
            <button type="button" className="botao botao-primario" disabled={ocupado} onClick={() => decidir(true)}>
              Aprovar
            </button>
            <button type="button" className="botao" disabled={ocupado} onClick={() => setRecusando(true)}>
              Recusar
            </button>
          </div>
        ))}
    </li>
  )
}
