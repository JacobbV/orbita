import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { normalizarSaida } from '../../lab/correcao'
import type { Executor } from '../../lab/executor'
import { criarExecutor, LINGUAGENS } from '../../lab/linguagens'
import { mensagemDeErro } from '../../lib/erros'
import { decidirReconferencia, type TipoDeTeste } from '../../lib/exercicios'
import {
  carregarProva,
  conferirResposta,
  dataHora,
  doCampoDeData,
  duracaoEmTexto,
  estadoDoAluno,
  liberarSegundaChamada,
  momentoDaProva,
  NOME_DA_SITUACAO_DA_RESPOSTA,
  nomeDasSaidas,
  paraCampoDeData,
  podePublicar,
  publicarNotas,
  respostasDaTentativa,
  respostasParaReconferir,
  resumoDaProva,
  saidasDaTentativa,
  situacaoDaProva,
  type ProvaParaEditar,
  type RespostaDoAluno,
  type SaidaDaProva,
  type SituacaoDoAluno,
} from '../../lib/provas'
import './Professor.css'
import './Exercicios.css'

const NOME_DO_MOMENTO = { antes: 'Ainda não abriu', aberta: 'Aberta', fechada: 'Fechada' } as const
const NOME_DO_ENCERRAMENTO = { aluno: 'o aluno entregou', tempo: 'acabou o tempo', saidas: 'encerrada por saídas da aba' } as const
const INTERVALO_MS = 10_000

const nota = (n: number) => String(n).replace('.', ',')

function minutosFora(s: SaidaDaProva): string {
  if (!s.voltouEm) return 'não voltou'
  const seg = Math.max(0, Math.round((new Date(s.voltouEm).getTime() - new Date(s.saiuEm).getTime()) / 1000))
  return seg < 60 ? `${seg} s fora` : `${Math.floor(seg / 60)} min ${seg % 60} s fora`
}

