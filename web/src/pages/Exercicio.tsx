import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { saidaConfere, type TesteDoAluno } from '../lab/correcao'
import { EditorCodigo } from '../lab/EditorCodigo'
import { ExecutorPython, TEMPO_LIMITE_MS, type ResultadoDaExecucao } from '../lab/executor'
import { mensagemDeErro } from '../lib/erros'
import { anunciarConquista, lerConquista } from '../lib/progresso'
import {
  carregarExercicio,
  entregar,
  ExercicioIndisponivel,
  minhasEntregas,
  NOME_DA_SITUACAO,
  type EntregaDoAluno,
  guardarRascunho,
  lerRascunho,
  NOME_DIFICULDADE,
  XP_POR_DIFICULDADE,
  type Exercicio as ExercicioDados,
} from '../lib/laboratorio'
import { numeroRomano } from '../lib/ponte'
import './Exercicio.css'

type Console = { titulo: string; resultado: ResultadoDaExecucao }
type ResultadoTeste = { teste: TesteDoAluno; numero: number; certo: boolean; resultado: ResultadoDaExecucao }

/** Um exercício do laboratório: enunciado, editor, Rodar e Testar (Python no navegador). */
export function Exercicio() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const [dados, setDados] = useState<{ exercicio: ExercicioDados; testes: TesteDoAluno[] } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [entrada, setEntrada] = useState('')
  const [ocupado, setOcupado] = useState<null | 'carregando' | 'rodando' | 'testando'>(null)
  const [falhaPython, setFalhaPython] = useState<string | null>(null)
  const [consoleSaida, setConsoleSaida] = useState<Console | null>(null)
  const [resultados, setResultados] = useState<ResultadoTeste[] | null>(null)
  // Código que gerou os resultados: só ele pode ser entregue.
  const [codigoTestado, setCodigoTestado] = useState<string | null>(null)
  const [entregas, setEntregas] = useState<EntregaDoAluno[]>([])
  const [entregando, setEntregando] = useState(false)
  const [avisoEntrega, setAvisoEntrega] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const executor = useRef<ExecutorPython | null>(null)
  const ehAluno = perfil?.papel === 'aluno'

  useEffect(() => {
    let ativo = true
    carregarExercicio(Number(id))
      .then((d) => {
        if (!ativo) return
        setDados(d)
        setCodigo(lerRascunho(d.exercicio.id) ?? d.exercicio.codigoInicial)
        const primeiro = d.testes.find((t) => t.tipo === 'visivel')
        if (primeiro) setEntrada(primeiro.entrada)
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
        <Link to={perfil?.papel === 'professor' ? '/professor' : '/ponte'} className="botao">
          Voltar
        </Link>
      </div>
    )
  }
  if (!dados) return <Carregando />

  const { exercicio, testes } = dados
  const visiveis = testes.filter((t) => t.tipo === 'visivel')

  function mudarCodigo(novo: string) {
    setCodigo(novo)
    guardarRascunho(exercicio.id, novo)
  }

  async function prepararPython(): Promise<ExecutorPython | null> {
    executor.current ??= new ExecutorPython()
    setFalhaPython(null)
    setOcupado('carregando')
    try {
      await executor.current.carregar()
      return executor.current
    } catch (e) {
      setFalhaPython(mensagemDeErro(e))
      setOcupado(null)
      return null
    }
  }

  async function rodar() {
    const py = await prepararPython()
    if (!py) return
    setOcupado('rodando')
    const resultado = await py.rodar(codigo, entrada, true)
    setConsoleSaida({ titulo: 'Saída do seu programa', resultado })
    setOcupado(null)
  }

  async function testar() {
    const py = await prepararPython()
    if (!py) return
    setOcupado('testando')
    const lista: ResultadoTeste[] = []
    for (const [i, teste] of testes.entries()) {
      const resultado = await py.rodar(codigo, teste.entrada, false)
      const certo = !resultado.erro && !resultado.tempoEsgotado && (await saidaConfere(teste, resultado.saida))
      lista.push({ teste, numero: i + 1, certo, resultado })
    }
    setResultados(lista)
    setCodigoTestado(codigo)
    setAvisoEntrega(null)
    setOcupado(null)
  }

  async function enviarEntrega() {
    if (!resultados || codigoTestado === null || !perfil) return
    setEntregando(true)
    setAvisoEntrega(null)
    try {
      const acertos = resultados.filter((r) => r.certo).length
      const { tentativa, conquista } = await entregar(exercicio.id, codigoTestado, acertos)
      const c = lerConquista(conquista)
      anunciarConquista(c)
      const xpTexto = c.xp > 0 ? ` +${c.xp} XP, a confirmar pelo professor.` : ''
      setAvisoEntrega({
        tipo: 'sucesso',
        texto: `Entrega ${tentativa} enviada: ${acertos} de ${resultados.length} testes certos.${xpTexto}`,
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

  return (
    <div className="exercicio container">
      <Link to={perfil?.papel === 'professor' ? '/professor' : '/ponte'} className="exercicio-voltar">
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
          <span className="exercicio-etiqueta">Python</span>
        </p>
        <div className="exercicio-enunciado">{exercicio.enunciado}</div>
        {visiveis.length > 0 && (
          <div className="exercicio-exemplos">
            {visiveis.map((t, i) => (
              <div key={t.id} className="exercicio-exemplo">
                <p className="exercicio-exemplo-titulo">Exemplo {i + 1}</p>
                <div className="exercicio-exemplo-colunas">
                  <div>
                    <p className="exercicio-rotulo">Entrada</p>
                    <pre>{t.entrada || '(nenhuma)'}</pre>
                  </div>
                  <div>
                    <p className="exercicio-rotulo">Saída esperada</p>
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
            <span className="pixel">main.py</span>
            <button
              type="button"
              className="exercicio-restaurar"
              onClick={() => mudarCodigo(exercicio.codigoInicial)}
              disabled={ocupado !== null}
            >
              Restaurar código inicial
            </button>
          </div>
          <EditorCodigo valor={codigo} aoMudar={mudarCodigo} rotulo="Editor de código Python" />
        </div>

        <div className="exercicio-lateral">
          <label className="exercicio-rotulo" htmlFor="exercicio-entrada">
            Entrada para o Rodar (uma resposta do input() por linha)
          </label>
          <textarea
            id="exercicio-entrada"
            className="exercicio-entrada"
            rows={3}
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            spellCheck={false}
          />
          <div className="exercicio-botoes">
            <button type="button" className="botao" onClick={rodar} disabled={ocupado !== null}>
              ▶ Rodar
            </button>
            <button type="button" className="botao botao-primario" onClick={testar} disabled={ocupado !== null || testes.length === 0}>
              ✓ Testar
            </button>
          </div>
          <p className="exercicio-status" role="status">
            {ocupado === 'carregando' && 'Carregando o Python… Na primeira vez pode levar alguns segundos.'}
            {ocupado === 'rodando' && 'Rodando o seu código…'}
            {ocupado === 'testando' && 'Conferindo os testes…'}
          </p>
          {falhaPython && (
            <Aviso tipo="erro" titulo="Python indisponível">
              {falhaPython}
            </Aviso>
          )}

          {consoleSaida && (
            <div className="exercicio-console">
              <p className="exercicio-rotulo">{consoleSaida.titulo}</p>
              <SaidaDoPrograma resultado={consoleSaida.resultado} />
            </div>
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
                {!r.certo && <DetalheDoErro r={r} />}
              </li>
            ))}
          </ol>
          {ehAluno && (
            <div className="exercicio-entregar">
              {codigoTestado === codigo ? (
                <p>
                  Entregar guarda este código e o resultado dos testes para o professor.
                  {certos === resultados.length && ` Acertando tudo, você ganha +${xp} XP na hora, a confirmar pelo professor.`}
                </p>
              ) : (
                <p>Você mudou o código depois de testar. Clique em Testar de novo para poder entregar.</p>
              )}
              <button
                type="button"
                className="botao botao-primario"
                onClick={enviarEntrega}
                disabled={entregando || ocupado !== null || codigoTestado !== codigo}
              >
                {entregando ? 'Entregando…' : 'Entregar'}
              </button>
              {avisoEntrega && <Aviso tipo={avisoEntrega.tipo}>{avisoEntrega.texto}</Aviso>}
            </div>
          )}
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
        O programa passou de {TEMPO_LIMITE_MS / 1000} segundos e foi parado. Confira se algum laço (while) nunca termina.
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

function DetalheDoErro({ r }: { r: ResultadoTeste }) {
  const { resultado, teste } = r
  if (resultado.tempoEsgotado || resultado.erro) return <SaidaDoPrograma resultado={resultado} />
  return (
    <div className="exercicio-exemplo-colunas">
      <div>
        <p className="exercicio-rotulo">Entrada</p>
        <pre>{teste.entrada || '(nenhuma)'}</pre>
      </div>
      {teste.saida_esperada !== null ? (
        <div>
          <p className="exercicio-rotulo">Esperado</p>
          <pre>{teste.saida_esperada}</pre>
        </div>
      ) : (
        <div>
          <p className="exercicio-rotulo">Esperado</p>
          <pre className="exercicio-oculto">Resposta escondida</pre>
        </div>
      )}
      <div>
        <p className="exercicio-rotulo">Seu programa</p>
        <pre>{resultado.saida || '(sem saída)'}</pre>
      </div>
    </div>
  )
}
