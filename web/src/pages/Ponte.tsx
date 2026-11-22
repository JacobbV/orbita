import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { nomeTurno } from '../lib/api'
import { mensagemDeErro } from '../lib/erros'
import { saudacao } from '../lib/saudacao'
import {
  carregarPonte,
  numeroRomano,
  rotuloMaterial,
  type AulaDaPonte,
  type DadosDaPonte,
  type DisciplinaDaPonte,
  type Material,
  type UnidadeDaPonte,
} from '../lib/ponte'
import './Ponte.css'

/** Ponte de comando do aluno: turmas aprovadas e aulas liberadas pelo professor. */
export function Ponte() {
  const { perfil } = useAuth()
  const [dados, setDados] = useState<DadosDaPonte | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    carregarPonte()
      .then((d) => {
        if (ativo) setDados(d)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [])

  if (erro) {
    return (
      <div className="ponte container">
        <Aviso tipo="erro" titulo="Não foi possível abrir a ponte de comando">
          {erro}
        </Aviso>
      </div>
    )
  }
  if (!dados) return <Carregando />
  // Sem nenhuma disciplina aprovada, o lugar do aluno é a tela de pedidos.
  if (dados.disciplinas.length === 0) return <Navigate to="/aguardando" replace />

  const nome = perfil?.nome.trim() || 'Tripulante'
  const turmas = [
    ...new Map(dados.disciplinas.map((d) => [d.oferta.turma.id, d.oferta.turma])).values(),
  ]

  return (
    <div className="ponte container">
      <header className="cartao ponte-topo">
        <div>
          <p className="pixel ponte-selo">Ponte de comando</p>
          <h1>{saudacao(nome, 'Tripulante')}</h1>
          <p className="ponte-quem">
            {nome}
            {turmas.map((t) => (
              <span key={t.id} className="ponte-turma">
                {t.nome} · {nomeTurno(t.turno)} · {t.anoLetivo}
              </span>
            ))}
          </p>
        </div>
        <Link to="/aguardando" className="botao ponte-pedidos">
          {dados.temOutrosPedidos ? 'Meus pedidos de acesso' : 'Pedir outra disciplina'}
        </Link>
      </header>

      {dados.disciplinas.map((d) => (
        <PainelDisciplina key={d.oferta.id} disciplina={d} />
      ))}
    </div>
  )
}

function PainelDisciplina({ disciplina }: { disciplina: DisciplinaDaPonte }) {
  const { oferta, unidades, totalAulas, totalLiberadas, ultimaLiberada } = disciplina
  const idTitulo = `disciplina-${oferta.id}`
  const nenhumaLiberada = totalLiberadas === 0
  const porcentagem = totalAulas > 0 ? Math.round((totalLiberadas / totalAulas) * 100) : 0

  return (
    <section className="ponte-disciplina" aria-labelledby={idTitulo}>
      <div className="ponte-disciplina-topo">
        <p className="pixel ponte-sigla">{oferta.disciplina.sigla}</p>
        <h2 id={idTitulo}>{oferta.disciplina.nome}</h2>
        <p className="ponte-progresso-texto">
          {oferta.turma.nome} ·{' '}
          {totalAulas === 0
            ? 'aulas em breve'
            : `${totalLiberadas} de ${totalAulas} ${totalAulas === 1 ? 'aula liberada' : 'aulas liberadas'}`}
        </p>
        {totalAulas > 0 && (
          <div
            className="ponte-barra"
            role="progressbar"
            aria-label={`Aulas liberadas em ${oferta.disciplina.nome}`}
            aria-valuemin={0}
            aria-valuemax={totalAulas}
            aria-valuenow={totalLiberadas}
          >
            <span style={{ width: `${porcentagem}%` }} />
          </div>
        )}
      </div>

      {ultimaLiberada && (
        <div className="cartao ponte-destaque">
          <p className="pixel ponte-destaque-selo">Última aula liberada</p>
          <p className="ponte-destaque-titulo">
            Unidade {numeroRomano(ultimaLiberada.unidade.numero)} · Aula {ultimaLiberada.aula.numero} —{' '}
            {ultimaLiberada.aula.titulo}
          </p>
          <Materiais materiais={ultimaLiberada.aula.materiais} primario />
        </div>
      )}

      {nenhumaLiberada && totalAulas > 0 && (
        <p className="ponte-aviso-vazio">
          O professor ainda não liberou nenhuma aula para a sua turma. Elas aparecem aqui assim que forem liberadas.
        </p>
      )}

      <div className="ponte-unidades">
        {unidades.map((u, i) => (
          <PainelUnidade key={u.id} unidade={u} aberta={u.liberadas > 0 || (nenhumaLiberada && totalAulas > 0 && i === 0)} />
        ))}
      </div>
    </section>
  )
}

function PainelUnidade({ unidade, aberta }: { unidade: UnidadeDaPonte; aberta: boolean }) {
  const romano = numeroRomano(unidade.numero)
  return (
    <details className="cartao ponte-unidade" open={aberta}>
      <summary>
        <span className="ponte-unidade-nome">
          <span className="pixel ponte-unidade-numero">Unidade {romano}</span>
          <span className="ponte-unidade-titulo">{unidade.titulo}</span>
        </span>
        <span className="ponte-unidade-contagem">
          {unidade.aulas.length === 0 ? 'em breve' : `${unidade.liberadas}/${unidade.aulas.length}`}
        </span>
      </summary>
      {unidade.aulas.length === 0 ? (
        <p className="ponte-aviso-vazio">Aulas em breve.</p>
      ) : (
        <ol className="ponte-aulas" role="list">
          {unidade.aulas.map((a) => (
            <ItemAula key={a.id} aula={a} romano={romano} />
          ))}
        </ol>
      )}
    </details>
  )
}

function ItemAula({ aula, romano }: { aula: AulaDaPonte; romano: string }) {
  return (
    <li className={`ponte-aula ${aula.liberada ? 'ponte-aula-liberada' : 'ponte-aula-bloqueada'}`}>
      <span className="ponte-aula-numero" aria-hidden="true">
        {romano}.{aula.numero}
      </span>
      <div className="ponte-aula-corpo">
        <p className="ponte-aula-titulo">
          <span className="sr-only">Aula {aula.numero}: </span>
          {aula.titulo}
        </p>
        {aula.liberada ? (
          <Materiais materiais={aula.materiais} />
        ) : (
          <p className="ponte-cadeado">
            <Cadeado />
            Bloqueada
          </p>
        )}
      </div>
    </li>
  )
}

function Materiais({ materiais, primario = false }: { materiais: Material[]; primario?: boolean }) {
  if (materiais.length === 0) return <p className="ponte-sem-material">Material em breve.</p>
  return (
    <ul className="ponte-materiais" role="list">
      {materiais.map((m) => (
        <li key={m.id}>
          <a
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`botao ponte-material ${primario ? 'botao-primario' : ''}`}
          >
            {rotuloMaterial(m)}
            <span aria-hidden="true">↗</span>
            <span className="sr-only"> (abre em outra aba)</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Cadeado em pixel art (arte original). */
function Cadeado() {
  return (
    <svg className="ponte-cadeado-icone" viewBox="0 0 8 9" width="16" height="18" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M2 0h4v1H2zM1 1h1v3H1zM6 1h1v3H6zM0 4h8v5H0z" />
      <path fill="var(--casco)" d="M3 5h2v2H3zM3.5 7h1v1h-1z" />
    </svg>
  )
}
