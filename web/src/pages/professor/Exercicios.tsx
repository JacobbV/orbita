import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import {
  EXPLICACAO_DO_MODO,
  MODOS_DE_CONFERENCIA,
  modoDoTeste,
  NOME_DO_MODO,
  normalizarSaida,
  saidasConferem,
  valoresConferidos,
  type ModoDeConferencia,
} from '../../lab/correcao'
import { EditorCodigo } from '../../lab/EditorCodigo'
import type { Executor } from '../../lab/executor'
import { criarExecutor, LINGUAGENS, ORDEM_DAS_LINGUAGENS, type Linguagem } from '../../lab/linguagens'
import { mensagemDeErro } from '../../lib/erros'
import { ERROS_POR_DICA, MAX_DICAS, MAX_LETRAS_DA_DICA } from '../../lib/dicas'
import {
  carregarAulaComExercicios,
  conferirEntrega,
  decidirReconferencia,
  entregasParaReconferir,
  EXPLICACAO_DO_TIPO,
  MAX_TESTES,
  NOVO_EXERCICIO,
  NOME_DO_TIPO,
  regraDe,
  removerExercicio,
  salvarExercicio,
  temErros,
  validarExercicio,
  type AulaComExercicios,
  type DadosDoExercicio,
  type ErrosDoExercicio,
  type EntregaParaReconferir,
  type ExercicioDoPainel,
  type TesteDoProfessor,
  type TipoDeTeste,
} from '../../lib/exercicios'
import { NOME_DIFICULDADE, XP_POR_DIFICULDADE } from '../../lib/laboratorio'
import { numeroRomano } from '../../lib/ponte'
import './Professor.css'
import './Exercicios.css'

function resumoDosTestes(testes: TesteDoProfessor[]): string {
  const conta = (t: TipoDeTeste) => testes.filter((x) => x.tipo === t).length
  const partes = [
    [conta('visivel'), 'visível', 'visíveis'],
    [conta('oculto'), 'oculto', 'ocultos'],
    [conta('secreto'), 'secreto', 'secretos'],
  ] as const
  return partes
    .filter(([n]) => n > 0)
    .map(([n, um, varios]) => `${n} ${n === 1 ? um : varios}`)
    .join(', ')
}

