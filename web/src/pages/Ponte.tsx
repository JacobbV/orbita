import { useContext, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { EscolherApelido } from '../components/Apelido'
import { Aviso } from '../components/Aviso'
import { BonecoDoHangar } from '../components/BonecoDoHangar'
import { Carregando } from '../components/Carregando'
import { Medalha } from '../components/Medalha'
import { ProfessorDaNave } from '../components/ProfessorDaNave'
import { ProvasDaPonte } from '../components/ProvasDaPonte'
import { nomeTurno } from '../lib/api'
import { mensagemDeErro } from '../lib/erros'
import { XP_POR_DIFICULDADE } from '../lib/laboratorio'
import { PreviaDoProfessor } from '../lib/previa'
import { carregarMedalhas, ultimasGanhas, type MedalhaDoAluno } from '../lib/medalhas'
import { saudacao } from '../lib/saudacao'
import { carregarProgresso, porcentagemDaPatente, registrarAberturaEmSilencio, type Progresso } from '../lib/progresso'
import {
  carregarPonte,
  NOME_NA_PONTE,
  numeroRomano,
  rotuloMaterial,
  type AulaDaPonte,
  type DadosDaPonte,
  type DisciplinaDaPonte,
  type ExercicioDaPonte,
  type Material,
  type UnidadeDaPonte,
} from '../lib/ponte'
import './Ponte.css'

/** Ponte de comando do aluno: turmas aprovadas e aulas liberadas pelo professor. */
export function Ponte() {
  const { perfil } = useAuth()
  const [dados, setDados] = useState<DadosDaPonte | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [progresso, setProgresso] = useState<Progresso | null>(null)

  useEffect(() => {
    let ativo = true
    // O progresso é um extra: se falhar, a ponte abre do mesmo jeito.
    carregarProgresso().then(
      (p) => {
        if (ativo) setProgresso(p)
      },
      () => {},
    )
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
        <BonecoDoHangar />
        <div className="ponte-topo-nome">
          <p className="pixel ponte-selo">Ponte de comando</p>
          <h1>{saudacao(nome, 'Tripulante')}</h1>
          <p className="ponte-quem">
            {nome}
            {perfil?.apelido && (
              <span className="ponte-apelido" title="Seu apelido (troque no Hangar)">
                <span className="sr-only">Apelido: </span>
                {perfil.apelido}
              </span>
            )}
            {turmas.map((t) => (
              <span key={t.id} className="ponte-turma">
                {t.nome} · {nomeTurno(t.turno)} · {t.anoLetivo}
              </span>
            ))}
          </p>
        </div>
        {progresso && <CartaoPatente progresso={progresso} />}
        <Link to="/aguardando" className="botao ponte-pedidos">
          {dados.temOutrosPedidos ? 'Meus pedidos de acesso' : 'Pedir outra disciplina'}
        </Link>
      </header>

      {!perfil?.apelido && <EscolherApelido />}

      <ProfessorDaNave />

      <ProvasDaPonte />

      {dados.disciplinas.map((d) => (
        <PainelDisciplina key={d.oferta.id} disciplina={d} />
      ))}
    </div>
  )
}

export function PainelDisciplina({ disciplina }: { disciplina: DisciplinaDaPonte }) {
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
          <Materiais aulaId={ultimaLiberada.aula.id} materiais={ultimaLiberada.aula.materiais} primario />
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
          <>
            <Materiais aulaId={aula.id} materiais={aula.materiais} />
            {aula.exercicios.length > 0 && <Exercicios exercicios={aula.exercicios} />}
          </>
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

function Materiais({ aulaId, materiais, primario = false }: { aulaId: number; materiais: Material[]; primario?: boolean }) {
  const previa = useContext(PreviaDoProfessor)
  if (materiais.length === 0) return <p className="ponte-sem-material">Material em breve.</p>
  return (
    <ul className="ponte-materiais" role="list">
      {materiais.map((m) => (
        <li key={m.id}>
          {m.url === null ? (
            <Link to={`/aula/${aulaId}${previa ? '?comoAluno=1' : ''}`} className={`botao ponte-material ${primario ? 'botao-primario' : ''}`}>
              {rotuloMaterial(m)}
            </Link>
          ) : (
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`botao ponte-material ${primario ? 'botao-primario' : ''}`}
              onClick={() => {
                if (!previa) registrarAberturaEmSilencio(aulaId)
              }}
            >
              {rotuloMaterial(m)}
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> (abre em outra aba)</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

function Exercicios({ exercicios }: { exercicios: ExercicioDaPonte[] }) {
  return (
    <ul className="ponte-exercicios" role="list" aria-label="Exercícios da aula">
      {exercicios.map((e) => (
        <li key={e.id}>
          <Link to={`/exercicio/${e.id}`} className="ponte-exercicio">
            <span aria-hidden="true" className="ponte-exercicio-icone">
              {'</>'}
            </span>
            <span>
              Exercício: {e.titulo}
              <span className="ponte-exercicio-xp"> · +{XP_POR_DIFICULDADE[e.dificuldade as 1 | 2 | 3] ?? 20} XP</span>
              {e.entrega && (
                <span className={`ponte-exercicio-situacao ponte-exercicio-${e.entrega.estado}`}>
                  {' '}
                  · {NOME_NA_PONTE[e.entrega.estado]}
                  {e.entrega.estado === 'corrigida' &&
                    `, nota ${e.entrega.nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Patente atual e quanto falta para a próxima. */
function CartaoPatente({ progresso }: { progresso: Progresso }) {
  const { xp, patente, proxima, xpDaProxima } = progresso
  const porcentagem = porcentagemDaPatente(progresso)
  return (
    <div className="ponte-patente">
      <p className="ponte-patente-linha">
        <span className="pixel ponte-patente-nome">{patente}</span>
        <span className="ponte-patente-xp">{xp} XP</span>
      </p>
      <div
        className="ponte-barra ponte-barra-xp"
        role="progressbar"
        aria-label={proxima ? `XP até a patente ${proxima}` : 'Patente máxima'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentagem}
      >
        <span style={{ width: `${porcentagem}%` }} />
      </div>
      <p className="ponte-patente-falta">
        {proxima && xpDaProxima !== null
          ? `Faltam ${xpDaProxima - xp} XP para ${proxima}.`
          : 'Patente máxima da nave!'}
      </p>
      <UltimasMedalhas />
    </div>
  )
}

/** As últimas medalhas ganhas e o atalho para todas. Se não carregar, só o atalho. */
function UltimasMedalhas() {
  const { perfil } = useAuth()
  const [medalhas, setMedalhas] = useState<MedalhaDoAluno[] | null>(null)

  useEffect(() => {
    if (!perfil) return
    let ativo = true
    carregarMedalhas(perfil.id).then(
      (m) => {
        if (ativo) setMedalhas(m)
      },
      () => {},
    )
    return () => {
      ativo = false
    }
  }, [perfil])

  const ultimas = medalhas ? ultimasGanhas(medalhas) : []
  const ganhas = medalhas?.filter((m) => m.ganhaEm).length ?? 0
  return (
    <div className="ponte-medalhas">
      {ultimas.length > 0 && (
        <ul className="ponte-medalhas-lista" role="list" aria-label="Últimas medalhas">
          {ultimas.map((m) => (
            <li key={m.codigo} title={m.nome}>
              <Medalha codigo={m.codigo} tamanho={36} rotulo={m.nome} />
            </li>
          ))}
        </ul>
      )}
      <Link to="/medalhas" className="ponte-medalhas-link">
        {medalhas ? `Medalhas: ${ganhas} de ${medalhas.length}` : 'Medalhas'}
      </Link>
    </div>
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
