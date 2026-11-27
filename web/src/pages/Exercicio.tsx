import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { saidaConfere, type TesteDoAluno } from '../lab/correcao'
import { EditorCodigo } from '../lab/EditorCodigo'
import { TEMPO_LIMITE_MS, type Executor, type ResultadoDaExecucao } from '../lab/executor'
import { criarExecutor, LINGUAGENS } from '../lab/linguagens'
import { Terminal } from '../lab/Terminal'
import { mensagemDeErro } from '../lib/erros'
import { anunciarConquista, lerConquista } from '../lib/progresso'
import {
  carregarExercicio,
  entregaEmAberto,
  entregar,
  ExercicioIndisponivel,
  minhasEntregas,
  NOME_DA_SITUACAO,
  notaQueVale,
  type EntregaDoAluno,
  guardarRascunho,
  lerRascunho,
  NOME_DIFICULDADE,
  XP_POR_DIFICULDADE,
  type Exercicio as ExercicioDados,
} from '../lib/laboratorio'
import { numeroRomano } from '../lib/ponte'
import { useModoNinja } from '../ninja/ModoNinja'
import './Exercicio.css'

type ResultadoTeste = { teste: TesteDoAluno; numero: number; certo: boolean; resultado: ResultadoDaExecucao }
/** O que o terminal mostra: o código que está rodando, as respostas já digitadas e a saída. */
type SessaoDoTerminal = { codigo: string; respostas: string[]; resultado: ResultadoDaExecucao }

/** As respostas viram uma linha cada; o \n no fim de todas mantém as respostas vazias. */
const juntarRespostas = (respostas: string[]) => respostas.map((r) => `${r}\n`).join('')

