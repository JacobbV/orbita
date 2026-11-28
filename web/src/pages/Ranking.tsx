import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Aviso } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Carregando } from '../components/Carregando'
import { meusPedidos } from '../lib/api'
import { mensagemDeErro } from '../lib/erros'
import {
  carregarRanking,
  entrarNoRanking,
  minhaSituacaoNoRanking,
  NOME_DO_PERIODO,
  sairDoRanking,
  separarVoce,
  turmasAprovadas,
  type LinhaDoRanking,
  type PeriodoDoRanking,
  type SituacaoNoRanking,
} from '../lib/ranking'
import './Ranking.css'

const PERIODOS: PeriodoDoRanking[] = ['semana', 'geral']

/**
 * Ranking da turma por apelido. Só entra quem quiser, e sai quando quiser.
 * Cada aluno vê só a própria turma: apelido, boneco, patente e XP.
 */
export function Ranking() {
  const [turmas, setTurmas] = useState<Array<{ id: number; nome: string }> | null>(null)
  const [turmaId, setTurmaId] = useState<number | null>(null)
  const [situacao, setSituacao] = useState<SituacaoNoRanking | null>(null)
  const [periodo, setPeriodo] = useState<PeriodoDoRanking>('semana')
  const [linhas, setLinhas] = useState<LinhaDoRanking[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    let ativo = true
    Promise.all([meusPedidos(), minhaSituacaoNoRanking()])
      .then(([pedidos, s]) => {
        if (!ativo) return
        const lista = turmasAprovadas(pedidos)
        setTurmas(lista)
        setTurmaId(lista[0]?.id ?? null)
        setSituacao(s)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (turmaId === null) return
    let ativo = true
    carregarRanking(turmaId, periodo)
      .then((l) => {
        if (ativo) setLinhas(l)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [turmaId, periodo, situacao?.participando])

  const mudar = useCallback(async (acao: () => Promise<void>) => {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
      setSituacao(await minhaSituacaoNoRanking())
      setConfirmando(false)
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setOcupado(false)
    }
  }, [])

  if (erro && !situacao) {
    return (
      <div className="ranking container">
        <Aviso tipo="erro" titulo="Não foi possível abrir o ranking">
          {erro}
        </Aviso>
        <Link to="/ponte" className="botao">
          Voltar à ponte
        </Link>
      </div>
    )
  }
  if (!turmas || !situacao) return <Carregando />

  const turma = turmas.find((t) => t.id === turmaId)
  const dentro = situacao.participando
  const { top, voce } = separarVoce(linhas ?? [])

  return (
    <div className="ranking container">
      <header className="cartao ranking-topo">
        <div>
          <p className="pixel ranking-selo">Ranking</p>
          <h1>Ranking da tripulação</h1>
          <p className="ranking-intro">
            {turma ? `Turma ${turma.nome}. ` : ''}Só aparece quem escolheu entrar, e só pelo apelido. Você sai quando quiser.
          </p>
        </div>
        <Link to="/ponte" className="botao">
          Voltar à ponte
        </Link>
      </header>

      {erro && (
        <Aviso tipo="erro" titulo="Algo deu errado">
          {erro}
        </Aviso>
      )}

      {!turma ? (
        <p className="cartao ranking-vazio">O ranking abre depois que o professor aprovar seu pedido de acesso a uma turma.</p>
      ) : (
        <>
          <section className="cartao ranking-entrada" aria-label="Sua participação">
            {dentro ? (
              <>
                <p>
                  <strong>Você está no ranking.</strong> Os colegas da turma que também entraram veem seu apelido, seu boneco, sua
                  patente e seu XP.
                </p>
                {confirmando ? (
                  <div className="ranking-acoes">
                    <button type="button" className="botao botao-primario" disabled={ocupado} onClick={() => mudar(sairDoRanking)}>
                      Sim, sair do ranking
                    </button>
                    <button type="button" className="botao" disabled={ocupado} onClick={() => setConfirmando(false)}>
                      Continuar no ranking
                    </button>
                  </div>
                ) : (
                  <div className="ranking-acoes">
                    <button type="button" className="botao" onClick={() => setConfirmando(true)}>
                      Sair do ranking
                    </button>
                  </div>
                )}
              </>
            ) : !situacao.temApelido ? (
              <>
                <p>Para entrar no ranking você precisa de um apelido. Ele é sorteado, então ninguém sabe quem você é.</p>
                <div className="ranking-acoes">
                  <Link to="/ponte" className="botao botao-primario">
                    Sortear apelido na ponte
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p>
                  <strong>Você não está no ranking.</strong> Se entrar, seus colegas de turma vão ver seu apelido, seu boneco, sua
                  patente e seu XP. Seu nome e seu e-mail nunca aparecem. Você pode sair quando quiser.
                </p>
                <div className="ranking-acoes">
                  <button
                    type="button"
                    className="botao botao-primario"
                    disabled={ocupado || !situacao.podeEntrar}
                    onClick={() => mudar(entrarNoRanking)}
                  >
                    {ocupado ? 'Entrando…' : 'Entrar no ranking'}
                  </button>
                </div>
              </>
            )}
          </section>

          {turmas.length > 1 && (
            <label className="ranking-turma">
              Turma
              <select value={turmaId ?? ''} onChange={(e) => setTurmaId(Number(e.target.value))}>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="ranking-abas" role="group" aria-label="Período do ranking">
            {PERIODOS.map((p) => (
              <button
                key={p}
                type="button"
                className={`botao${p === periodo ? ' botao-primario' : ''}`}
                aria-pressed={p === periodo}
                onClick={() => setPeriodo(p)}
              >
                {NOME_DO_PERIODO[p]}
              </button>
            ))}
          </div>
          <p className="ranking-nota">
            {periodo === 'semana'
              ? 'XP ganho de segunda a domingo. Zera toda segunda-feira.'
              : 'Todo o XP já confirmado.'}{' '}
            XP que ainda está “a confirmar” não conta.
          </p>

          {!linhas ? (
            <Carregando />
          ) : top.length === 0 ? (
            <p className="cartao ranking-vazio">Ninguém da turma entrou no ranking ainda.</p>
          ) : (
            <ol className="ranking-lista" aria-label={`Ranking ${NOME_DO_PERIODO[periodo].toLowerCase()}`}>
              {top.map((l) => (
                <Linha key={l.posicao + l.apelido} linha={l} />
              ))}
              {voce && (
                <>
                  <li className="ranking-corte" aria-hidden="true">
                    …
                  </li>
                  <Linha linha={voce} />
                </>
              )}
            </ol>
          )}
        </>
      )}
    </div>
  )
}

function Linha({ linha }: { linha: LinhaDoRanking }) {
  return (
    <li className={`cartao ranking-linha${linha.ehVoce ? ' ranking-linha-voce' : ''}`} value={linha.posicao}>
      <span className="pixel ranking-posicao">{linha.posicao}º</span>
      <Avatar escolhas={linha.escolhas} tamanho={48} rotulo="" />
      <span className="ranking-quem">
        <strong>
          {linha.apelido}
          {linha.ehVoce && <span className="ranking-voce"> (você)</span>}
        </strong>
        <span className="ranking-patente">{linha.patente}</span>
      </span>
      <span className="ranking-xp">{linha.xp} XP</span>
    </li>
  )
}