/** Acompanhar a prova: quem está fazendo, saídas da aba, respostas, segunda chamada, reconferência e notas. */
export function AcompanharProva() {
  const { provaId } = useParams()
  const id = Number(provaId)
  const [prova, setProva] = useState<ProvaParaEditar | null>(null)
  const [alunos, setAlunos] = useState<SituacaoDoAluno[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [reconferindo, setReconferindo] = useState(false)
  const [confirmandoPublicar, setConfirmandoPublicar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [recado, setRecado] = useState<string | null>(null)

  const atualizar = useCallback(async () => {
    const lista = await situacaoDaProva(id)
    setAlunos(lista)
    setAgora(Date.now())
  }, [id])

  useEffect(() => {
    let ativo = true
    Promise.all([carregarProva(id), situacaoDaProva(id)])
      .then(([p, lista]) => {
        if (!ativo) return
        if (!p) setErro('Prova não encontrada.')
        else {
          setProva(p)
          setAlunos(lista)
          setAgora(Date.now())
        }
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [id])

  // Atualiza sozinho enquanto a prova está aberta ou tem aluno fazendo.
  const resumo = alunos ? resumoDaProva(alunos, agora) : null
  const acompanhando = prova !== null && resumo !== null && (momentoDaProva(prova, agora) !== 'fechada' || resumo.fazendo > 0)
  useEffect(() => {
    if (!acompanhando || reconferindo) return
    const t = setInterval(() => {
      atualizar().catch(() => {})
    }, INTERVALO_MS)
    return () => clearInterval(t)
  }, [acompanhando, reconferindo, atualizar])

  if (erro) {
    return (
      <div className="painel container">
        <Aviso tipo="erro" titulo="Não foi possível abrir a prova">
          {erro}
        </Aviso>
        <Link to="/professor?aba=provas" className="botao">
          Voltar ao painel
        </Link>
      </div>
    )
  }
  if (!prova || !alunos || !resumo) return <Carregando />

  const momento = momentoDaProva(prova, agora)
  const publicavel = podePublicar(resumo)
  const publicada = prova.notasPublicadasEm !== null

  async function publicar(publicar: boolean) {
    setOcupado(true)
    setRecado(null)
    try {
      await publicarNotas(id, publicar)
      const p = await carregarProva(id)
      if (p) setProva(p)
      setRecado(publicar ? 'Notas publicadas. Cada aluno vê só a própria nota.' : 'Notas escondidas de novo.')
    } catch (e) {
      setRecado(mensagemDeErro(e))
    } finally {
      setOcupado(false)
      setConfirmandoPublicar(false)
    }
  }

  return (
    <div className="painel container exercicios-painel">
      <header className="cartao painel-topo">
        <div className="painel-topo-texto">
          <p className="pixel painel-selo">Acompanhar prova</p>
          <h1>{prova.titulo}</h1>
          <p className="painel-intro">
            {prova.oferta.turma.nome} · {prova.oferta.disciplina.sigla} · {NOME_DO_MOMENTO[momento]} · {dataHora(prova.abreEm)} até{' '}
            {dataHora(prova.fechaEm)} · {duracaoEmTexto(prova.duracaoMin)} · {nomeDasSaidas(prova.saidasParaEncerrar)}
          </p>
        </div>
        <div className="painel-botoes">
          <Link to={`/professor/prova/${prova.id}`} className="botao">
            Editar a prova
          </Link>
          <Link to="/professor?aba=provas" className="botao">
            Voltar ao painel
          </Link>
        </div>
      </header>

      <section className="cartao provas-resumo" aria-label="Resumo">
        <p className="provas-resumo-item">
          <strong>{resumo.total}</strong> alunos na turma
        </p>
        <p className="provas-resumo-item">
          <strong>{resumo.fazendo}</strong> fazendo agora
        </p>
        <p className="provas-resumo-item">
          <strong>{resumo.entregaram}</strong> entregaram
        </p>
        <p className="provas-resumo-item">
          <strong>{resumo.naoComecaram}</strong> não começaram
        </p>
        {acompanhando && <p className="campo-dica provas-resumo-nota">Atualiza sozinho a cada 10 segundos.</p>}
      </section>

      <section className="cartao provas-fechamento" aria-label="Reconferir e publicar">
        <h2>Fechar a prova</h2>
        <p className="campo-dica">
          O aluno testa a resposta no próprio navegador. Reconferir roda tudo de novo aqui, inclusive os testes secretos, e só depois as notas
          podem ser publicadas. A nota vem da média ponderada pelos pesos; resposta que não confere vale zero.
        </p>
        {reconferindo ? (
          <Reconferencia
            prova={prova}
            aoTerminar={async () => {
              await atualizar().catch(() => {})
            }}
            aoFechar={() => setReconferindo(false)}
          />
        ) : (
          <div className="painel-botoes">
            <button type="button" className="botao" disabled={resumo.aConfirmar === 0 || ocupado} onClick={() => setReconferindo(true)}>
              Reconferir respostas ({resumo.aConfirmar})
            </button>
            {!publicada ? (
              <button
                type="button"
                className="botao botao-primario"
                disabled={!publicavel.pode || ocupado}
                onClick={() => setConfirmandoPublicar((c) => !c)}
              >
                Publicar notas
              </button>
            ) : (
              <button type="button" className="botao" disabled={ocupado} onClick={() => publicar(false)}>
                Esconder as notas
              </button>
            )}
          </div>
        )}
        {!reconferindo && !publicada && publicavel.motivo && <p className="campo-dica">{publicavel.motivo}</p>}
        {publicada && prova.notasPublicadasEm && (
          <p className="provas-publicada">Notas publicadas em {dataHora(prova.notasPublicadasEm)}. Quem fizer segunda chamada vê a nota ao entregar.</p>
        )}
        {confirmandoPublicar && (
          <div className="painel-confirmar">
            <p>
              Publicar as notas agora? Cada aluno passa a ver a própria nota
              {resumo.naoComecaram > 0 && `. ${resumo.naoComecaram} ${resumo.naoComecaram === 1 ? 'aluno ainda não fez' : 'alunos ainda não fizeram'} a prova`}.
            </p>
            <div className="painel-botoes">
              <button type="button" className="botao botao-primario" disabled={ocupado} onClick={() => publicar(true)}>
                Sim, publicar
              </button>
              <button type="button" className="botao" onClick={() => setConfirmandoPublicar(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        {recado && <Aviso tipo="info">{recado}</Aviso>}
      </section>

      <section aria-labelledby="provas-alunos-titulo">
        <h2 id="provas-alunos-titulo">Alunos</h2>
        <ul className="provas-alunos" role="list">
          {alunos.map((a) => (
            <LinhaDoAluno key={a.alunoId} prova={prova} aluno={a} agora={agora} aoMudar={atualizar} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function LinhaDoAluno({ prova, aluno, agora, aoMudar }: { prova: ProvaParaEditar; aluno: SituacaoDoAluno; agora: number; aoMudar: () => Promise<void> }) {
  const estado = estadoDoAluno(aluno, agora)
  const [aberto, setAberto] = useState<null | 'respostas' | 'segunda'>(null)
  const nomeDeExibicao = aluno.apelido ? `${aluno.nome} (${aluno.apelido})` : aluno.nome
  return (
    <li className="cartao provas-aluno">
      <div className="provas-aluno-topo">
        <div className="provas-aluno-texto">
          <p className="provas-aluno-nome">
            {nomeDeExibicao}
            {aluno.segundaChamada && <span className="provas-etiqueta">2ª chamada</span>}
          </p>
          <p className="provas-item-meta">
            {estado === 'nao_comecou' && 'Não começou'}
            {estado === 'fazendo' && `Fazendo agora · começou ${dataHora(aluno.comecouEm!)}`}
            {estado === 'entregue' && `Entregue${aluno.encerradaPor ? ` (${NOME_DO_ENCERRAMENTO[aluno.encerradaPor]})` : ''}`}
            {aluno.comecouEm && (
              <>
                {' · '}
                {aluno.respondidas} de {prova.questoes} {prova.questoes === 1 ? 'questão salva' : 'questões salvas'}
                {' · '}
                <span className={aluno.saidas > 0 ? 'provas-saidas-alerta' : undefined}>
                  {aluno.saidas === 0 ? 'nenhuma saída da aba' : `${aluno.saidas} ${aluno.saidas === 1 ? 'saída' : 'saídas'} da aba`}
                </span>
              </>
            )}
            {aluno.nota !== null && estado === 'entregue' && (
              <>
                {' · nota '}
                <strong>{nota(aluno.nota)}</strong>
                {aluno.aConfirmar > 0 && ' (provisória)'}
              </>
            )}
          </p>
        </div>
        <div className="painel-botoes">
          {aluno.tentativaId !== null && (
            <button
              type="button"
              className="botao botao-compacto"
              aria-expanded={aberto === 'respostas'}
              aria-label={`Ver respostas de ${aluno.nome}`}
              onClick={() => setAberto(aberto === 'respostas' ? null : 'respostas')}
            >
              Ver respostas
            </button>
          )}
          <button
            type="button"
            className="botao botao-compacto"
            aria-expanded={aberto === 'segunda'}
            aria-label={`Segunda chamada de ${aluno.nome}`}
            onClick={() => setAberto(aberto === 'segunda' ? null : 'segunda')}
          >
            Segunda chamada
          </button>
        </div>
      </div>
      {aberto === 'respostas' && aluno.tentativaId !== null && <RespostasDoAluno prova={prova} aluno={aluno} tentativaId={aluno.tentativaId} />}
      {aberto === 'segunda' && (
        <SegundaChamada
          prova={prova}
          aluno={aluno}
          aoSalvar={async () => {
            setAberto(null)
            await aoMudar()
          }}
          aoCancelar={() => setAberto(null)}
        />
      )}
    </li>
  )
}

function RespostasDoAluno({ prova, aluno, tentativaId }: { prova: ProvaParaEditar; aluno: SituacaoDoAluno; tentativaId: number }) {
  const [dados, setDados] = useState<{ respostas: RespostaDoAluno[]; saidas: SaidaDaProva[] } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    Promise.all([respostasDaTentativa(tentativaId), saidasDaTentativa(tentativaId)])
      .then(([respostas, saidas]) => {
        if (ativo) setDados({ respostas, saidas })
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [tentativaId])

  if (erro) return <Aviso tipo="erro">{erro}</Aviso>
  if (!dados) return <p className="campo-dica">Carregando…</p>
  return (
    <div className="provas-detalhe">
      {dados.saidas.length > 0 && (
        <div>
          <p className="exercicio-rotulo">Saídas da aba</p>
          <ul className="provas-saidas" role="list">
            {dados.saidas.map((s, i) => (
              <li key={i}>
                {dataHora(s.saiuEm)} · {minutosFora(s)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {prova.listaDeQuestoes.map((q, i) => {
        const r = dados.respostas.find((x) => x.questaoId === q.questaoId)
        return (
          <div key={q.exercicioId} className="provas-resposta">
            <p className="provas-questao-titulo">
              {i + 1}. {q.titulo} <span className="provas-etiqueta">peso {nota(q.peso)}</span>
            </p>
            {r ? (
              <>
                <p className="provas-item-meta">
                  {r.testesCertos} de {r.testesTotal} testes certos · {NOME_DA_SITUACAO_DA_RESPOSTA[r.situacao]} · salva {r.respostas}{' '}
                  {r.respostas === 1 ? 'vez' : 'vezes'}, a última {dataHora(r.respondidaEm)}
                </p>
                <pre className="provas-codigo" tabIndex={0} aria-label={`Código de ${aluno.nome} na questão ${i + 1}`}>
                  {r.codigo}
                </pre>
              </>
            ) : (
              <p className="provas-item-meta">Sem resposta salva (vale zero).</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function proximaHoraCheia(): Date {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d
}

function SegundaChamada({
  prova,
  aluno,
  aoSalvar,
  aoCancelar,
}: {
  prova: ProvaParaEditar
  aluno: SituacaoDoAluno
  aoSalvar: () => Promise<void>
  aoCancelar: () => void
}) {
  const id = useId()
  const [abre, setAbre] = useState(() => paraCampoDeData(proximaHoraCheia().toISOString()))
  const [fecha, setFecha] = useState(() => paraCampoDeData(new Date(proximaHoraCheia().getTime() + 2 * 3600_000).toISOString()))
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const a = doCampoDeData(abre)
    const f = doCampoDeData(fecha)
    if (!a || !f) return setErro('Escolha o dia e a hora de abrir e de fechar.')
    if (new Date(f) <= new Date(a)) return setErro('O horário de fechar precisa ser depois do de abrir.')
    setEnviando(true)
    setErro(null)
    try {
      await liberarSegundaChamada(prova.id, aluno.alunoId, a, f)
      await aoSalvar()
    } catch (e2) {
      setErro(mensagemDeErro(e2))
      setEnviando(false)
    }
  }

  return (
    <form className="provas-segunda" onSubmit={enviar} noValidate aria-label={`Segunda chamada de ${aluno.nome}`}>
      <p className="campo-dica">
        Só este aluno ganha o novo horário. {aluno.tentativaId !== null && 'A tentativa que ele já tem nesta prova é apagada, com as respostas.'}
      </p>
      <div className="provas-campos-lado">
        <div className="campo">
          <label htmlFor={`${id}-abre`}>Abre em</label>
          <input id={`${id}-abre`} type="datetime-local" value={abre} onChange={(e) => setAbre(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor={`${id}-fecha`}>Fecha em</label>
          <input id={`${id}-fecha`} type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="painel-botoes">
        <button type="submit" className="botao botao-primario" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Liberar segunda chamada'}
        </button>
        <button type="button" className="botao" disabled={enviando} onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

type Linha = { id: number; aluno: string; confere: boolean; motivo: string; questao: string }

/** Roda no navegador do professor todos os testes (secretos também) em cada resposta a confirmar. */
function Reconferencia({ prova, aoTerminar, aoFechar }: { prova: ProvaParaEditar; aoTerminar: () => Promise<void>; aoFechar: () => void }) {
  const [estado, setEstado] = useState<'carregando' | 'rodando' | 'pronto'>('carregando')
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [total, setTotal] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const executores = useRef<Record<string, Executor>>({})
  const iniciou = useRef(false)

  useEffect(() => {
    if (iniciou.current) return
    iniciou.current = true
    const todos = executores.current
    ;(async () => {
      try {
        const respostas = await respostasParaReconferir(prova.id)
        setTotal(respostas.length)
        for (const q of prova.listaDeQuestoes) {
          if (respostas.some((r) => r.questaoId === q.questaoId)) {
            todos[q.linguagem] ??= criarExecutor(q.linguagem)
            await todos[q.linguagem]!.carregar()
          }
        }
        setEstado('rodando')
        for (const r of respostas) {
          const questao = prova.listaDeQuestoes.find((q) => q.questaoId === r.questaoId)
          if (!questao) continue
          const executor = todos[questao.linguagem]!
          const resultados: { tipo: TipoDeTeste; certo: boolean }[] = []
          for (const t of questao.testes) {
            const saida = await executor.rodar(r.codigo, t.entrada, false)
            const certo = !saida.erro && !saida.tempoEsgotado && normalizarSaida(saida.saida) === normalizarSaida(t.saidaEsperada)
            resultados.push({ tipo: t.tipo, certo })
          }
          const decisao = decidirReconferencia(r, resultados)
          await conferirResposta(r.id, decisao.confere)
          setLinhas((l) => [...l, { id: r.id, aluno: r.aluno, confere: decisao.confere, motivo: decisao.motivo, questao: questao.titulo }])
        }
        setEstado('pronto')
        await aoTerminar()
      } catch (e) {
        setErro(e instanceof Error && e.message.startsWith('Não foi possível carregar') ? e.message : mensagemDeErro(e))
        setEstado('pronto')
      }
    })()
    return () => {
      for (const e of Object.values(todos)) e.encerrar()
    }
    // Roda uma vez por abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirmadas = linhas.filter((l) => l.confere).length
  const linguagens = [...new Set(prova.listaDeQuestoes.map((q) => LINGUAGENS[q.linguagem].nome))].join(', ')
  return (
    <div className="exercicios-reconferencia" role="region" aria-label="Reconferência da prova">
      <p className="exercicios-reconferencia-titulo">
        {estado === 'carregando' && `Preparando ${linguagens}…`}
        {estado === 'rodando' && `Reconferindo… ${linhas.length} de ${total}`}
        {estado === 'pronto' && !erro && `Pronto: ${confirmadas} ${confirmadas === 1 ? 'confirmada' : 'confirmadas'} e ${linhas.length - confirmadas} sem conferir.`}
      </p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {linhas.length > 0 && (
        <ul className="exercicios-reconferencia-lista" role="list">
          {linhas.map((l) => (
            <li key={l.id} className={l.confere ? 'exercicios-confere' : 'exercicios-nao-confere'}>
              <span aria-hidden="true">{l.confere ? '✓' : '✗'}</span> <strong>{l.aluno}</strong> ({l.questao}): {l.motivo}
            </li>
          ))}
        </ul>
      )}
      {estado === 'pronto' && (
        <button type="button" className="botao" onClick={aoFechar}>
          Fechar
        </button>
      )}
    </div>
  )
}
