import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { mensagemDeErro } from '../../lib/erros'
import {
  carregarRankingDoProfessor,
  NOME_DO_PERIODO,
  tirarDoRanking,
  type LinhaDoProfessor,
  type PeriodoDoRanking,
} from '../../lib/ranking'
import './Professor.css'

/** Quem entrou no ranking de uma turma. O professor vê o nome real e pode tirar um aluno. */
export function RankingDaTurma() {
  const { turmaId } = useParams()
  const id = Number(turmaId)
  const [periodo, setPeriodo] = useState<PeriodoDoRanking>('semana')
  const [linhas, setLinhas] = useState<LinhaDoProfessor[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [tirando, setTirando] = useState<string | null>(null)

  const carregar = useCallback(() => carregarRankingDoProfessor(id, periodo), [id, periodo])

  useEffect(() => {
    let ativo = true
    carregar()
      .then((l) => {
        if (ativo) setLinhas(l)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [carregar])

  async function tirar(linha: LinhaDoProfessor) {
    setTirando(linha.alunoId)
    setAviso(null)
    setErro(null)
    try {
      await tirarDoRanking(linha.alunoId)
      setAviso(`${linha.nome} saiu do ranking. O aluno pode entrar de novo quando quiser.`)
      setLinhas(await carregar())
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setTirando(null)
    }
  }

  const voltar = (
    <Link to="/professor" className="botao">
      Voltar ao painel
    </Link>
  )

  if (erro && !linhas) {
    return (
      <div className="painel container">
        <Aviso tipo="erro" titulo="Não foi possível abrir o ranking">
          {erro}
        </Aviso>
        {voltar}
      </div>
    )
  }
  if (!linhas) return <Carregando />

  return (
    <div className="painel container">
      <header className="cartao painel-topo">
        <div className="painel-topo-texto">
          <p className="pixel painel-selo">Ranking</p>
          <h1>Ranking da turma</h1>
          <p className="painel-intro">
            Só os alunos que escolheram entrar. Os colegas veem apenas o apelido; o nome real aparece só aqui, para você.
          </p>
        </div>
        {voltar}
      </header>

      {erro && (
        <Aviso tipo="erro" titulo="Algo deu errado">
          {erro}
        </Aviso>
      )}
      {aviso && (
        <Aviso tipo="sucesso" titulo="Pronto">
          {aviso}
        </Aviso>
      )}

      <div className="ranking-abas" role="group" aria-label="Período do ranking" style={{ display: 'flex', gap: 8 }}>
        {(['semana', 'geral'] as const).map((p) => (
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

      {linhas.length === 0 ? (
        <p className="cartao painel-vazio">Ninguém desta turma entrou no ranking ainda.</p>
      ) : (
        <ol className="painel-lista" role="list" aria-label="Participantes do ranking">
          {linhas.map((l) => (
            <li key={l.alunoId} className="cartao" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: 16 }}>
              <span className="pixel" style={{ color: 'var(--estrela)' }}>
                {l.posicao}º
              </span>
              <span style={{ flex: 1, minWidth: 180 }}>
                <strong>{l.apelido}</strong>
                <br />
                <span style={{ color: 'var(--texto-suave)' }}>
                  {l.nome} · {l.patente} · {l.xp} XP
                </span>
              </span>
              <button type="button" className="botao botao-compacto" disabled={tirando === l.alunoId} onClick={() => tirar(l)}>
                Tirar do ranking
                <span className="sr-only"> ({l.nome})</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
