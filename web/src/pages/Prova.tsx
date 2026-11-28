import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { CaixaDoEnunciado } from '../components/CaixaDoEnunciado'
import { modoDoExercicio, saidaConfere } from '../lab/correcao'
import { EditorCodigo } from '../lab/EditorCodigo'
import type { Executor, ResultadoDaExecucao } from '../lab/executor'
import { criarExecutor, LINGUAGENS } from '../lab/linguagens'
import { Terminal } from '../lab/Terminal'
import { mensagemDeErro } from '../lib/erros'
import { useModoNinja } from '../ninja/ModoNinja'
import {
  comecarProva,
  dataHora,
  duracaoEmTexto,
  entregarProva,
  estadoDaProvaDoAluno,
  guardarRascunhoDaQuestao,
  lerRascunhoDaQuestao,
  minhasProvas,
  nomeDasSaidas,
  notaDoTreino,
  provaDoNinja,
  questoesDaProva,
  questoesDaProvaNinja,
  registrarSaida,
  registrarVolta,
  responderQuestao,
  type ProvaDoAluno,
  type QuestaoDaProva,
} from '../lib/provas'
import { SaidaDoPrograma } from './Exercicio'
import './Exercicio.css'
import './Prova.css'

type Fase = 'intro' | 'fazendo' | 'fim'
type ResultadoTeste = { numero: number; tipo: 'visivel' | 'oculto'; certo: boolean; esperado: string | null; entrada: string; resultado: ResultadoDaExecucao }
type Salva = { codigo: string; certos: number; total: number }
/** O que o terminal mostra: o código que está rodando, as respostas já digitadas e a saída. */
type SessaoDoTerminal = { codigo: string; respostas: string[]; resultado: ResultadoDaExecucao }
const juntarRespostas = (respostas: string[]) => respostas.map((r) => `${r}\n`).join('')

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))