/** Um exercício do laboratório: enunciado, editor, terminal (Rodar) e Entregar, tudo no navegador. */
export function Exercicio() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const [dados, setDados] = useState<{ exercicio: ExercicioDados; testes: TesteDoAluno[] } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [ocupado, setOcupado] = useState<null | 'carregando' | 'rodando' | 'testando'>(null)
  const [falhaAoCarregar, setFalhaAoCarregar] = useState<string | null>(null)
  const [sessao, setSessao] = useState<SessaoDoTerminal | null>(null)
  const [resultados, setResultados] = useState<ResultadoTeste[] | null>(null)
  // Código que gerou os resultados: só ele pode ser entregue.
  const [codigoTestado, setCodigoTestado] = useState<string | null>(null)
  const [entregas, setEntregas] = useState<EntregaDoAluno[]>([])
  const [confirmando, setConfirmando] = useState(false)
  const [entregando, setEntregando] = useState(false)
  const [avisoEntrega, setAvisoEntrega] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const executor = useRef<Executor | null>(null)
  const ehAluno = perfil?.papel === 'aluno'
  const ninja = useModoNinja().ativo
  const voltarPara = ninja ? '/ninja' : perfil?.papel === 'professor' ? '/professor' : '/ponte'

  useEffect(() => {
    let ativo = true
    carregarExercicio(Number(id))
      .then((d) => {
        if (!ativo) return
        setDados(d)
        setCodigo(lerRascunho(d.exercicio.id) ?? d.exercicio.codigoInicial)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof ExercicioIndisponivel ? e.message : mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [id])

  useEffect(() => () => executor.current?.encerrar(), [])

  useEffect(() => {
    if (!ehAluno || !perfil) return
    let ativo = true
    // As entregas anteriores são um extra: se falhar, a página abre do mesmo jeito.
    minhasEntregas(Number(id), perfil.id).then(
      (e) => {
        if (ativo) setEntregas(e)
      },
      () => {},
    )
    return () => {
      ativo = false
    }
  }, [id, ehAluno, perfil])

  if (erro) {
    return (
      <div className="exercicio container">
        <Aviso tipo="erro" titulo="Não foi possível abrir o exercício">
          {erro}
        </Aviso>
        <Link to={voltarPara} className="botao">
          Voltar
        </Link>
      </div>
    )
  }
  if (!dados) return <Carregando />

  const { exercicio, testes } = dados
  const visiveis = testes.filter((t) => t.tipo === 'visivel')
  const linguagem = LINGUAGENS[exercicio.linguagem]
  const ehHtml = exercicio.linguagem === 'html'

  function mudarCodigo(novo: string) {
    setCodigo(novo)
    guardarRascunho(exercicio.id, novo)
  }

  async function prepararExecutor(): Promise<Executor | null> {
    executor.current ??= criarExecutor(exercicio.linguagem)
    setFalhaAoCarregar(null)
    setOcupado('carregando')
    try {
      await executor.current.carregar()
      return executor.current
    } catch (e) {
      setFalhaAoCarregar(mensagemDeErro(e))
      setOcupado(null)
      return null
    }
  }

  /** Roda os testes (visíveis e ocultos) e guarda o resultado junto com o código testado. */
  async function conferirTestes(py: Executor, codigoParaTestar: string): Promise<ResultadoTeste[]> {
    setOcupado('testando')
    const lista: ResultadoTeste[] = []
    for (const [i, teste] of testes.entries()) {
      const resultado = await py.rodar(codigoParaTestar, teste.entrada, false)
      const certo = !resultado.erro && !resultado.tempoEsgotado && (await saidaConfere(teste, resultado.saida))
      lista.push({ teste, numero: i + 1, certo, resultado })
    }
    setResultados(lista)
    setCodigoTestado(codigoParaTestar)
    setAvisoEntrega(null)
    return lista
  }

  /** Roda o programa no terminal com as respostas já digitadas; terminou, confere os testes. */
  async function rodarNoTerminal(py: Executor, codigoRodado: string, respostas: string[]) {
    setOcupado('rodando')
    const resultado = await py.rodar(codigoRodado, juntarRespostas(respostas), true)
    setSessao({ codigo: codigoRodado, respostas, resultado })
    if (resultado.precisaDeEntrada) {
      setOcupado(null)
      return
    }
    if (testes.length > 0) await conferirTestes(py, codigoRodado)
    setOcupado(null)
  }

  async function rodar() {
    const py = await prepararExecutor()
    if (!py) return
    if (ehHtml) {
      await conferirTestes(py, codigo)
      setOcupado(null)
      return
    }
    setResultados(null)
    setCodigoTestado(null)
    await rodarNoTerminal(py, codigo, [])
  }

  async function responder(resposta: string) {
    const py = executor.current
    if (!py || !sessao) return
    await rodarNoTerminal(py, sessao.codigo, [...sessao.respostas, resposta])
  }

  async function enviarEntrega() {
    if (!perfil) return
    setConfirmando(false)
    setEntregando(true)
    setAvisoEntrega(null)
    try {
      let lista = resultados
      let codigoEntregue = codigoTestado
      if (!lista || codigoEntregue !== codigo) {
        // O código mudou depois do último Rodar (ou nunca rodou): confere agora, com o código que vai ser entregue.
        const py = await prepararExecutor()
        if (!py) return
        lista = await conferirTestes(py, codigo)
        codigoEntregue = codigo
        setOcupado(null)
      }
      const acertos = lista.filter((r) => r.certo).length
      const { tentativa, conquista } = await entregar(exercicio.id, codigoEntregue ?? codigo, acertos)
      const c = lerConquista(conquista)
      anunciarConquista(c)
      const xpTexto = c.xp > 0 ? ` +${c.xp} XP, a confirmar pelo professor.` : ''
      setAvisoEntrega({
        tipo: 'sucesso',
        texto: `Entrega ${tentativa} enviada: ${acertos} de ${lista.length} testes certos.${xpTexto}`,
      })
      setEntregas(await minhasEntregas(exercicio.id, perfil.id).catch(() => entregas))
    } catch (e) {
      setAvisoEntrega({ tipo: 'erro', texto: mensagemDeErro(e) })
    } finally {
      setEntregando(false)
    }
  }

  const certos = resultados?.filter((r) => r.certo).length ?? 0
  const xp = XP_POR_DIFICULDADE[exercicio.dificuldade]
  const jaEntregou = entregaEmAberto(entregas)
  const devolvida = entregas[0]?.devolvidaEm ? entregas[0] : null
  const mensagemOcupado =
    ocupado === 'carregando'
      ? exercicio.linguagem === 'python'
        ? 'Carregando o Python… Na primeira vez pode levar alguns segundos.'
        : `Preparando o ${linguagem.nome}…`
      : ocupado === 'testando'
        ? 'Conferindo os testes…'
        : 'Rodando o seu código…'

  return (
    <div className="exercicio container">
      <Link to={voltarPara} className="exercicio-voltar">
        ← Voltar
      </Link>

      <header className="cartao exercicio-topo">
        <p className="pixel exercicio-selo">
          {exercicio.aula.sigla} · Unidade {numeroRomano(exercicio.aula.unidade)} · Aula {exercicio.aula.numero}
        </p>
        <h1>{exercicio.titulo}</h1>
        <p className="exercicio-etiquetas">
          <span className={`exercicio-etiqueta exercicio-dificuldade-${exercicio.dificuldade}`}>
            {NOME_DIFICULDADE[exercicio.dificuldade]}
          </span>
          <span className="exercicio-etiqueta">+{xp} XP ao acertar tudo</span>
          <span className="exercicio-etiqueta">{linguagem.nome}</span>
        </p>
        <div className="exercicio-enunciado">{exercicio.enunciado}</div>
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

      {devolvida && ehAluno && (
        <Aviso tipo="info" titulo="O professor devolveu a sua entrega para você refazer">
          {devolvida.comentario ?? 'Mude o código e entregue de novo quando estiver pronto.'}
        </Aviso>
      )}

      <section className="exercicio-bancada" aria-label="Seu código">
        <div className="exercicio-editor">
          <div className="exercicio-editor-barra">
            <span className="pixel">{linguagem.arquivo}</span>
            <button
              type="button"
              className="exercicio-restaurar"
              onClick={() => mudarCodigo(exercicio.codigoInicial)}
              disabled={ocupado !== null}
            >
              Restaurar código inicial
            </button>
          </div>
          <EditorCodigo
            valor={codigo}
            aoMudar={mudarCodigo}
            rotulo={`Editor de código ${linguagem.nome}`}
            linguagem={exercicio.linguagem}
          />
        </div>

        <div className="exercicio-lateral">
          <div className="exercicio-botoes">
            <button type="button" className="botao botao-primario" onClick={rodar} disabled={ocupado !== null}>
              ▶ Rodar
            </button>
          </div>
          {ehHtml ? (
            <PreviaDaPagina codigo={codigo} />
          ) : (
            <Terminal
              resultado={sessao?.resultado ?? null}
              ocupado={ocupado === 'carregando' || ocupado === 'rodando'}
              mensagemOcupado={mensagemOcupado}
              aoResponder={responder}
            />
          )}
          <p className="exercicio-status" role="status">
            {ocupado === 'testando' && 'Conferindo os testes…'}
            {ocupado === null && ehHtml && !resultados && 'Clique em Rodar para conferir a sua página.'}
          </p>
          {falhaAoCarregar && (
            <Aviso tipo="erro" titulo={`${linguagem.nome} indisponível`}>
              {falhaAoCarregar}
            </Aviso>
          )}
        </div>
      </section>

      {resultados && (
        <section className="cartao exercicio-resultados" aria-labelledby="exercicio-resultados-titulo">
          <h2 id="exercicio-resultados-titulo">
            {certos === resultados.length
              ? `Todos os ${resultados.length} testes certos!`
              : `${certos} de ${resultados.length} testes certos`}
          </h2>
          <ol className="exercicio-testes" role="list">
            {resultados.map((r) => (
              <li key={r.teste.id} className={r.certo ? 'exercicio-teste-certo' : 'exercicio-teste-errado'}>
                <p className="exercicio-teste-titulo">
                  <span aria-hidden="true">{r.certo ? '✓' : '✗'}</span> Teste {r.numero}{' '}
                  {r.teste.tipo === 'oculto' ? '(oculto)' : '(visível)'}
                  <span className="sr-only">{r.certo ? ': certo' : ': errado'}</span>
                </p>
                {!r.certo && <DetalheDoErro r={r} rotulos={detalhes(exercicio.linguagem)} />}
              </li>
            ))}
          </ol>
        </section>
      )}

      {ehAluno && (
        <section className="cartao exercicio-entregar" aria-labelledby="exercicio-entregar-titulo">
          <h2 id="exercicio-entregar-titulo">Entregar</h2>
          {jaEntregou ? (
            <p>Você já entregou este exercício. Só o professor pode devolver para você refazer.</p>
          ) : confirmando ? (
            <div className="exercicio-confirmar" role="alertdialog" aria-labelledby="exercicio-confirmar-titulo">
              <p id="exercicio-confirmar-titulo" className="exercicio-confirmar-titulo">
                Deseja realmente entregar?
              </p>
              <p>
                Depois de entregue, não dá para desfazer nem mudar. O professor recebe o código que está no editor agora e o
                resultado dos testes.
                {certos === resultados?.length && resultados.length > 0 && codigoTestado === codigo
                  ? ` Acertando tudo, você ganha +${xp} XP na hora, a confirmar pelo professor.`
                  : ''}
              </p>
              <div className="exercicio-botoes">
                <button type="button" className="botao botao-primario" onClick={enviarEntrega}>
                  Sim, entregar
                </button>
                <button type="button" className="botao" onClick={() => setConfirmando(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p>
                Rode o seu código antes para ver se os testes passam. Entregar guarda o código que está no editor e o
                resultado dos testes para o professor, e só vale uma vez.
              </p>
              <button
                type="button"
                className="botao botao-primario"
                onClick={() => setConfirmando(true)}
                disabled={entregando || ocupado !== null || testes.length === 0}
              >
                {entregando ? 'Entregando…' : 'Entregar'}
              </button>
            </>
          )}
          {avisoEntrega && <Aviso tipo={avisoEntrega.tipo}>{avisoEntrega.texto}</Aviso>}
        </section>
      )}

      {ehAluno && entregas.length > 0 && <SuasEntregas entregas={entregas} />}
    </div>
  )
}

const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

function SuasEntregas({ entregas }: { entregas: EntregaDoAluno[] }) {
  return (
    <section className="cartao exercicio-entregas" aria-labelledby="exercicio-entregas-titulo">
      <h2 id="exercicio-entregas-titulo">Suas entregas</h2>
      <ol className="exercicio-entregas-lista" role="list">
        {entregas.map((e) => (
          <li key={e.id} className={`exercicio-entrega exercicio-entrega-${e.situacao}`}>
            <span className="exercicio-entrega-numero">Entrega {e.tentativa}</span>
            <span>
              {e.testesCertos} de {e.testesTotal} testes certos
            </span>
            <span className="exercicio-entrega-situacao">{NOME_DA_SITUACAO[e.situacao]}</span>
            <span className="exercicio-entrega-data">{formatoData.format(new Date(e.criadoEm))}</span>
            {(e.notaProfessor !== null || e.comentario || e.devolvidaEm) && (
              <div className="exercicio-entrega-correcao">
                {e.notaProfessor !== null && (
                  <p>
                    <strong>Nota do professor:</strong> {notaQueVale(e).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </p>
                )}
                {e.comentario && (
                  <p>
                    <strong>Comentário do professor:</strong> {e.comentario}
                  </p>
                )}
                {e.devolvidaEm && <p className="exercicio-entrega-devolvida">Devolvida para você refazer.</p>}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function SaidaDoPrograma({ resultado }: { resultado: ResultadoDaExecucao }) {
  if (resultado.tempoEsgotado) {
    return (
      <pre className="exercicio-erro">
        O programa passou de {TEMPO_LIMITE_MS / 1000} segundos e foi parado. Confira se algum laço (while ou for) nunca
        termina.
      </pre>
    )
  }
  return (
    <>
      <pre>{resultado.saida || (resultado.erro ? '' : '(sem saída)')}</pre>
      {resultado.saidaGrande && <p className="exercicio-aviso-pequeno">A saída era muito grande e foi cortada.</p>}
      {resultado.erro && <pre className="exercicio-erro">{resultado.erro}</pre>}
    </>
  )
}

function detalhes(l: ExercicioDados['linguagem']): Rotulos {
  return l === 'html'
    ? { entrada: 'O que foi conferido', esperado: 'Esperado', obtido: 'Na sua página' }
    : { entrada: 'Entrada', esperado: 'Esperado', obtido: 'Seu programa' }
}

type Rotulos = { entrada: string; esperado: string; obtido: string }

/** Prévia ao vivo da página do aluno, numa moldura isolada que não roda scripts. */
function PreviaDaPagina({ codigo }: { codigo: string }) {
  const [mostrado, setMostrado] = useState(codigo)
  useEffect(() => {
    const espera = setTimeout(() => setMostrado(codigo), 300)
    return () => clearTimeout(espera)
  }, [codigo])
  return (
    <div className="exercicio-previa">
      <p className="exercicio-rotulo">Prévia da sua página (atualiza enquanto você digita)</p>
      <iframe title="Prévia da sua página" sandbox="" srcDoc={mostrado} className="exercicio-previa-moldura" />
    </div>
  )
}

function Coluna({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <p className="exercicio-rotulo">{titulo}</p>
      {children}
    </div>
  )
}

function DetalheDoErro({ r, rotulos }: { r: ResultadoTeste; rotulos: Rotulos }) {
  const { resultado, teste } = r
  if (resultado.tempoEsgotado || resultado.erro) return <SaidaDoPrograma resultado={resultado} />
  return (
    <div className="exercicio-exemplo-colunas">
      <Coluna titulo={rotulos.entrada}>
        <pre>{teste.entrada || '(nenhuma)'}</pre>
      </Coluna>
      <Coluna titulo={rotulos.esperado}>
        {teste.saida_esperada !== null ? (
          <pre>{teste.saida_esperada}</pre>
        ) : (
          <pre className="exercicio-oculto">Resposta escondida</pre>
        )}
      </Coluna>
      <Coluna titulo={rotulos.obtido}>
        <pre>{resultado.saida || '(sem saída)'}</pre>
      </Coluna>
    </div>
  )
}
