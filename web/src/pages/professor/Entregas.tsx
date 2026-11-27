import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { normalizarSaida } from '../../lab/correcao'
import { criarExecutor, LINGUAGENS } from '../../lab/linguagens'
import { rotuloTurma } from '../../lib/api'
import {
  carregarEntregas,
  corrigirEntrega,
  devolverEntrega,
  lerNota,
  NOME_DO_STATUS,
  notaFinal,
  statusDoAluno,
  type AlunoDasEntregas,
  type DadosDasEntregas,
  type EntregaDoProfessor,
  type ExercicioDasEntregas,
} from '../../lib/entregas'
import { mensagemDeErro } from '../../lib/erros'
import { carregarAulaComExercicios } from '../../lib/exercicios'
import { listarOfertasDoPainel, type OfertaDoPainel } from '../../lib/professor'
import { numeroRomano } from '../../lib/ponte'
import './Entregas.css'

const nota = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** Aba "Entregas": turma → unidade → aula → exercício → aluno. Abrir o código, comentar, dar nota e devolver. */
export function Entregas() {
  const [params, setParams] = useSearchParams()
  const [ofertas, setOfertas] = useState<OfertaDoPainel[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const turmaId = Number(params.get('turma'))

  useEffect(() => {
    let ativo = true
    listarOfertasDoPainel()
      .then((o) => {
        if (ativo) setOfertas(o)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [])

  if (erro) return <Aviso tipo="erro">{erro}</Aviso>
  if (!ofertas) return <Carregando />
  const oferta = ofertas.find((o) => o.id === turmaId) ?? null

  return (
    <section className="painel-secao entregas" aria-labelledby="entregas-titulo">
      <div className="painel-secao-topo">
        <h2 id="entregas-titulo">Entregas dos alunos</h2>
      </div>
      <p className="painel-intro">
        Escolha a turma para ver, por unidade e aula, quem entregou. Abra o código, rode os testes, escreva um comentário,
        ajuste a nota ou devolva para o aluno refazer.
      </p>
      <ul className="entregas-turmas" role="list">
        {ofertas.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              className={`botao botao-compacto${o.id === turmaId ? ' botao-primario' : ''}`}
              aria-pressed={o.id === turmaId}
              onClick={() => setParams({ aba: 'entregas', turma: String(o.id) })}
            >
              {rotuloTurma(o.turma)} · {o.disciplina.sigla}
            </button>
          </li>
        ))}
      </ul>
      {oferta ? <EntregasDaTurma key={oferta.id} oferta={oferta} /> : <p className="painel-vazio">Escolha uma turma acima.</p>}
    </section>
  )
}

type Aberta = { exercicioId: number; alunoId: string }

function EntregasDaTurma({ oferta }: { oferta: OfertaDoPainel }) {
  const [dados, setDados] = useState<DadosDasEntregas | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [aberta, setAberta] = useState<Aberta | null>(null)

  useEffect(() => {
    let ativo = true
    carregarEntregas(oferta.id)
      .then((d) => {
        if (ativo) setDados(d)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [oferta.id, versao])

  const porAula = useMemo(() => {
    const grupos = new Map<number, { exercicio: ExercicioDasEntregas; exercicios: ExercicioDasEntregas[] }>()
    for (const e of dados?.exercicios ?? []) {
      const g = grupos.get(e.aulaId)
      if (g) g.exercicios.push(e)
      else grupos.set(e.aulaId, { exercicio: e, exercicios: [e] })
    }
    return [...grupos.values()]
  }, [dados])

  if (erro) return <Aviso tipo="erro">{erro}</Aviso>
  if (!dados) return <Carregando />
  if (dados.alunos.length === 0) return <p className="cartao painel-vazio">Nenhum aluno aprovado nesta turma ainda.</p>
  if (dados.exercicios.length === 0) {
    return <p className="cartao painel-vazio">Nenhum exercício nas aulas liberadas para esta turma ainda.</p>
  }

  return (
    <div className="entregas-arvore">
      {porAula.map(({ exercicio: primeiro, exercicios }) => (
        <details key={primeiro.aulaId} className="cartao entregas-aula" open={porAula.length <= 3}>
          <summary>
            <span className="pixel entregas-aula-selo">
              U{numeroRomano(primeiro.unidade)} · A{primeiro.aula}
            </span>
            <span className="entregas-aula-titulo">{primeiro.aulaTitulo}</span>
          </summary>
          {exercicios.map((ex) => (
            <ExercicioComAlunos
              key={ex.id}
              exercicio={ex}
              dados={dados}
              aberta={aberta?.exercicioId === ex.id ? aberta.alunoId : null}
              aoAbrir={(alunoId) => setAberta(alunoId === null ? null : { exercicioId: ex.id, alunoId })}
              aoMudar={() => setVersao((v) => v + 1)}
            />
          ))}
        </details>
      ))}
    </div>
  )
}

function ExercicioComAlunos({
  exercicio,
  dados,
  aberta,
  aoAbrir,
  aoMudar,
}: {
  exercicio: ExercicioDasEntregas
  dados: DadosDasEntregas
  aberta: string | null
  aoAbrir: (alunoId: string | null) => void
  aoMudar: () => void
}) {
  const linhas = dados.alunos.map((a) => {
    const entregas = dados.entregas.filter((e) => e.exercicioId === exercicio.id && e.alunoId === a.alunoId)
    return { aluno: a, entregas, status: statusDoAluno(entregas) }
  })
  const entregaram = linhas.filter((l) => l.status !== 'sem_entrega').length
  const faltaCorrigir = linhas.filter((l) => l.status === 'entregue').length
  const aberto = linhas.find((l) => l.aluno.alunoId === aberta)

  return (
    <section className="entregas-exercicio" aria-label={`Exercício ${exercicio.titulo}`}>
      <h3>{exercicio.titulo}</h3>
      <p className="entregas-resumo">
        {LINGUAGENS[exercicio.linguagem].nome} · {entregaram} de {linhas.length} entregaram
        {faltaCorrigir > 0 && ` · ${faltaCorrigir} ${faltaCorrigir === 1 ? 'falta corrigir' : 'faltam corrigir'}`}
      </p>
      <ul className="entregas-alunos" role="list">
        {linhas.map(({ aluno, entregas, status }) => {
          const ultima = entregas[0]
          return (
            <li key={aluno.alunoId} className={`entregas-aluno entregas-status-${status}`}>
              <span className="entregas-aluno-nome">
                {aluno.nome}
                {aluno.apelido && <span className="entregas-apelido"> ({aluno.apelido})</span>}
              </span>
              <span className="entregas-status">{NOME_DO_STATUS[status]}</span>
              <span className="entregas-nota">{ultima ? nota(notaFinal(ultima)) : '—'}</span>
              {entregas.length > 0 ? (
                <button
                  type="button"
                  className="botao botao-compacto"
                  aria-expanded={aberta === aluno.alunoId}
                  aria-label={`${aberta === aluno.alunoId ? 'Fechar' : 'Abrir'} a entrega de ${aluno.nome}`}
                  onClick={() => aoAbrir(aberta === aluno.alunoId ? null : aluno.alunoId)}
                >
                  {aberta === aluno.alunoId ? 'Fechar' : 'Abrir'}
                </button>
              ) : (
                <span />
              )}
            </li>
          )
        })}
      </ul>
      {aberto && (
        <DetalheDaEntrega
          key={aberto.aluno.alunoId}
          exercicio={exercicio}
          aluno={aberto.aluno}
          entregas={aberto.entregas}
          aoMudar={aoMudar}
          aoFechar={() => aoAbrir(null)}
        />
      )}
    </section>
  )
}

type ResultadoDoTeste = { numero: number; tipo: string; certo: boolean; esperado: string; obtido: string; erro: string | null }

interface PropsDoDetalhe {
  exercicio: ExercicioDasEntregas
  aluno: AlunoDasEntregas
  entregas: EntregaDoProfessor[]
  aoMudar: () => void
  aoFechar: () => void
}

function DetalheDaEntrega(props: PropsDoDetalhe) {
  const [primeira, ...resto] = props.entregas
  if (!primeira) return null
  return <DetalheComEntregas {...props} entregas={[primeira, ...resto]} />
}

function DetalheComEntregas({
  exercicio,
  aluno,
  entregas,
  aoMudar,
  aoFechar,
}: Omit<PropsDoDetalhe, 'entregas'> & { entregas: [EntregaDoProfessor, ...EntregaDoProfessor[]] }) {
  const [escolhida, setEscolhida] = useState(entregas[0].id)
  const entrega = entregas.find((e) => e.id === escolhida) ?? entregas[0]
  const [notaTexto, setNotaTexto] = useState(entrega.notaProfessor === null ? '' : nota(entrega.notaProfessor))
  const [comentario, setComentario] = useState(entrega.comentario ?? '')
  const [confirmandoDevolver, setConfirmandoDevolver] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [testes, setTestes] = useState<{ estado: 'rodando' | 'pronto'; lista: ResultadoDoTeste[] } | null>(null)
  const [erroTestes, setErroTestes] = useState<string | null>(null)
  const executor = useRef<ReturnType<typeof criarExecutor> | null>(null)

  useEffect(() => () => executor.current?.encerrar(), [])

  function trocarEntrega(e: EntregaDoProfessor) {
    setEscolhida(e.id)
    setNotaTexto(e.notaProfessor === null ? '' : nota(e.notaProfessor))
    setComentario(e.comentario ?? '')
    setConfirmandoDevolver(false)
    setTestes(null)
    setAviso(null)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const lida = lerNota(notaTexto)
    if (!lida.ok) {
      setAviso({ tipo: 'erro', texto: 'A nota vai de 0 a 10, com no máximo uma casa decimal. Deixe vazio para valer a nota dos testes.' })
      return
    }
    setSalvando(true)
    setAviso(null)
    try {
      await corrigirEntrega(entrega.id, lida.nota, comentario)
      setAviso({ tipo: 'sucesso', texto: 'Correção salva. O aluno já vê a nota e o comentário.' })
      aoMudar()
    } catch (err) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(err) })
    } finally {
      setSalvando(false)
    }
  }

  async function devolver() {
    setSalvando(true)
    setAviso(null)
    try {
      await devolverEntrega(entrega.id, comentario)
      setConfirmandoDevolver(false)
      setAviso({ tipo: 'sucesso', texto: `Devolvida para ${aluno.nome}. Agora ele pode refazer e entregar de novo.` })
      aoMudar()
    } catch (err) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(err) })
    } finally {
      setSalvando(false)
    }
  }

  /** Roda o código do aluno em todos os testes (visíveis, ocultos e secretos) no navegador do professor. */
  async function rodarTestes() {
    setErroTestes(null)
    setTestes({ estado: 'rodando', lista: [] })
    const py = criarExecutor(exercicio.linguagem)
    executor.current = py
    try {
      const aula = await carregarAulaComExercicios(exercicio.aulaId)
      const dadosDoExercicio = aula?.exercicios.find((x) => x.id === exercicio.id)
      if (!dadosDoExercicio) throw new Error('Exercício não encontrado.')
      await py.carregar()
      const lista: ResultadoDoTeste[] = []
      for (const [i, t] of dadosDoExercicio.testes.entries()) {
        const r = await py.rodar(entrega.codigo, t.entrada, false)
        const obtido = r.tempoEsgotado ? '(passou do tempo)' : r.saida
        const certo = !r.erro && !r.tempoEsgotado && normalizarSaida(r.saida) === normalizarSaida(t.saidaEsperada)
        lista.push({ numero: i + 1, tipo: t.tipo, certo, esperado: t.saidaEsperada, obtido, erro: r.erro })
        setTestes({ estado: 'rodando', lista: [...lista] })
      }
      setTestes({ estado: 'pronto', lista })
    } catch (err) {
      setTestes(null)
      setErroTestes(err instanceof Error && err.message.startsWith('Não foi possível carregar') ? err.message : mensagemDeErro(err))
    } finally {
      py.encerrar()
    }
  }

  const devolvida = entrega.devolvidaEm !== null
  const certosAgora = testes?.lista.filter((t) => t.certo).length ?? 0

  return (
    <div className="entregas-detalhe" role="region" aria-label={`Entrega de ${aluno.nome}`}>
      <div className="entregas-detalhe-topo">
        <h4>{aluno.nome}</h4>
        <button type="button" className="botao botao-compacto" onClick={aoFechar}>
          Fechar
        </button>
      </div>
      {entregas.length > 1 && (
        <div className="entregas-tentativas" role="group" aria-label="Entregas deste aluno">
          {entregas.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`botao botao-compacto${e.id === entrega.id ? ' botao-primario' : ''}`}
              aria-pressed={e.id === entrega.id}
              onClick={() => trocarEntrega(e)}
            >
              Entrega {e.tentativa}
              {e.devolvidaEm ? ' (devolvida)' : ''}
            </button>
          ))}
        </div>
      )}
      <p className="entregas-info">
        Entrega {entrega.tentativa} em {formatoData.format(new Date(entrega.criadoEm))} · o aluno viu {entrega.testesCertos} de{' '}
        {entrega.testesTotal} testes certos (nota {nota(entrega.nota)})
        {devolvida && ' · devolvida para refazer'}
      </p>
      <pre className="entregas-codigo" tabIndex={0} aria-label={`Código de ${aluno.nome}`}>
        {entrega.codigo}
      </pre>

      <div className="entregas-acoes">
        <button type="button" className="botao botao-compacto" onClick={rodarTestes} disabled={testes?.estado === 'rodando'}>
          ▶ Rodar os testes
        </button>
      </div>
      {erroTestes && <Aviso tipo="erro">{erroTestes}</Aviso>}
      {testes && (
        <div className="entregas-testes" aria-live="polite">
          <p className="entregas-testes-titulo">
            {testes.estado === 'rodando'
              ? `Rodando… ${testes.lista.length}`
              : `${certosAgora} de ${testes.lista.length} testes certos (inclui os secretos)`}
          </p>
          <ol role="list">
            {testes.lista.map((t) => (
              <li key={t.numero} className={t.certo ? 'entregas-teste-certo' : 'entregas-teste-errado'}>
                <span aria-hidden="true">{t.certo ? '✓' : '✗'}</span> Teste {t.numero} ({t.tipo})
                <span className="sr-only">{t.certo ? ': certo' : ': errado'}</span>
                {!t.certo && (
                  <pre>{t.erro ?? `Esperado: ${t.esperado}\nSaiu: ${t.obtido || '(sem saída)'}`}</pre>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <form className="entregas-correcao" onSubmit={salvar}>
        <div className="campo">
          <label htmlFor={`nota-${entrega.id}`}>Nota (0 a 10)</label>
          <input
            id={`nota-${entrega.id}`}
            inputMode="decimal"
            value={notaTexto}
            onChange={(e) => setNotaTexto(e.target.value)}
            placeholder={`vazio = ${nota(entrega.nota)} (testes)`}
            autoComplete="off"
          />
        </div>
        <div className="campo">
          <label htmlFor={`comentario-${entrega.id}`}>Comentário para o aluno</label>
          <textarea
            id={`comentario-${entrega.id}`}
            rows={3}
            maxLength={2000}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
        </div>
        <div className="entregas-botoes">
          <button type="submit" className="botao botao-primario" disabled={salvando}>
            Salvar correção
          </button>
          {!devolvida && !confirmandoDevolver && (
            <button type="button" className="botao" onClick={() => setConfirmandoDevolver(true)} disabled={salvando}>
              Devolver para refazer
            </button>
          )}
        </div>
        {confirmandoDevolver && (
          <div className="entregas-confirmar" role="alertdialog" aria-label="Confirmar devolução">
            <p>
              Devolver a entrega de {aluno.nome}? Ele poderá mudar o código e entregar de novo. O comentário acima vai junto, e
              o XP que já ganhou não muda.
            </p>
            <div className="entregas-botoes">
              <button type="button" className="botao botao-primario" onClick={devolver} disabled={salvando}>
                Sim, devolver
              </button>
              <button type="button" className="botao" onClick={() => setConfirmandoDevolver(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      </form>
    </div>
  )
}