function relogio(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const dois = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`
}

function sairDaTelaCheia() {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
}

/**
 * Fazer uma prova: cronômetro, tela cheia, colar desligado e registro de saída da aba.
 * No Modo Ninja vira prova de treino: abre a qualquer hora e nada vai para o banco
 * (sem tentativa, resposta, saída registrada, nota nem XP).
 */
export function Prova() {
  const { provaId } = useParams()
  const id = Number(provaId)
  const ninja = useModoNinja().ativo
  const voltar = ninja ? '/ninja' : '/ponte'
  const [prova, setProva] = useState<ProvaDoAluno | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [fase, setFase] = useState<Fase>('intro')
  const [comecando, setComecando] = useState(false)
  const [erroAoComecar, setErroAoComecar] = useState<string | null>(null)
  const [questoes, setQuestoes] = useState<QuestaoDaProva[]>([])
  const [terminaEm, setTerminaEm] = useState<number | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [saidas, setSaidas] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvas, setSalvas] = useState<Record<number, Salva>>({})
  const [confirmando, setConfirmando] = useState(false)
  const [entregando, setEntregando] = useState(false)
  const [fechando, setFechando] = useState(false)
  const fechandoRef = useRef(false)
  const saidasNinja = useRef(0)
  // Para a nota do treino sem refazer os ouvintes da aba a cada resposta salva.
  const treino = useRef<{ questoes: QuestaoDaProva[]; salvas: Record<number, Salva> }>({ questoes: [], salvas: {} })
  useEffect(() => {
    treino.current = { questoes, salvas }
  }, [questoes, salvas])

  // Carrega a prova (e a situação do aluno nela).
  useEffect(() => {
    let ativo = true
    const carregar = ninja ? provaDoNinja(id) : minhasProvas().then((lista) => lista.find((x) => x.id === id) ?? null)
    carregar
      .then((p) => {
        if (!ativo) return
        if (!p) setErro('Prova não encontrada.')
        else setProva(p)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [id, ninja])

  const terminar = useCallback(async (encerradaPor: ProvaDoAluno['encerradaPor'] = 'aluno') => {
    sairDaTelaCheia()
    if (ninja) {
      // Treino: a nota é calculada aqui mesmo e não fica salva.
      setProva((p) => p && { ...p, entregueEm: new Date().toISOString(), encerradaPor, nota: notaDoTreino(treino.current.questoes, treino.current.salvas) })
      setFase('fim')
      return
    }
    try {
      const lista = await minhasProvas()
      const p = lista.find((x) => x.id === id)
      if (p) setProva(p)
    } catch {
      // A tela final aparece do mesmo jeito; a situação atualiza na próxima visita.
    }
    setFase('fim')
  }, [id, ninja])

  async function comecar() {
    // A tela cheia só abre em resposta ao clique, por isso vem antes de qualquer espera.
    void document.documentElement.requestFullscreen?.().catch(() => {})
    setComecando(true)
    setErroAoComecar(null)
    try {
      const fim = ninja ? new Date(Date.now() + (prova?.duracaoMin ?? 60) * 60_000).toISOString() : await comecarProva(id)
      const lista = ninja ? await questoesDaProvaNinja(id) : await questoesDaProva(id)
      saidasNinja.current = 0
      setSaidas(0)
      const guardadas: Record<number, Salva> = {}
      for (const q of lista) {
        if (q.minhaResposta !== null) guardadas[q.questaoId] = { codigo: q.minhaResposta, certos: -1, total: q.testes.length }
      }
      setSalvas(guardadas)
      setQuestoes(lista)
      setTerminaEm(new Date(fim).getTime())
      setAgora(Date.now())
      setFase('fazendo')
    } catch (e) {
      sairDaTelaCheia()
      setErroAoComecar(mensagemDeErro(e))
    } finally {
      setComecando(false)
    }
  }

  // Cronômetro.
  useEffect(() => {
    if (fase !== 'fazendo') return
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [fase])

  // O tempo acabou: o banco encerra sozinho no horário dele; aqui só se espera a confirmação.
  const acabou = fase === 'fazendo' && terminaEm !== null && agora >= terminaEm
  useEffect(() => {
    if (!acabou || fechandoRef.current) return
    fechandoRef.current = true
    setFechando(true)
    void (async () => {
      // No treino do ninja não há banco para confirmar: encerra na hora.
      for (let i = 0; !ninja && i < 30; i++) {
        try {
          const lista = await minhasProvas()
          const p = lista.find((x) => x.id === id)
          if (p?.entregueEm) break
        } catch {
          // Tenta de novo.
        }
        await dormir(2000)
      }
      await terminar('tempo')
      setFechando(false)
    })()
  }, [acabou, id, ninja, terminar])

  // Saída da aba ou da janela: o site registra e avisa, mas não impede.
  useEffect(() => {
    if (fase !== 'fazendo') return
    let fora = false
    async function saiu() {
      if (fora) return
      fora = true
      if (ninja) {
        // Treino: conta só aqui na tela, para o professor ver o aviso que o aluno vê.
        saidasNinja.current += 1
        const n = saidasNinja.current
        const limite = prova?.saidasParaEncerrar ?? null
        setSaidas(n)
        if (limite && n >= limite) {
          await terminar('saidas')
          return
        }
        setAviso(
          limite
            ? `Você saiu da prova ${n} ${n === 1 ? 'vez' : 'vezes'}. Ela encerra na ${limite}ª saída.`
            : `Você saiu da prova ${n} ${n === 1 ? 'vez' : 'vezes'}. O professor vê isso.`,
        )
        return
      }
      try {
        const r = await registrarSaida(id)
        setSaidas(r.saidas)
        if (r.encerrada) {
          await terminar()
          return
        }
        setAviso(
          r.limite
            ? `Você saiu da prova ${r.saidas} ${r.saidas === 1 ? 'vez' : 'vezes'}. Ela encerra na ${r.limite}ª saída.`
            : `Você saiu da prova ${r.saidas} ${r.saidas === 1 ? 'vez' : 'vezes'}. O professor vê isso.`,
        )
      } catch {
        // Sem rede ou prova já encerrada: o próximo contato com o banco confirma a situação.
      }
    }
    function voltou() {
      if (!fora) return
      fora = false
      if (!ninja) registrarVolta(id).catch(() => {})
    }
    const aoMudarVisibilidade = () => {
      if (document.hidden) void saiu()
      else if (document.hasFocus()) voltou()
    }
    const aoPerderFoco = () =>
      setTimeout(() => {
        // Clicar na prévia da página (moldura) tira o foco da janela, mas não é sair.
        if (document.activeElement?.tagName === 'IFRAME') return
        if (!document.hasFocus()) void saiu()
      }, 0)
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    window.addEventListener('blur', aoPerderFoco)
    window.addEventListener('focus', voltou)
    return () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      window.removeEventListener('blur', aoPerderFoco)
      window.removeEventListener('focus', voltou)
    }
  }, [fase, id, ninja, prova?.saidasParaEncerrar, terminar])

  async function entregar() {
    setEntregando(true)
    try {
      if (!ninja) await entregarProva(id)
    } catch (e) {
      // "Já foi entregue" quer dizer que o tempo acabou ou a prova já encerrou: vale o mesmo caminho.
      const texto = mensagemDeErro(e)
      if (!texto.includes('já foi entregue')) {
        setAviso(texto)
        setEntregando(false)
        setConfirmando(false)
        return
      }
    }
    await terminar()
    setEntregando(false)
  }

  if (erro) {
    return (
      <div className="prova container">
        <Aviso tipo="erro" titulo="Não foi possível abrir a prova">
          {erro}
        </Aviso>
        <Link to={voltar} className="botao">
          Voltar à ponte
        </Link>
      </div>
    )
  }
  if (!prova) return <Carregando />

  if (fase === 'fim') return <Fim prova={prova} ninja={ninja} />

  if (fase === 'intro') {
    return <Intro prova={prova} comecando={comecando} erro={erroAoComecar} aoComecar={comecar} ninja={ninja} />
  }

  const restante = (terminaEm ?? 0) - agora
  const respondidas = questoes.filter((q) => salvas[q.questaoId]).length

  return (
    <div className="prova prova-fazendo container">
      <header className="cartao prova-barra">
        <div className="prova-barra-texto">
          <p className="pixel prova-selo">{ninja ? 'Treino em andamento' : 'Prova em andamento'}</p>
          <h1>{prova.titulo}</h1>
        </div>
        <p className={`prova-relogio${restante <= 60_000 ? ' prova-relogio-fim' : restante <= 300_000 ? ' prova-relogio-pouco' : ''}`} role="timer" aria-label="Tempo que falta">
          {relogio(restante)}
        </p>
      </header>

      {aviso && (
        <Aviso tipo="atencao" titulo="Atenção">
          {aviso}
        </Aviso>
      )}
      {fechando && <Aviso tipo="info">O tempo acabou. Confirmando a entrega…</Aviso>}

      {!fechando && (
        <>
          <QuestoesDaProva
            provaId={id}
            questoes={questoes}
            salvas={salvas}
            aoSalvar={(qid, s) => setSalvas((x) => ({ ...x, [qid]: s }))}
            aoBloquearColar={() => setAviso('Colar está desligado na prova. Digite o código.')}
            salvar={ninja ? async () => {} : responderQuestao}
          />

          <section className="cartao prova-entregar" aria-label="Entregar a prova">
            {!confirmando ? (
              <>
                <p>
                  Você salvou {respondidas} de {questoes.length} {questoes.length === 1 ? 'questão' : 'questões'}.
                  {saidas > 0 && ` Saídas da aba até agora: ${saidas}.`}
                </p>
                <button type="button" className="botao botao-primario" onClick={() => setConfirmando(true)}>
                  Entregar a prova
                </button>
              </>
            ) : (
              <>
                <p>
                  Depois de entregar não dá para voltar. Questão sem resposta salva vale zero. Entregar agora?
                </p>
                <div className="prova-botoes">
                  <button type="button" className="botao botao-primario" disabled={entregando} onClick={entregar}>
                    {entregando ? 'Entregando…' : 'Sim, entregar'}
                  </button>
                  <button type="button" className="botao" disabled={entregando} onClick={() => setConfirmando(false)}>
                    Voltar à prova
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function Intro({
  prova,
  comecando,
  erro,
  aoComecar,
  ninja = false,
}: {
  prova: ProvaDoAluno
  comecando: boolean
  erro: string | null
  aoComecar: () => void
  ninja?: boolean
}) {
  // O ninja treina a qualquer hora, como se a prova estivesse aberta.
  const estado = ninja ? 'aberta' : estadoDaProvaDoAluno(prova)
  return (
    <div className="prova container">
      <Link to={ninja ? '/ninja' : '/ponte'} className="exercicio-voltar">
        ← Voltar
      </Link>
      <header className="cartao prova-intro">
        <p className="pixel prova-selo">Prova</p>
        <h1>{prova.titulo}</h1>
        <p className="prova-meta">
          Abre {dataHora(prova.abreEm)} · fecha {dataHora(prova.fechaEm)} · {duracaoEmTexto(prova.duracaoMin)} · {prova.questoes}{' '}
          {prova.questoes === 1 ? 'questão' : 'questões'}
        </p>
        {prova.instrucoes && <div className="exercicio-enunciado">{prova.instrucoes}</div>}

        <h2>Como funciona</h2>
        <ul className="prova-regras">
          <li>O tempo começa quando você clica em começar e não para. Se fechar a aba, ele continua correndo.</li>
          <li>
            Só vale o que você salvar com <strong>Testar e salvar resposta</strong>. Vale a última resposta salva de cada questão.
          </li>
          <li>Colar texto no editor fica desligado.</li>
          <li>
            O site percebe quando você troca de aba ou de janela e avisa o professor. {nomeDasSaidas(prova.saidasParaEncerrar)}.
            Ele não consegue impedir a saída, nem ver outro aparelho.
          </li>
          <li>A nota só aparece para você depois que o professor publicar.</li>
        </ul>

        {ninja && (
          <Aviso tipo="info" titulo="Prova de treino do Modo Ninja">
            Abre a qualquer hora, com o mesmo tempo, as mesmas questões e os mesmos avisos que o aluno vê. Nada é salvo:
            nenhuma tentativa, resposta, saída da aba ou nota vai para o banco, e ninguém ganha XP.
          </Aviso>
        )}

        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        {estado === 'antes' && <Aviso tipo="info">A prova ainda não abriu. Ela abre {dataHora(prova.abreEm)}.</Aviso>}
        {estado === 'perdida' && <Aviso tipo="erro">O horário da prova já fechou. Fale com o professor sobre a segunda chamada.</Aviso>}
        {estado === 'entregue' && <Fim prova={prova} dentro />}
        {(estado === 'aberta' || estado === 'em_andamento') && (
          <button type="button" className="botao botao-primario" disabled={comecando} onClick={aoComecar}>
            {comecando ? 'Abrindo…' : ninja ? 'Começar o treino' : estado === 'em_andamento' ? 'Continuar a prova' : 'Começar a prova'}
          </button>
        )}
      </header>
    </div>
  )
}

function Fim({ prova, dentro = false, ninja = false }: { prova: ProvaDoAluno; dentro?: boolean; ninja?: boolean }) {
  const motivo =
    prova.encerradaPor === 'tempo'
      ? 'O tempo acabou e a prova foi entregue.'
      : prova.encerradaPor === 'saidas'
        ? 'A prova foi encerrada porque você saiu da aba mais vezes do que o professor permitiu.'
        : 'Prova entregue.'
  const conteudo = (
    <>
      <Aviso tipo={prova.encerradaPor === 'saidas' ? 'atencao' : 'sucesso'} titulo="Prova encerrada">
        {motivo}
      </Aviso>
      <p>
        {ninja
          ? `Nota do treino: ${String(prova.nota ?? 0).replace('.', ',')} (de 0 a 10). Ela não fica salva; para o aluno, a nota só aparece depois que o professor publicar.`
          : prova.nota !== null
            ? `Sua nota: ${String(prova.nota).replace('.', ',')} (de 0 a 10).`
            : 'A nota aparece aqui quando o professor publicar.'}
      </p>
      {!dentro && (
        <Link to={ninja ? '/ninja' : '/ponte'} className="botao botao-primario">
          Voltar à ponte
        </Link>
      )}
    </>
  )
  if (dentro) return <div className="prova-fim">{conteudo}</div>
  return (
    <div className="prova container">
      <header className="cartao prova-intro">
        <p className="pixel prova-selo">{prova.titulo}</p>
        {conteudo}
      </header>
    </div>
  )
}

function QuestoesDaProva({
  provaId,
  questoes,
  salvas,
  aoSalvar,
  aoBloquearColar,
  salvar,
}: {
  provaId: number
  questoes: QuestaoDaProva[]
  salvas: Record<number, Salva>
  aoSalvar: (questaoId: number, s: Salva) => void
  aoBloquearColar: () => void
  /** Guarda a resposta no banco (no treino do ninja, não guarda nada). */
  salvar: (questaoId: number, codigo: string, testesCertos: number) => Promise<void>
}) {
  const [ativa, setAtiva] = useState(0)
  const [codigos, setCodigos] = useState<Record<number, string>>(() =>
    Object.fromEntries(questoes.map((q) => [q.questaoId, lerRascunhoDaQuestao(provaId, q.questaoId) ?? q.minhaResposta ?? q.codigoInicial])),
  )
  const [ocupado, setOcupado] = useState<null | 'carregando' | 'rodando' | 'testando' | 'salvando'>(null)
  const [falha, setFalha] = useState<string | null>(null)
  const [sessao, setSessao] = useState<SessaoDoTerminal | null>(null)
  const [resultados, setResultados] = useState<Record<number, ResultadoTeste[]>>({})
  const [erroAoSalvar, setErroAoSalvar] = useState<string | null>(null)
  const executores = useRef<Record<string, Executor>>({})

  useEffect(() => {
    const todos = executores.current
    return () => {
      for (const e of Object.values(todos)) e.encerrar()
    }
  }, [])

  const q = questoes[ativa]
  if (!q) return <Aviso tipo="erro">Esta prova não tem questões.</Aviso>
  const linguagem = LINGUAGENS[q.linguagem]
  const codigo = codigos[q.questaoId] ?? ''
  const ehHtml = q.linguagem === 'html'
  const visiveis = q.testes.filter((t) => t.tipo === 'visivel')
  const salva = salvas[q.questaoId]
  const lista = resultados[q.questaoId]

  function mudarCodigo(novo: string) {
    setCodigos((c) => ({ ...c, [q!.questaoId]: novo }))
    guardarRascunhoDaQuestao(provaId, q!.questaoId, novo)
  }

  async function preparar(): Promise<Executor | null> {
    executores.current[q!.linguagem] ??= criarExecutor(q!.linguagem)
    setFalha(null)
    setOcupado('carregando')
    try {
      await executores.current[q!.linguagem]!.carregar()
      return executores.current[q!.linguagem]!
    } catch (e) {
      setFalha(mensagemDeErro(e))
      setOcupado(null)
      return null
    }
  }

  async function rodarNoTerminal(ex: Executor, codigoRodado: string, respostas: string[]) {
    setOcupado('rodando')
    const resultado = await ex.rodar(codigoRodado, juntarRespostas(respostas), true)
    setSessao({ codigo: codigoRodado, respostas, resultado })
    setOcupado(null)
  }

  async function rodar() {
    const ex = await preparar()
    if (!ex) return
    setSessao(null)
    await rodarNoTerminal(ex, codigo, [])
  }

  async function responder(resposta: string) {
    const ex = executores.current[q!.linguagem]
    if (!ex || !sessao) return
    await rodarNoTerminal(ex, sessao.codigo, [...sessao.respostas, resposta])
  }

  async function testarESalvar() {
    const ex = await preparar()
    if (!ex) return
    setOcupado('testando')
    setErroAoSalvar(null)
    const feitos: ResultadoTeste[] = []
    for (const [i, t] of q!.testes.entries()) {
      const resultado = await ex.rodar(codigo, t.entrada, false)
      const certo = !resultado.erro && !resultado.tempoEsgotado && (await saidaConfere(t, resultado.saida))
      feitos.push({ numero: i + 1, tipo: t.tipo, certo, esperado: t.saida_esperada, entrada: t.entrada, resultado })
    }
    setResultados((r) => ({ ...r, [q!.questaoId]: feitos }))
    const certos = feitos.filter((f) => f.certo).length
    setOcupado('salvando')
    try {
      await salvar(q!.questaoId, codigo, certos)
      aoSalvar(q!.questaoId, { codigo, certos, total: feitos.length })
    } catch (e) {
      setErroAoSalvar(mensagemDeErro(e))
    }
    setOcupado(null)
  }

  const mudouDepois = salva && salva.codigo !== codigo

  return (
    <div className="prova-questoes">
      <nav className="prova-abas" aria-label="Questões">
        {questoes.map((x, i) => (
          <button
            key={x.questaoId}
            type="button"
            className={`prova-aba${i === ativa ? ' prova-aba-ativa' : ''}${salvas[x.questaoId] ? ' prova-aba-salva' : ''}`}
            aria-current={i === ativa ? 'true' : undefined}
            disabled={ocupado !== null}
            onClick={() => {
              setAtiva(i)
              setSessao(null)
              setFalha(null)
              setErroAoSalvar(null)
            }}
          >
            Questão {i + 1}
            {salvas[x.questaoId] && <span className="sr-only"> (resposta salva)</span>}
            {salvas[x.questaoId] && <span aria-hidden="true"> ✓</span>}
          </button>
        ))}
      </nav>

      <header className="cartao exercicio-topo">
        <p className="pixel exercicio-selo">
          Questão {ativa + 1} de {questoes.length} · peso {String(q.peso).replace('.', ',')}
        </p>
        <h2>{q.titulo}</h2>
        <p className="exercicio-etiquetas">
          <span className="exercicio-etiqueta">{linguagem.nome}</span>
        </p>
        <CaixaDoEnunciado texto={q.enunciado} modo={modoDoExercicio(q.testes)} />
        {visiveis.length > 0 && (
          <div className="exercicio-exemplos">
            {visiveis.map((t, i) => (
              <div key={t.id} className="exercicio-exemplo">
                <p className="exercicio-exemplo-titulo">Exemplo {i + 1}</p>
                <div className="exercicio-exemplo-colunas">
                  <div>
                    <p className="exercicio-rotulo">{linguagem.entrada}</p>
                    <pre>{t.entrada || '(nenhuma)'}</pre>
                  </div>
                  <div>
                    <p className="exercicio-rotulo">{linguagem.saida}</p>
                    <pre>{t.saida_esperada}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      <section className="exercicio-bancada" aria-label="Seu código">
        <div className="exercicio-editor">
          <div className="exercicio-editor-barra">
            <span className="pixel">{linguagem.arquivo}</span>
          </div>
          <EditorCodigo
            key={q.questaoId}
            valor={codigo}
            aoMudar={mudarCodigo}
            rotulo={`Editor de código da questão ${ativa + 1}`}
            linguagem={q.linguagem}
            bloquearColar
            aoBloquearColar={aoBloquearColar}
          />
        </div>

        <div className="exercicio-lateral">
          {ehHtml ? (
            <PreviaDaProva codigo={codigo} />
          ) : (
            <Terminal
              resultado={sessao?.resultado ?? null}
              ocupado={ocupado === 'carregando' || ocupado === 'rodando'}
              mensagemOcupado={
                ocupado === 'carregando' && q.linguagem === 'python'
                  ? 'Carregando o Python… Na primeira vez pode levar alguns segundos.'
                  : ocupado === 'carregando'
                    ? `Preparando o ${linguagem.nome}…`
                    : 'Rodando o seu código…'
              }
              respostasDadas={sessao?.respostas.length ?? 0}
              aoResponder={responder}
              linguagem={q.linguagem}
            />
          )}
          <div className="exercicio-botoes">
            {!ehHtml && (
              <button type="button" className="botao" onClick={rodar} disabled={ocupado !== null}>
                ▶ Rodar
              </button>
            )}
            <button type="button" className="botao botao-primario" onClick={testarESalvar} disabled={ocupado !== null || q.testes.length === 0}>
              ✓ Testar e salvar resposta
            </button>
          </div>
          <p className="exercicio-status" role="status">
            {ocupado === 'testando' && 'Conferindo os testes…'}
            {ocupado === 'salvando' && 'Salvando a resposta…'}
          </p>
          {falha && (
            <Aviso tipo="erro" titulo={`${linguagem.nome} indisponível`}>
              {falha}
            </Aviso>
          )}
          {erroAoSalvar && <Aviso tipo="erro">{erroAoSalvar}</Aviso>}
          {!erroAoSalvar && salva && !mudouDepois && (
            <p className="prova-salva">
              Resposta salva{salva.certos >= 0 ? `: ${salva.certos} de ${salva.total} testes certos.` : '.'}
            </p>
          )}
          {mudouDepois && <p className="prova-salva prova-salva-velha">Você mudou o código depois de salvar. Só vale o que foi salvo.</p>}
        </div>
      </section>

      {lista && (
        <section className="cartao exercicio-resultados" aria-label="Resultado dos testes">
          <h3>
            {lista.filter((r) => r.certo).length} de {lista.length} testes certos
          </h3>
          <ol className="exercicio-testes" role="list">
            {lista.map((r) => (
              <li key={r.numero} className={r.certo ? 'exercicio-teste-certo' : 'exercicio-teste-errado'}>
                <p className="exercicio-teste-titulo">
                  <span aria-hidden="true">{r.certo ? '✓' : '✗'}</span> Teste {r.numero} {r.tipo === 'oculto' ? '(oculto)' : '(visível)'}
                  <span className="sr-only">{r.certo ? ': certo' : ': errado'}</span>
                </p>
                {!r.certo && r.tipo === 'visivel' && (
                  <div className="exercicio-exemplo-colunas">
                    <div>
                      <p className="exercicio-rotulo">Esperado</p>
                      <pre>{r.esperado}</pre>
                    </div>
                    <div>
                      <p className="exercicio-rotulo">Seu programa</p>
                      <SaidaDoPrograma resultado={r.resultado} linguagem={q.linguagem} />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

/** Prévia da página do aluno, em moldura isolada que não roda scripts. */
function PreviaDaProva({ codigo }: { codigo: string }) {
  const [mostrado, setMostrado] = useState(codigo)
  useEffect(() => {
    const espera = setTimeout(() => setMostrado(codigo), 300)
    return () => clearTimeout(espera)
  }, [codigo])
  return (
    <div className="exercicio-previa">
      <p className="exercicio-rotulo">Prévia da sua página</p>
      <iframe title="Prévia da sua página" sandbox="" srcDoc={mostrado} className="exercicio-previa-moldura" />
    </div>
  )
}
