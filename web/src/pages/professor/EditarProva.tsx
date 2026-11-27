import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { LINGUAGENS } from '../../lab/linguagens'
import { mensagemDeErro } from '../../lib/erros'
import { NOVO_EXERCICIO, salvarExercicio, type DadosDoExercicio } from '../../lib/exercicios'
import { numeroRomano } from '../../lib/ponte'
import { listarOfertasDoPainel, type OfertaDoPainel } from '../../lib/professor'
import {
  carregarProva,
  exerciciosDaDisciplina,
  paraCampoDeData,
  salvarProva,
  validarProva,
  type DadosDaProva,
  type ErrosDaProva,
  type ProvaParaEditar,
  type QuestaoDoPainel,
} from '../../lib/provas'
import { FormExercicio } from './Exercicios'
import './Professor.css'
import './Exercicios.css'

interface Questao extends QuestaoDoPainel {
  pesoTexto: string
}

function proximaHoraCheia(): Date {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d
}

function origemEmTexto(q: QuestaoDoPainel): string {
  return q.origem ? `Unidade ${numeroRomano(q.origem.unidade)} · Aula ${q.origem.aula}` : 'Só desta prova'
}

/** Criar (/professor/prova/nova) ou editar (/professor/prova/:id) uma prova. */
export function EditarProva() {
  const { provaId } = useParams()
  const nova = provaId === undefined
  const navegar = useNavigate()
  const id = useId()

  const [ofertas, setOfertas] = useState<OfertaDoPainel[] | null>(null)
  const [prova, setProva] = useState<ProvaParaEditar | null>(null)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  const [d, setD] = useState<Omit<DadosDaProva, 'questoes'>>(() => {
    const abre = proximaHoraCheia()
    const fecha = new Date(abre.getTime() + 2 * 3600_000)
    return {
      ofertaId: 0,
      titulo: '',
      instrucoes: '',
      abreEm: paraCampoDeData(abre.toISOString()),
      fechaEm: paraCampoDeData(fecha.toISOString()),
      duracaoMin: '60',
      saidasParaEncerrar: null,
    }
  })
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [banco, setBanco] = useState<{ disciplinaId: number; lista: QuestaoDoPainel[] } | null>(null)
  const [escolhida, setEscolhida] = useState('')
  const [criando, setCriando] = useState<'nova' | number | null>(null)
  const [erros, setErros] = useState<ErrosDaProva>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let ativo = true
    Promise.all([listarOfertasDoPainel(), nova ? Promise.resolve(null) : carregarProva(Number(provaId))])
      .then(([o, p]) => {
        if (!ativo) return
        setOfertas(o)
        if (!nova && !p) {
          setErroCarga('Prova não encontrada.')
          return
        }
        if (p) {
          setProva(p)
          setD({
            ofertaId: p.oferta.id,
            titulo: p.titulo,
            instrucoes: p.instrucoes,
            abreEm: paraCampoDeData(p.abreEm),
            fechaEm: paraCampoDeData(p.fechaEm),
            duracaoMin: String(p.duracaoMin),
            saidasParaEncerrar: p.saidasParaEncerrar,
          })
          setQuestoes(p.listaDeQuestoes.map((q) => ({ ...q, pesoTexto: String(q.peso).replace('.', ',') })))
        }
      })
      .catch((e: unknown) => {
        if (ativo) setErroCarga(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [nova, provaId])

  const oferta = ofertas?.find((o) => o.id === d.ofertaId) ?? null
  const disciplinaId = oferta?.disciplina.id ?? null

  useEffect(() => {
    if (disciplinaId === null) return
    let ativo = true
    exerciciosDaDisciplina(disciplinaId).then(
      (lista) => {
        if (ativo) setBanco({ disciplinaId, lista })
      },
      () => {
        if (ativo) setBanco({ disciplinaId, lista: [] })
      },
    )
    return () => {
      ativo = false
    }
  }, [disciplinaId])

  const disponiveis = useMemo(
    () => (banco && banco.disciplinaId === disciplinaId ? banco.lista.filter((e) => !questoes.some((q) => q.exercicioId === e.exercicioId)) : []),
    [banco, disciplinaId, questoes],
  )

  const travada = (prova?.tentativas ?? 0) > 0
  const mudar = <K extends keyof typeof d>(campo: K, valor: (typeof d)[K]) => setD((v) => ({ ...v, [campo]: valor }))

  function adicionarDoBanco() {
    const e = disponiveis.find((x) => String(x.exercicioId) === escolhida)
    if (!e) return
    setQuestoes((lista) => [...lista, { ...e, pesoTexto: '1' }])
    setEscolhida('')
  }

  async function salvarQuestaoDaProva(exercicioId: number | null, dados: DadosDoExercicio) {
    const novoId = await salvarExercicio(exercicioId, null, dados)
    const questao: Questao = {
      exercicioId: novoId,
      peso: 1,
      pesoTexto: '1',
      titulo: dados.titulo.trim(),
      enunciado: dados.enunciado,
      linguagem: dados.linguagem,
      codigoInicial: dados.codigoInicial,
      testes: dados.testes,
      conferencia: dados.conferencia,
      palavrasExtras: dados.palavrasExtras,
      origem: null,
    }
    setQuestoes((lista) =>
      exercicioId === null ? [...lista, questao] : lista.map((q) => (q.exercicioId === exercicioId ? { ...questao, pesoTexto: q.pesoTexto } : q)),
    )
    setCriando(null)
  }

  function mover(i: number, passo: -1 | 1) {
    setQuestoes((lista) => {
      const nova = [...lista]
      const [q] = nova.splice(i, 1)
      if (q) nova.splice(i + passo, 0, q)
      return nova
    })
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const dados: DadosDaProva = { ...d, questoes: questoes.map((q) => ({ exercicioId: q.exercicioId, peso: q.pesoTexto })) }
    const encontrados = validarProva(dados)
    setErros(encontrados)
    if (Object.keys(encontrados).length > 0) {
      setErroGeral('Confira os campos marcados.')
      return
    }
    setErroGeral(null)
    setEnviando(true)
    try {
      await salvarProva(prova?.id ?? null, dados)
      navegar('/professor?aba=provas')
    } catch (falha) {
      setErroGeral(mensagemDeErro(falha))
      setEnviando(false)
    }
  }

  const voltar = (
    <Link to="/professor?aba=provas" className="botao">
      Voltar ao painel
    </Link>
  )

  if (erroCarga) {
    return (
      <div className="painel container">
        <Aviso tipo="erro" titulo="Não foi possível abrir a prova">
          {erroCarga}
        </Aviso>
        {voltar}
      </div>
    )
  }
  if (!ofertas) return <Carregando />

  const campo = (nome: keyof ErrosDaProva) =>
    erros[nome] ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-${nome}-erro` } : {}
  const erroDo = (nome: keyof ErrosDaProva) =>
    erros[nome] && (
      <p id={`${id}-${nome}-erro`} className="campo-erro">
        {erros[nome]}
      </p>
    )

  return (
    <div className="painel container exercicios-painel">
      <header className="cartao painel-topo">
        <div className="painel-topo-texto">
          <p className="pixel painel-selo">{nova ? 'Nova prova' : 'Editar prova'}</p>
          <h1>{nova ? 'Montar a prova' : prova?.titulo}</h1>
          <p className="painel-intro">
            O aluno começa dentro do horário e tem a duração para responder, sem passar do horário de fechar. A nota só aparece
            para ele depois que você publicar.
          </p>
        </div>
        {voltar}
      </header>

      {/* As questões ficam fora do <form> principal: o formulário de questão é outro <form>, e um não pode ficar dentro do outro. */}
      <div className="cartao exercicios-form">
        <form id={`${id}-form`} className="provas-form" onSubmit={enviar} noValidate aria-label="Dados da prova">
          <div className={`campo${erros.ofertaId ? ' campo-com-erro' : ''}`}>
            <label htmlFor={`${id}-oferta`}>Turma e disciplina</label>
            <select
              id={`${id}-oferta`}
              value={d.ofertaId || ''}
              disabled={!nova}
              onChange={(e) => {
                mudar('ofertaId', Number(e.target.value))
                setQuestoes((lista) => lista.filter((q) => q.origem === null))
              }}
              {...campo('ofertaId')}
            >
              <option value="">Escolha</option>
              {ofertas.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.turma.nome} · {o.disciplina.nome}
                </option>
              ))}
            </select>
            {erroDo('ofertaId')}
          </div>

          <div className={`campo${erros.titulo ? ' campo-com-erro' : ''}`}>
            <label htmlFor={`${id}-titulo`}>Título</label>
            <input id={`${id}-titulo`} value={d.titulo} maxLength={160} onChange={(e) => mudar('titulo', e.target.value)} {...campo('titulo')} />
            {erroDo('titulo')}
          </div>

          <div className="campo">
            <label htmlFor={`${id}-instrucoes`}>Instruções (opcional)</label>
            <textarea
              id={`${id}-instrucoes`}
              rows={3}
              maxLength={5000}
              value={d.instrucoes}
              onChange={(e) => mudar('instrucoes', e.target.value)}
            />
            <p className="campo-dica">O aluno lê antes de começar. Ex.: "Sem consulta. Use só o editor do site."</p>
          </div>

          <div className="provas-campos-lado">
            <div className={`campo${erros.abreEm ? ' campo-com-erro' : ''}`}>
              <label htmlFor={`${id}-abre`}>Abre em</label>
              <input id={`${id}-abre`} type="datetime-local" value={d.abreEm} onChange={(e) => mudar('abreEm', e.target.value)} {...campo('abreEm')} />
              {erroDo('abreEm')}
            </div>
            <div className={`campo${erros.fechaEm ? ' campo-com-erro' : ''}`}>
              <label htmlFor={`${id}-fecha`}>Fecha em</label>
              <input id={`${id}-fecha`} type="datetime-local" value={d.fechaEm} onChange={(e) => mudar('fechaEm', e.target.value)} {...campo('fechaEm')} />
              {erroDo('fechaEm')}
            </div>
            <div className={`campo${erros.duracaoMin ? ' campo-com-erro' : ''}`}>
              <label htmlFor={`${id}-duracao`}>Duração (minutos)</label>
              <input
                id={`${id}-duracao`}
                type="number"
                inputMode="numeric"
                min={5}
                max={600}
                value={d.duracaoMin}
                onChange={(e) => mudar('duracaoMin', e.target.value)}
                {...campo('duracaoMin')}
              />
              {erroDo('duracaoMin')}
            </div>
          </div>

          <div className="campo">
            <label htmlFor={`${id}-saidas`}>Se o aluno sair da aba</label>
            <select
              id={`${id}-saidas`}
              value={d.saidasParaEncerrar ?? ''}
              onChange={(e) => mudar('saidasParaEncerrar', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Só avisar e registrar</option>
              <option value="1">Encerrar a prova na 1ª saída</option>
              <option value="2">Encerrar a prova na 2ª saída</option>
              <option value="3">Encerrar a prova na 3ª saída</option>
            </select>
            <p className="campo-dica">
              O site detecta quando o aluno troca de aba ou de janela, mas não impede. Também não vê celular nem outro computador.
            </p>
          </div>

        </form>

        <fieldset className="exercicios-testes" aria-describedby={erros.questoes ? `${id}-questoes-erro` : undefined}>
          <legend>Questões</legend>
          {travada && (
            <Aviso tipo="info">Alunos já começaram esta prova: as questões e os pesos ficam travados. Dá para mudar o horário e o texto.</Aviso>
          )}
          {erros.questoes && (
            <p id={`${id}-questoes-erro`} className="campo-erro">
              {erros.questoes}
            </p>
          )}
          {questoes.length === 0 && <p className="campo-dica">Nenhuma questão ainda.</p>}
          <ol className="provas-questoes" role="list">
            {questoes.map((q, i) =>
              criando === q.exercicioId ? (
                <li key={q.exercicioId}>
                  <FormExercicio
                    titulo={`Editar: ${q.titulo}`}
                    inicial={{ ...q, dificuldade: 1 }}
                    paraProva
                    aoSalvar={(dados) => salvarQuestaoDaProva(q.exercicioId, dados)}
                    aoCancelar={() => setCriando(null)}
                  />
                </li>
              ) : (
                <li key={q.exercicioId} className="provas-questao">
                  <div className="provas-questao-texto">
                    <p className="provas-questao-titulo">
                      {i + 1}. {q.titulo}
                    </p>
                    <p className="provas-item-meta">
                      {LINGUAGENS[q.linguagem].nome} · {origemEmTexto(q)} · {q.testes.length} {q.testes.length === 1 ? 'teste' : 'testes'}
                    </p>
                  </div>
                  <div className="campo provas-peso">
                    <label htmlFor={`${id}-peso-${q.exercicioId}`}>Peso</label>
                    <input
                      id={`${id}-peso-${q.exercicioId}`}
                      inputMode="decimal"
                      value={q.pesoTexto}
                      disabled={travada}
                      onChange={(e) =>
                        setQuestoes((lista) => lista.map((x) => (x.exercicioId === q.exercicioId ? { ...x, pesoTexto: e.target.value } : x)))
                      }
                    />
                  </div>
                  {!travada && (
                    <div className="painel-botoes">
                      <button type="button" className="botao botao-compacto" disabled={i === 0} aria-label={`Subir ${q.titulo}`} onClick={() => mover(i, -1)}>
                        ↑
                      </button>
                      <button
                        type="button"
                        className="botao botao-compacto"
                        disabled={i === questoes.length - 1}
                        aria-label={`Descer ${q.titulo}`}
                        onClick={() => mover(i, 1)}
                      >
                        ↓
                      </button>
                      {q.origem === null && (
                        <button
                          type="button"
                          className="botao botao-compacto"
                          disabled={criando !== null}
                          aria-label={`Editar ${q.titulo}`}
                          onClick={() => setCriando(q.exercicioId)}
                        >
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        className="botao botao-compacto"
                        aria-label={`Tirar ${q.titulo} da prova`}
                        onClick={() => setQuestoes((lista) => lista.filter((x) => x.exercicioId !== q.exercicioId))}
                      >
                        Tirar
                      </button>
                    </div>
                  )}
                </li>
              ),
            )}
          </ol>

          {!travada && criando === 'nova' && (
            <FormExercicio
              titulo="Nova questão só desta prova"
              inicial={NOVO_EXERCICIO}
              paraProva
              aoSalvar={(dados) => salvarQuestaoDaProva(null, dados)}
              aoCancelar={() => setCriando(null)}
            />
          )}

          {!travada && criando === null && (
            <div className="provas-adicionar">
              <div className="campo">
                <label htmlFor={`${id}-banco`}>Usar um exercício das aulas</label>
                <select
                  id={`${id}-banco`}
                  value={escolhida}
                  disabled={!oferta || disponiveis.length === 0}
                  onChange={(e) => setEscolhida(e.target.value)}
                >
                  <option value="">
                    {!oferta ? 'Escolha a turma primeiro' : disponiveis.length === 0 ? 'Nenhum exercício disponível' : 'Escolha o exercício'}
                  </option>
                  {disponiveis.map((e) => (
                    <option key={e.exercicioId} value={e.exercicioId}>
                      {origemEmTexto(e)}: {e.titulo}
                    </option>
                  ))}
                </select>
                <p className="campo-dica">O aluno pode já ter visto este exercício na aula.</p>
              </div>
              <div className="painel-botoes">
                <button type="button" className="botao" disabled={!escolhida} onClick={adicionarDoBanco}>
                  Adicionar
                </button>
                <button type="button" className="botao" onClick={() => setCriando('nova')}>
                  + Criar questão só desta prova
                </button>
              </div>
            </div>
          )}
        </fieldset>

        {erroGeral && <Aviso tipo="erro">{erroGeral}</Aviso>}
        <div className="painel-botoes">
          <button type="submit" form={`${id}-form`} className="botao botao-primario" disabled={enviando || criando !== null}>
            {enviando ? 'Salvando…' : 'Salvar prova'}
          </button>
          <Link to="/professor?aba=provas" className="botao">
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  )
}