/** Exercícios de uma aula: criar, editar, testar com a solução e remover. Só o professor. */
export function Exercicios() {
  const { aulaId } = useParams()
  const id = Number(aulaId)
  const [dados, setDados] = useState<AulaComExercicios | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState<number | 'novo' | null>(null)
  const [removendo, setRemovendo] = useState<number | null>(null)
  const [reconferindo, setReconferindo] = useState<number | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const recarregar = useCallback(async () => {
    const d = await carregarAulaComExercicios(id)
    if (!d) throw new Error('Aula não encontrada.')
    setDados(d)
  }, [id])

  useEffect(() => {
    let ativo = true
    carregarAulaComExercicios(id)
      .then((d) => {
        if (!ativo) return
        if (d) setDados(d)
        else setErro('Aula não encontrada.')
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [id])

  async function salvar(exercicioId: number | null, d: DadosDoExercicio) {
    await salvarExercicio(exercicioId, id, d)
    setEditando(null)
    setAviso({ tipo: 'sucesso', texto: `Exercício "${d.titulo.trim()}" ${exercicioId ? 'salvo' : 'criado'}.` })
    await recarregar().catch(() => {})
  }

  async function remover(e: ExercicioDoPainel) {
    setOcupado(true)
    setAviso(null)
    try {
      await removerExercicio(e.id)
      setRemovendo(null)
      setAviso({ tipo: 'sucesso', texto: `Exercício "${e.titulo}" removido.` })
      await recarregar().catch(() => {})
    } catch (falha) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(falha) })
    } finally {
      setOcupado(false)
    }
  }

  const voltar = (
    <Link to="/professor?aba=aulas" className="botao">
      Voltar ao painel
    </Link>
  )

  if (erro) {
    return (
      <div className="painel container">
        <Aviso tipo="erro" titulo="Não foi possível abrir os exercícios">
          {erro}
        </Aviso>
        {voltar}
      </div>
    )
  }
  if (!dados) return <Carregando />

  const { aula, exercicios } = dados
  const rotulo = `${aula.sigla} · Unidade ${numeroRomano(aula.unidade)} · Aula ${aula.numero}`

  return (
    <div className="painel container exercicios-painel">
      <header className="cartao painel-topo">
        <div className="painel-topo-texto">
          <p className="pixel painel-selo">Para praticar</p>
          <h1>{aula.titulo}</h1>
          <p className="painel-intro">
            {rotulo}. O aluno vê os exercícios quando a aula estiver liberada para a turma dele.
          </p>
        </div>
        {voltar}
      </header>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      {editando === 'novo' ? (
        <FormExercicio
          titulo="Novo exercício"
          inicial={NOVO_EXERCICIO}
          aoSalvar={(d) => salvar(null, d)}
          aoCancelar={() => setEditando(null)}
        />
      ) : (
        <button
          type="button"
          className="botao botao-primario exercicios-novo"
          disabled={editando !== null}
          onClick={() => {
            setAviso(null)
            setEditando('novo')
          }}
        >
          + Novo exercício
        </button>
      )}

      {exercicios.length === 0 && editando !== 'novo' && (
        <p className="cartao painel-vazio exercicios-vazio">Nenhum exercício nesta aula ainda.</p>
      )}

      <ul className="exercicios-lista" role="list">
        {exercicios.map((e) =>
          editando === e.id ? (
            <li key={e.id}>
              <FormExercicio
                titulo={`Editar: ${e.titulo}`}
                inicial={e}
                aoSalvar={(d) => salvar(e.id, d)}
                aoCancelar={() => setEditando(null)}
              />
            </li>
          ) : (
            <li key={e.id} className="cartao exercicios-item">
              <div className="exercicios-item-texto">
                <h2>{e.titulo}</h2>
                <p className="exercicios-item-meta">
                  {LINGUAGENS[e.linguagem].nome} · {NOME_DIFICULDADE[e.dificuldade]} · +{XP_POR_DIFICULDADE[e.dificuldade]} XP ·{' '}
                  {resumoDosTestes(e.testes)}
                  {' · '}
                  {e.entregas === 0 ? 'nenhuma entrega' : `${e.entregas} ${e.entregas === 1 ? 'entrega' : 'entregas'}`}
                  {e.aConfirmar > 0 && <span className="exercicios-a-confirmar"> · {e.aConfirmar} a confirmar</span>}
                </p>
              </div>
              <div className="painel-botoes">
                <Link to={`/exercicio/${e.id}`} className="botao" aria-label={`Abrir ${e.titulo} como o aluno vê`}>
                  Abrir
                </Link>
                {e.aConfirmar > 0 && (
                  <button
                    type="button"
                    className="botao botao-primario"
                    disabled={editando !== null || ocupado || reconferindo !== null}
                    aria-label={`Reconferir as entregas de ${e.titulo}`}
                    onClick={() => {
                      setAviso(null)
                      setReconferindo(e.id)
                    }}
                  >
                    Reconferir ({e.aConfirmar})
                  </button>
                )}
                <button
                  type="button"
                  className="botao"
                  disabled={editando !== null || ocupado}
                  aria-label={`Editar ${e.titulo}`}
                  onClick={() => {
                    setAviso(null)
                    setRemovendo(null)
                    setEditando(e.id)
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="botao"
                  disabled={editando !== null || ocupado}
                  aria-label={`Remover ${e.titulo}`}
                  onClick={() => setRemovendo(removendo === e.id ? null : e.id)}
                >
                  Remover
                </button>
              </div>
              {reconferindo === e.id && (
                <Reconferencia
                  exercicio={e}
                  aoTerminar={async () => {
                    await recarregar().catch(() => {})
                  }}
                  aoFechar={() => setReconferindo(null)}
                />
              )}
              {removendo === e.id && (
                <div className="painel-confirmar painel-confirmar-perigo exercicios-confirmacao">
                  {e.entregas > 0 ? (
                    <p>
                      Este exercício já tem {e.entregas} {e.entregas === 1 ? 'entrega' : 'entregas'} de alunos e não pode ser
                      removido, para não apagar o trabalho deles. Dá para editar o enunciado e os testes.
                    </p>
                  ) : (
                    <p>Remover o exercício "{e.titulo}"? Os testes dele também saem.</p>
                  )}
                  <div className="painel-botoes">
                    {e.entregas === 0 && (
                      <button type="button" className="botao painel-botao-perigo" disabled={ocupado} onClick={() => remover(e)}>
                        Sim, remover
                      </button>
                    )}
                    <button type="button" className="botao" onClick={() => setRemovendo(null)}>
                      {e.entregas === 0 ? 'Cancelar' : 'Entendi'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

export function FormExercicio({
  titulo,
  inicial,
  aoSalvar,
  aoCancelar,
  paraProva = false,
}: {
  titulo: string
  inicial: DadosDoExercicio
  aoSalvar: (d: DadosDoExercicio) => Promise<void>
  aoCancelar: () => void
  /** Questão de prova: sem dificuldade nem XP. */
  paraProva?: boolean
}) {
  const id = useId()
  const [d, setD] = useState<DadosDoExercicio>(() => ({
    titulo: inicial.titulo,
    enunciado: inicial.enunciado,
    dificuldade: inicial.dificuldade,
    linguagem: inicial.linguagem,
    codigoInicial: inicial.codigoInicial,
    testes: inicial.testes.map((t) => ({ ...t })),
    conferencia: inicial.conferencia,
    palavrasExtras: inicial.palavrasExtras,
    // Questão de prova não tem dicas: o campo fica de fora e o banco não mexe.
    ...(paraProva ? {} : { dicas: [...(inicial.dicas ?? [])] }),
  }))
  const [erros, setErros] = useState<ErrosDoExercicio>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const mudar = <K extends keyof DadosDoExercicio>(campo: K, valor: DadosDoExercicio[K]) => setD((v) => ({ ...v, [campo]: valor }))
  const mudarTeste = (i: number, parte: Partial<TesteDoProfessor>) =>
    setD((v) => ({ ...v, testes: v.testes.map((t, j) => (j === i ? { ...t, ...parte } : t)) }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const encontrados = validarExercicio(d)
    setErros(encontrados)
    if (temErros(encontrados)) {
      setErroGeral('Confira os campos marcados.')
      return
    }
    setErroGeral(null)
    setEnviando(true)
    try {
      await aoSalvar(d)
    } catch (falha) {
      setErroGeral(mensagemDeErro(falha))
      setEnviando(false)
    }
  }

  return (
    <form className="cartao exercicios-form" onSubmit={enviar} noValidate aria-labelledby={`${id}-titulo-form`}>
      <h2 id={`${id}-titulo-form`}>{titulo}</h2>

      <div className={`campo${erros.titulo ? ' campo-com-erro' : ''}`}>
        <label htmlFor={`${id}-titulo`}>Título</label>
        <input
          id={`${id}-titulo`}
          value={d.titulo}
          maxLength={160}
          onChange={(e) => mudar('titulo', e.target.value)}
          {...(erros.titulo ? { 'aria-invalid': true, 'aria-describedby': `${id}-titulo-erro` } : {})}
        />
        {erros.titulo && (
          <p id={`${id}-titulo-erro`} className="campo-erro">
            {erros.titulo}
          </p>
        )}
      </div>

      <div className={`campo${erros.enunciado ? ' campo-com-erro' : ''}`}>
        <label htmlFor={`${id}-enunciado`}>Enunciado</label>
        <textarea
          id={`${id}-enunciado`}
          rows={6}
          value={d.enunciado}
          onChange={(e) => mudar('enunciado', e.target.value)}
          aria-describedby={`${id}-enunciado-dica${erros.enunciado ? ` ${id}-enunciado-erro` : ''}`}
          {...(erros.enunciado ? { 'aria-invalid': true } : {})}
        />
        <p id={`${id}-enunciado-dica`} className="campo-dica">
          O aluno vê o texto como está, com as quebras de linha.
        </p>
        {erros.enunciado && (
          <p id={`${id}-enunciado-erro`} className="campo-erro">
            {erros.enunciado}
          </p>
        )}
      </div>

      <div className="campo">
        <label htmlFor={`${id}-linguagem`}>Linguagem</label>
        <select id={`${id}-linguagem`} value={d.linguagem} onChange={(e) => mudar('linguagem', e.target.value as Linguagem)}>
          {ORDEM_DAS_LINGUAGENS.map((l) => (
            <option key={l} value={l}>
              {LINGUAGENS[l].nome}
            </option>
          ))}
        </select>
      </div>

      {!paraProva && (
      <fieldset className="exercicios-dificuldade">
        <legend>Dificuldade</legend>
        <div className="exercicios-opcoes">
          {([1, 2, 3] as const).map((n) => (
            <label key={n} className="exercicios-opcao">
              <input
                type="radio"
                name={`${id}-dificuldade`}
                checked={d.dificuldade === n}
                onChange={() => mudar('dificuldade', n)}
              />
              {NOME_DIFICULDADE[n]} <span className="exercicios-xp">+{XP_POR_DIFICULDADE[n]} XP</span>
            </label>
          ))}
        </div>
      </fieldset>
      )}

      <div className="campo">
        <span className="exercicios-rotulo" id={`${id}-codigo-rotulo`}>
          Código inicial (opcional)
        </span>
        <EditorCodigo
          key={d.linguagem}
          valor={d.codigoInicial}
          aoMudar={(v) => mudar('codigoInicial', v)}
          rotulo="Código inicial"
          linguagem={d.linguagem}
          baixo
        />
        <p className="campo-dica">O aluno começa com este código no editor.</p>
      </div>

      <ComoConferir
        modo={d.conferencia}
        palavras={d.palavrasExtras}
        erro={erros.palavrasExtras}
        aoMudarModo={(m) => mudar('conferencia', m)}
        aoMudarPalavras={(p) => mudar('palavrasExtras', p)}
      />

      {!paraProva && <CampoDasDicas dicas={d.dicas ?? []} erro={erros.dicas} aoMudar={(dicas) => mudar('dicas', dicas)} />}

      <fieldset className="exercicios-testes" aria-describedby={erros.testes ? `${id}-testes-erro` : undefined}>
        <legend>Testes</legend>
        <DicaDosTestes linguagem={d.linguagem} />
        {erros.testes && (
          <p id={`${id}-testes-erro`} className="campo-erro">
            {erros.testes}
          </p>
        )}
        <ol className="exercicios-testes-lista" role="list">
          {d.testes.map((t, i) => (
            <CartaoTeste
              key={i}
              numero={i + 1}
              teste={t}
              modo={d.conferencia}
              palavras={d.palavrasExtras}
              erro={erros.porTeste?.[i]}
              podeRemover={d.testes.length > 1}
              aoMudar={(parte) => mudarTeste(i, parte)}
              aoRemover={() => setD((v) => ({ ...v, testes: v.testes.filter((_, j) => j !== i) }))}
            />
          ))}
        </ol>
        <button
          type="button"
          className="botao"
          disabled={d.testes.length >= MAX_TESTES}
          onClick={() => setD((v) => ({ ...v, testes: [...v.testes, { tipo: 'oculto', entrada: '', saidaEsperada: '' }] }))}
        >
          + Adicionar teste
        </button>
      </fieldset>

      <PreencherComSolucao
        key={d.linguagem}
        linguagem={d.linguagem}
        testes={d.testes}
        aoPreencher={(saidas) => setD((v) => ({ ...v, testes: v.testes.map((t, i) => ({ ...t, saidaEsperada: saidas[i] ?? t.saidaEsperada })) }))}
      />

      {erroGeral && <Aviso tipo="erro">{erroGeral}</Aviso>}
      <div className="painel-botoes">
        <button type="submit" className="botao botao-primario" disabled={enviando}>
          {enviando ? 'Salvando…' : paraProva ? 'Salvar questão' : 'Salvar exercício'}
        </button>
        <button type="button" className="botao" onClick={aoCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function DicaDosTestes({ linguagem }: { linguagem: Linguagem }) {
  if (linguagem === 'html') {
    return (
      <div className="campo-dica exercicios-dica-html">
        <p>Cada teste confere uma parte da página do aluno. Na entrada, escreva uma consulta:</p>
        <ul>
          <li>
            <code>h1</code>: o texto do primeiro <code>h1</code>.
          </li>
          <li>
            <code>h1 | color</code>: o valor final de uma propriedade CSS, como <code>rgb(255, 0, 0)</code>.
          </li>
          <li>
            <code>img @ alt</code>: o valor de um atributo.
          </li>
          <li>
            <code>contar li</code>: quantos elementos combinam com o seletor.
          </li>
        </ul>
        <p>Os scripts da página não rodam. Use a sua solução para preencher as respostas.</p>
      </div>
    )
  }
  return (
    <p className="campo-dica">
      Cada teste dá uma entrada ao programa (uma linha para cada <code>{linguagem === 'python' ? 'input()' : 'input() ou prompt()'}</code>) e confere a
      saída{linguagem === 'javascript' ? <> do <code>console.log</code></> : ''}.
    </p>
  )
}

function CartaoTeste({
  numero,
  teste,
  modo,
  palavras,
  erro,
  podeRemover,
  aoMudar,
  aoRemover,
}: {
  numero: number
  teste: TesteDoProfessor
  modo: ModoDeConferencia
  palavras: string
  erro: string | undefined
  podeRemover: boolean
  aoMudar: (parte: Partial<TesteDoProfessor>) => void
  aoRemover: () => void
}) {
  const id = useId()
  return (
    <li className={`exercicios-teste exercicios-teste-${teste.tipo}`}>
      <div className="exercicios-teste-topo">
        <span className="exercicios-teste-numero">Teste {numero}</span>
        <label className="sr-only" htmlFor={`${id}-tipo`}>
          Tipo do teste {numero}
        </label>
        <select id={`${id}-tipo`} value={teste.tipo} onChange={(e) => aoMudar({ tipo: e.target.value as TipoDeTeste })}>
          {(['visivel', 'oculto', 'secreto'] as const).map((t) => (
            <option key={t} value={t}>
              {NOME_DO_TIPO[t]}
            </option>
          ))}
        </select>
        {podeRemover && (
          <button type="button" className="botao botao-compacto" onClick={aoRemover} aria-label={`Remover teste ${numero}`}>
            Remover
          </button>
        )}
      </div>
      <p className="campo-dica">{EXPLICACAO_DO_TIPO[teste.tipo]}</p>
      <div className="exercicios-teste-campos">
        <div className="campo">
          <label htmlFor={`${id}-entrada`}>Entrada do teste {numero}</label>
          <textarea id={`${id}-entrada`} rows={3} value={teste.entrada} onChange={(e) => aoMudar({ entrada: e.target.value })} />
        </div>
        <div className={`campo${erro ? ' campo-com-erro' : ''}`}>
          <label htmlFor={`${id}-saida`}>Saída esperada do teste {numero}</label>
          <textarea
            id={`${id}-saida`}
            rows={3}
            value={teste.saidaEsperada}
            onChange={(e) => aoMudar({ saidaEsperada: e.target.value })}
            {...(erro ? { 'aria-invalid': true, 'aria-describedby': `${id}-saida-erro` } : {})}
          />
          {erro && (
            <p id={`${id}-saida-erro`} className="campo-erro">
              {erro}
            </p>
          )}
        </div>
      </div>
      <OQueConta teste={teste} modo={modo} palavras={palavras} />
    </li>
  )
}

/** Roda a solução do professor em cada entrada e preenche as saídas esperadas. A solução não é salva. */
function PreencherComSolucao({
  linguagem,
  testes,
  aoPreencher,
}: {
  linguagem: Linguagem
  testes: TesteDoProfessor[]
  aoPreencher: (saidas: string[]) => void
}) {
  const [solucao, setSolucao] = useState('')
  const [estado, setEstado] = useState<null | 'carregando' | 'rodando'>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const executor = useRef<Executor | null>(null)
  const nome = LINGUAGENS[linguagem].nome

  useEffect(() => () => executor.current?.encerrar(), [])

  async function preencher() {
    if (!solucao.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Escreva a solução primeiro.' })
      return
    }
    setMensagem(null)
    executor.current ??= criarExecutor(linguagem)
    try {
      setEstado('carregando')
      await executor.current.carregar()
      setEstado('rodando')
      const saidas: string[] = []
      for (const [i, t] of testes.entries()) {
        const r = await executor.current.rodar(solucao, t.entrada, false)
        if (r.tempoEsgotado) throw new Error(`No teste ${i + 1}, a solução passou do tempo limite (laço infinito?).`)
        if (r.erro) throw new Error(`No teste ${i + 1}, a solução deu erro:\n${r.erro}`)
        saidas.push(normalizarSaida(r.saida))
      }
      aoPreencher(saidas)
      setMensagem({
        tipo: 'sucesso',
        texto: `${saidas.length} ${saidas.length === 1 ? 'saída preenchida' : 'saídas preenchidas'}. Confira e salve o exercício.`,
      })
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: e instanceof Error ? e.message : mensagemDeErro(e) })
    } finally {
      setEstado(null)
    }
  }

  return (
    <details className="exercicios-solucao">
      <summary>Preencher as saídas com a sua solução</summary>
      <p className="campo-dica">
        Escreva uma solução em {nome}. Ela roda aqui no navegador em cada {linguagem === 'html' ? 'consulta' : 'entrada'}, e o
        resultado vira a resposta do teste. A solução não é salva e o aluno não vê.
      </p>
      <EditorCodigo valor={solucao} aoMudar={setSolucao} rotulo="Sua solução (não é salva)" linguagem={linguagem} baixo />
      <button type="button" className="botao" onClick={preencher} disabled={estado !== null}>
        {estado === 'carregando' ? `Carregando o ${nome}…` : estado === 'rodando' ? 'Rodando…' : '▶ Rodar a solução nos testes'}
      </button>
      {mensagem && (
        <Aviso tipo={mensagem.tipo}>
          <span className="exercicios-mensagem">{mensagem.texto}</span>
        </Aviso>
      )}
    </details>
  )
}

type LinhaDaReconferencia = { entrega: EntregaParaReconferir; confere: boolean; motivo: string }

/**
 * Roda, no navegador do professor, todos os testes (inclusive os secretos) no
 * código de cada entrega "a confirmar" e registra se confere.
 */
function Reconferencia({
  exercicio,
  aoTerminar,
  aoFechar,
}: {
  exercicio: ExercicioDoPainel
  aoTerminar: () => Promise<void>
  aoFechar: () => void
}) {
  const [estado, setEstado] = useState<'carregando' | 'rodando' | 'pronto'>('carregando')
  const [linhas, setLinhas] = useState<LinhaDaReconferencia[]>([])
  const [total, setTotal] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const executor = useRef<Executor | null>(null)
  const iniciou = useRef(false)

  useEffect(() => {
    if (iniciou.current) return
    iniciou.current = true
    const py = criarExecutor(exercicio.linguagem)
    executor.current = py
    ;(async () => {
      try {
        const entregas = await entregasParaReconferir(exercicio.id)
        setTotal(entregas.length)
        await py.carregar()
        setEstado('rodando')
        for (const entrega of entregas) {
          const resultados: { tipo: TipoDeTeste; certo: boolean }[] = []
          for (const t of exercicio.testes) {
            const r = await py.rodar(entrega.codigo, t.entrada, false)
            const certo = !r.erro && !r.tempoEsgotado && saidasConferem(r.saida, t.saidaEsperada, t.entrada, regraDe(exercicio))
            resultados.push({ tipo: t.tipo, certo })
          }
          const decisao = decidirReconferencia(entrega, resultados)
          await conferirEntrega(entrega.id, decisao.confere)
          setLinhas((l) => [...l, { entrega, ...decisao }])
        }
        setEstado('pronto')
        await aoTerminar()
      } catch (e) {
        setErro(e instanceof Error && e.message.startsWith('Não foi possível carregar') ? e.message : mensagemDeErro(e))
        setEstado('pronto')
      }
    })()
    return () => py.encerrar()
    // Roda uma vez por abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirmadas = linhas.filter((l) => l.confere).length
  return (
    <div className="exercicios-reconferencia" role="region" aria-label={`Reconferência de ${exercicio.titulo}`}>
      <p className="exercicios-reconferencia-titulo">
        {estado === 'carregando' && `Preparando o ${LINGUAGENS[exercicio.linguagem].nome}…`}
        {estado === 'rodando' && `Reconferindo… ${linhas.length} de ${total}`}
        {estado === 'pronto' &&
          !erro &&
          `Pronto: ${confirmadas} ${confirmadas === 1 ? 'confirmada' : 'confirmadas'} e ${linhas.length - confirmadas} sem conferir.`}
      </p>
      <p className="campo-dica">
        Todos os testes rodam de novo aqui, inclusive os secretos. Quando não confere, o XP do exercício sai do aluno.
      </p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {linhas.length > 0 && (
        <ul className="exercicios-reconferencia-lista" role="list">
          {linhas.map((l) => (
            <li key={l.entrega.id} className={l.confere ? 'exercicios-confere' : 'exercicios-nao-confere'}>
              <span aria-hidden="true">{l.confere ? '✓' : '✗'}</span>{' '}
              <strong>{l.entrega.aluno}</strong> (entrega {l.entrega.tentativa}): {l.motivo}
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

/** Escolha do professor: como a saída do aluno é conferida neste exercício. */
function ComoConferir({
  modo,
  palavras,
  erro,
  aoMudarModo,
  aoMudarPalavras,
}: {
  modo: ModoDeConferencia
  palavras: string
  erro: string | undefined
  aoMudarModo: (m: ModoDeConferencia) => void
  aoMudarPalavras: (p: string) => void
}) {
  const id = useId()
  return (
    <fieldset className="exercicios-conferencia">
      <legend>Como conferir a saída</legend>
      <div className="exercicios-conferencia-opcoes">
        {MODOS_DE_CONFERENCIA.map((m) => (
          <label key={m} className={`exercicios-conferencia-opcao${modo === m ? ' exercicios-conferencia-escolhida' : ''}`}>
            <input type="radio" name={`${id}-conferencia`} checked={modo === m} onChange={() => aoMudarModo(m)} />
            <span>
              <strong>
                {NOME_DO_MODO[m]}
                {m === 'valores' ? ' (recomendado)' : ''}
              </strong>
              <span className="campo-dica">{EXPLICACAO_DO_MODO[m]}</span>
            </span>
          </label>
        ))}
      </div>
      {modo === 'valores' && (
        <div className={`campo${erro ? ' campo-com-erro' : ''}`}>
          <label htmlFor={`${id}-palavras`}>Palavras que também contam (opcional)</label>
          <input
            id={`${id}-palavras`}
            value={palavras}
            maxLength={500}
            placeholder="ex.: aprovado, reprovado, par, impar"
            onChange={(e) => aoMudarPalavras(e.target.value)}
            aria-describedby={`${id}-palavras-dica${erro ? ` ${id}-palavras-erro` : ''}`}
            {...(erro ? { 'aria-invalid': true } : {})}
          />
          <p id={`${id}-palavras-dica`} className="campo-dica">
            Palavras de resultado que não estão na entrada, como “aprovado” ou “par”. Sem elas, “aprovado” e “reprovado”
            valeriam igual. Separe com vírgula ou espaço. Em Python, True e False também entram aqui.
          </p>
          {erro && (
            <p id={`${id}-palavras-erro`} className="campo-erro">
              {erro}
            </p>
          )}
        </div>
      )}
    </fieldset>
  )
}

/** Mostra, em cada teste, o que o site vai comparar na saída do aluno. */
function OQueConta({ teste, modo, palavras }: { teste: TesteDoProfessor; modo: ModoDeConferencia; palavras: string }) {
  if (!teste.saidaEsperada.trim() || modo === 'exato') return null
  const modoDoCaso = modoDoTeste(teste.saidaEsperada, teste.entrada, { modo, palavras })
  const lista = valoresConferidos(teste.saidaEsperada, teste.entrada, palavras, modoDoCaso)
  return (
    <p className="exercicios-o-que-conta">
      <span className="exercicios-o-que-conta-rotulo">O site confere:</span>{' '}
      {lista.map((v, i) => (
        <code key={i}>{v}</code>
      ))}
      {modo === 'valores' && modoDoCaso === 'texto' && (
        <span className="campo-dica"> (sem números nem palavras da entrada, vale o texto flexível)</span>
      )}
    </p>
  )
}

/** Até 3 dicas, que o aluno libera aos poucos (uma a cada ERROS_POR_DICA tentativas erradas). */
function CampoDasDicas({ dicas, erro, aoMudar }: { dicas: string[]; erro: string | undefined; aoMudar: (d: string[]) => void }) {
  const id = useId()
  // Sempre 3 caixas; as vazias não são salvas.
  const caixas = Array.from({ length: MAX_DICAS }, (_, i) => dicas[i] ?? '')
  return (
    <fieldset className="exercicios-dicas" aria-describedby={`${id}-explicacao${erro ? ` ${id}-erro` : ''}`}>
      <legend>Dicas (opcional)</legend>
      <p id={`${id}-explicacao`} className="campo-dica">
        O aluno libera uma dica a cada {ERROS_POR_DICA} tentativas erradas no Rodar e abre quando quiser, na ordem. Comece
        pela dica mais leve e deixe a mais forte por último. Não tira XP. Deixe em branco as que não usar.
      </p>
      {erro && (
        <p id={`${id}-erro`} className="campo-erro">
          {erro}
        </p>
      )}
      {caixas.map((texto, i) => (
        <div key={i} className="campo">
          <label htmlFor={`${id}-dica-${i}`}>
            Dica {i + 1} (libera depois de {(i + 1) * ERROS_POR_DICA} tentativas erradas)
          </label>
          <textarea
            id={`${id}-dica-${i}`}
            rows={2}
            maxLength={MAX_LETRAS_DA_DICA}
            value={texto}
            onChange={(e) => aoMudar(caixas.map((c, j) => (j === i ? e.target.value : c)))}
          />
        </div>
      ))}
    </fieldset>
  )
}
