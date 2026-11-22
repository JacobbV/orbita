import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { saidaConfere, type TesteDoAluno } from '../lab/correcao'
import { EditorCodigo } from '../lab/EditorCodigo'
import { ExecutorPython, TEMPO_LIMITE_MS, type ResultadoDaExecucao } from '../lab/executor'
import { mensagemDeErro } from '../lib/erros'
import {
  carregarExercicio,
  ExercicioIndisponivel,
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
  const executor = useRef<ExecutorPython | null>(null)

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
    setOcupado(null)
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
        </section>
      )}
    </div>
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
