import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { listarOfertas } from '../lib/api'
import { mensagemDeErro } from '../lib/erros'
import {
  corDaUnidade,
  posicaoNaTrilha,
  resumoDoPlaneta,
  situacaoDoPlaneta,
  unidadeAtual,
} from '../lib/mapa'
import {
  carregarPonte,
  carregarPonteNinja,
  numeroRomano,
  type AulaDaPonte,
  type DadosDaPonte,
  type DisciplinaDaPonte,
  type UnidadeDaPonte,
} from '../lib/ponte'
import { carregarEstudoRecente, registrarAberturaEmSilencio } from '../lib/progresso'
import { useModoNinja } from '../ninja/ModoNinja'
import { estudoDoNinja, registrarAulaDoNinja } from '../ninja/progressoNinja'
import './Mapa.css'

/** Acima disso a trilha não cabe com os nomes legíveis: vira lista, como no celular. */
const MAX_NA_TRILHA = 6

/** Mapa da disciplina: um planeta por unidade; tocar no planeta abre as aulas. */
export function Mapa() {
  const { perfil } = useAuth()
  const ninja = useModoNinja().ativo
  const perfilId = perfil?.id
  const [dados, setDados] = useState<DadosDaPonte | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ultimaAulaId, setUltimaAulaId] = useState<number | null>(null)
  const [disciplinaId, setDisciplinaId] = useState<number | null>(null)
  const [unidadeId, setUnidadeId] = useState<number | null>(null)

  useEffect(() => {
    let ativo = true
    // Ninja: todas as turmas, tudo liberado; a última aula fica só no navegador dele.
    const estudo = ninja && perfilId ? Promise.resolve(estudoDoNinja(perfilId)) : carregarEstudoRecente()
    estudo.then(
      (e) => {
        if (ativo) setUltimaAulaId(e.ultimaAulaId)
      },
      () => {},
    )
    const carregar = ninja
      ? listarOfertas()
          .then(carregarPonteNinja)
          .then((disciplinas): DadosDaPonte => ({ disciplinas, temOutrosPedidos: false }))
      : carregarPonte()
    carregar.then(
      (d) => {
        if (ativo) setDados(d)
      },
      (e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      },
    )
    return () => {
      ativo = false
    }
  }, [ninja, perfilId])

  const disciplina = useMemo(() => {
    if (!dados) return null
    return dados.disciplinas.find((d) => d.oferta.id === disciplinaId) ?? dados.disciplinas[0] ?? null
  }, [dados, disciplinaId])

  if (erro) {
    return (
      <div className="mapa container">
        <Aviso tipo="erro" titulo="Não foi possível abrir o mapa">
          {erro}
        </Aviso>
      </div>
    )
  }
  if (!dados) return <Carregando />
  if (!disciplina) {
    if (ninja) return <p className="mapa-vazio container">Nenhuma turma ativa no momento.</p>
    return <Navigate to="/aguardando" replace />
  }

  const atual = unidadeAtual(disciplina, ultimaAulaId)
  const selecionada = disciplina.unidades.find((u) => u.id === unidadeId) ?? atual

  return (
    <div className="mapa container">
      <header className="mapa-topo">
        <p className="pixel mapa-selo">{disciplina.oferta.disciplina.nome}</p>
        <h1>Mapa da galáxia</h1>
        <p className="mapa-explica">
          {ninja
            ? 'Cada unidade é um planeta. No Modo Ninja todas as aulas estão abertas; o aluno vê cadeado nas que ainda não foram liberadas.'
            : 'Cada unidade é um planeta. Aulas com cadeado abrem quando o professor libera.'}
        </p>
        {dados.disciplinas.length > 1 && (
          <div className="mapa-disciplinas" role="group" aria-label="Disciplina">
            {dados.disciplinas.map((d) => (
              <button
                key={d.oferta.id}
                type="button"
                className="botao botao-compacto"
                aria-pressed={d.oferta.id === disciplina.oferta.id}
                onClick={() => {
                  setDisciplinaId(d.oferta.id)
                  setUnidadeId(null)
                }}
              >
                {d.oferta.disciplina.sigla} · {d.oferta.turma.nome}
              </button>
            ))}
          </div>
        )}
      </header>

      {disciplina.unidades.length === 0 ? (
        <p className="mapa-vazio">As unidades desta disciplina aparecem aqui em breve.</p>
      ) : (
        <>
          <Galaxia disciplina={disciplina} atualId={atual?.id ?? null} selecionadaId={selecionada?.id ?? null} onEscolher={setUnidadeId} />
          {selecionada && <Estacoes unidade={selecionada} continuarId={ultimaAulaId} />}
        </>
      )}
    </div>
  )
}

