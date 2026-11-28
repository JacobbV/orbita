import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Avatar } from '../../components/Avatar'
import { Carregando } from '../../components/Carregando'
import { IndicadorDeAcesso } from '../../components/IndicadorDeAcesso'
import { BotaoVoltarAoTopo } from '../../components/BotaoVoltarAoTopo'
import { Medalha } from '../../components/Medalha'
import { OrdenarPor } from '../../components/OrdenarPor'
import { buscarOferta, nomeTurno, type Oferta } from '../../lib/api'
import { mensagemDeErro } from '../../lib/erros'
import { ordenarAlunos, type CriterioDeOrdem } from '../../lib/ordem'
import { carregarPerfilDoAluno, carregarTripulacao, type PerfilDoAluno, type TripulanteDaTurma } from '../../lib/tripulacao'
import './Professor.css'
import './Tripulacao.css'

const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const nota = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const NOME_DA_SITUACAO = {
  a_confirmar: 'a confirmar',
  confirmada: 'confirmada',
  nao_confere: 'não conferiu',
} as const

/** A turma como uma tripulação: o boneco de cada aluno. Clicar abre o perfil. Só o professor vê. */
export function Tripulacao() {
  const { ofertaId } = useParams()
  const id = Number(ofertaId)
  const [oferta, setOferta] = useState<Oferta | null>(null)
  const [tripulantes, setTripulantes] = useState<TripulanteDaTurma[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [ordem, setOrdem] = useState<CriterioDeOrdem>('nome')

  useEffect(() => {
    let ativo = true
    Promise.all([buscarOferta(id), carregarTripulacao(id)])
      .then(([o, lista]) => {
        if (!ativo) return
        if (!o) {
          setErro('Turma não encontrada.')
          return
        }
        setOferta(o)
        setTripulantes(lista)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [id])

  const lista = useMemo(() => ordenarAlunos(tripulantes ?? [], ordem), [tripulantes, ordem])
  const escolhido = useMemo(() => tripulantes?.find((t) => t.alunoId === aberto) ?? null, [tripulantes, aberto])

  const voltar = (
    <Link to="/professor?aba=turmas" className="botao">
      Voltar ao painel
    </Link>
  )

  if (erro) {
    return (
      <div className="painel container">
        <Aviso tipo="erro" titulo="Não foi possível abrir a tripulação">
          {erro}
        </Aviso>
        {voltar}
      </div>
    )
  }
  if (!oferta || !tripulantes) return <Carregando />

  const { turma, disciplina } = oferta
  return (
    <div className="painel container tripulacao">
      <header className="cartao painel-topo">
        <div className="painel-topo-texto">
          <p className="pixel painel-selo">Tripulação</p>
          <h1>
            {turma.nome} · {disciplina.sigla}
          </h1>
          <p className="painel-intro">
            {disciplina.nome}, {nomeTurno(turma.turno)}, {turma.anoLetivo}. Clique num tripulante para ver o perfil. Os alunos
            não veem o perfil dos colegas.
          </p>
        </div>
        {voltar}
      </header>

      {tripulantes.length === 0 ? (
        <p className="cartao painel-vazio">Nenhum aluno aprovado nesta turma ainda.</p>
      ) : (
        <>
          <OrdenarPor valor={ordem} aoMudar={setOrdem} />
          <ul className="tripulacao-grade" role="list" aria-label="Tripulantes da turma">
            {lista.map((t) => (
              <li key={t.alunoId}>
                <button
                  type="button"
                  className={`tripulante${t.alunoId === aberto ? ' tripulante-aberto' : ''}`}
                  aria-pressed={t.alunoId === aberto}
                  aria-label={`Perfil de ${t.nome}`}
                  onClick={() => setAberto(t.alunoId === aberto ? null : t.alunoId)}
                >
                  <Avatar escolhas={t.escolhas} tamanho={96} rotulo="" />
                  <span className="tripulante-nome">{t.nome}</span>
                  {t.apelido && <span className="tripulante-apelido">{t.apelido}</span>}
                  <span className="tripulante-patente">
                    {t.patente} · {t.xp} XP
                  </span>
                  <IndicadorDeAcesso ultimo={t.ultimoAcesso} />
                </button>
              </li>
            ))}
          </ul>
          {escolhido && <PerfilDoTripulante key={escolhido.alunoId} tripulante={escolhido} ofertaId={id} aoFechar={() => setAberto(null)} />}
        </>
      )}
      <BotaoVoltarAoTopo />
    </div>
  )
}

function PerfilDoTripulante({ tripulante, ofertaId, aoFechar }: { tripulante: TripulanteDaTurma; ofertaId: number; aoFechar: () => void }) {
  const [perfil, setPerfil] = useState<PerfilDoAluno | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    carregarPerfilDoAluno(tripulante.alunoId)
      .then((p) => {
        if (ativo) setPerfil(p)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [tripulante.alunoId])

  const ganhas = perfil?.medalhas.filter((m) => m.ganhaEm) ?? []
  return (
    <section className="cartao tripulacao-perfil" aria-label={`Perfil de ${tripulante.nome}`}>
      <div className="tripulacao-perfil-topo">
        <Avatar escolhas={tripulante.escolhas} tamanho={144} rotulo={`Boneco de ${tripulante.nome}`} />
        <div>
          <h2>{tripulante.nome}</h2>
          {tripulante.apelido && <p className="tripulacao-apelido">Apelido: {tripulante.apelido}</p>}
          <p className="tripulacao-patente">
            <span className="pixel">{tripulante.patente}</span> · {tripulante.xp} XP
          </p>
          <p>
            <IndicadorDeAcesso ultimo={tripulante.ultimoAcesso} />
          </p>
          <div className="tripulacao-acoes">
            <Link to={`/professor/xp/${ofertaId}`} className="botao botao-compacto">
              Dar XP
            </Link>
            <Link to={`/professor?aba=entregas&turma=${ofertaId}`} className="botao botao-compacto">
              Ver entregas
            </Link>
            <button type="button" className="botao botao-compacto" onClick={aoFechar}>
              Fechar
            </button>
          </div>
        </div>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!perfil && !erro && <Carregando />}
      {perfil && (
        <>
          <h3>
            Medalhas ({ganhas.length} de {perfil.medalhas.length})
          </h3>
          {ganhas.length === 0 ? (
            <p className="painel-vazio">Ainda não ganhou nenhuma medalha.</p>
          ) : (
            <ul className="tripulacao-medalhas" role="list">
              {ganhas.map((m) => (
                <li key={m.codigo} title={`${m.nome}: ${m.descricao}`}>
                  <Medalha codigo={m.codigo} tamanho={54} rotulo={m.nome} />
                </li>
              ))}
            </ul>
          )}

          <h3>Últimas entregas</h3>
          {perfil.entregas.length === 0 ? (
            <p className="painel-vazio">Ainda não entregou nenhum exercício.</p>
          ) : (
            <ul className="tripulacao-entregas" role="list">
              {perfil.entregas.map((e) => (
                <li key={e.id}>
                  <span className="tripulacao-entrega-titulo">{e.exercicio}</span>
                  <span>nota {nota(e.nota)}</span>
                  <span className="tripulacao-entrega-situacao">
                    {e.devolvida ? 'devolvida' : e.corrigida ? 'corrigida' : NOME_DA_SITUACAO[e.situacao]}
                  </span>
                  <span className="tripulacao-entrega-data">{formatoData.format(new Date(e.criadoEm))}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