function Galaxia({
  disciplina,
  atualId,
  selecionadaId,
  onEscolher,
}: {
  disciplina: DisciplinaDaPonte
  atualId: number | null
  selecionadaId: number | null
  onEscolher: (id: number) => void
}) {
  const { unidades } = disciplina
  const naTrilha = unidades.length <= MAX_NA_TRILHA
  const pontos = unidades.map((_, i) => posicaoNaTrilha(i, unidades.length))
  return (
    <nav className={`mapa-galaxia ${naTrilha ? 'mapa-trilha' : 'mapa-lista'}`} aria-label="Unidades da disciplina">
      {naTrilha && (
        <svg className="mapa-caminho" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <polyline points={pontos.map((p) => `${p.x},${p.y}`).join(' ')} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {unidades.map((u, i) => {
        const situacao = situacaoDoPlaneta(u)
        const ponto = pontos[i]
        const estilo = naTrilha && ponto ? { left: `${ponto.x}%`, top: `${ponto.y}%` } : undefined
        return (
          <button
            key={u.id}
            type="button"
            className={`mapa-planeta mapa-planeta-${situacao} ${u.id === atualId ? 'mapa-planeta-atual' : ''}`}
            style={{ ...estilo, '--cor': corDaUnidade(u.numero) } as React.CSSProperties}
            aria-pressed={u.id === selecionadaId}
            onClick={() => onEscolher(u.id)}
          >
            <span className="mapa-bola" aria-hidden="true" />
            <span className="mapa-planeta-texto">
              <span className="pixel mapa-planeta-numero">Unidade {numeroRomano(u.numero)}</span>
              <span className="mapa-planeta-titulo">{u.titulo}</span>
              <span className="mapa-planeta-resumo">
                {u.id === atualId && <strong>Você está aqui · </strong>}
                {resumoDoPlaneta(u)}
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function Estacoes({ unidade, continuarId }: { unidade: UnidadeDaPonte; continuarId: number | null }) {
  const romano = numeroRomano(unidade.numero)
  return (
    <section className="cartao mapa-estacoes" style={{ '--cor': corDaUnidade(unidade.numero) } as React.CSSProperties} aria-labelledby="mapa-estacoes-titulo">
      <p className="pixel mapa-estacoes-selo">Unidade {romano}</p>
      <h2 id="mapa-estacoes-titulo">{unidade.titulo}</h2>
      {unidade.aulas.length === 0 ? (
        <p className="mapa-vazio">Aulas em breve.</p>
      ) : (
        <ol className="mapa-aulas" role="list">
          {unidade.aulas.map((a) => (
            <Estacao key={a.id} aula={a} romano={romano} continuar={a.id === continuarId} />
          ))}
        </ol>
      )}
    </section>
  )
}

function Estacao({ aula, romano, continuar }: { aula: AulaDaPonte; romano: string; continuar: boolean }) {
  const ninja = useModoNinja().ativo
  const { perfil } = useAuth()
  function abriu(aulaId: number) {
    if (!ninja) registrarAberturaEmSilencio(aulaId)
    else if (perfil) registrarAulaDoNinja(perfil.id, aulaId)
  }
  const interna = aula.materiais.some((m) => m.url === null)
  const externo = aula.materiais.find((m) => m.url !== null)
  return (
    <li className={`mapa-aula ${aula.liberada ? '' : 'mapa-aula-bloqueada'} ${continuar ? 'mapa-aula-atual' : ''}`}>
      <span className="pixel mapa-aula-numero" aria-hidden="true">
        {romano}.{aula.numero}
      </span>
      <span className="mapa-aula-titulo">
        <span className="sr-only">Aula {aula.numero}: </span>
        {aula.titulo}
      </span>
      {!aula.liberada ? (
        <span className="mapa-aula-cadeado">
          <Cadeado />
          bloqueada
        </span>
      ) : interna ? (
        <Link to={`/aula/${aula.id}`} className="mapa-aula-acao" aria-label={`${continuar ? 'Continuar' : 'Abrir'} a aula ${aula.numero}: ${aula.titulo}`}>
          {continuar ? 'Continuar' : 'Abrir'}
        </Link>
      ) : externo && externo.url ? (
        <a
          href={externo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mapa-aula-acao"
          onClick={() => abriu(aula.id)}
          aria-label={`Abrir a aula ${aula.numero}: ${aula.titulo} (abre em outra aba)`}
        >
          Abrir ↗
        </a>
      ) : (
        <span className="mapa-aula-cadeado">material em breve</span>
      )}
    </li>
  )
}

function Cadeado() {
  return (
    <svg viewBox="0 0 8 9" width="14" height="16" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M2 0h4v1H2zM1 1h1v3H1zM6 1h1v3H6zM0 4h8v5H0z" />
      <path fill="var(--casco)" d="M3 5h2v2H3zM3.5 7h1v1h-1z" />
    </svg>
  )
}
