import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { buscarOferta, nomeTurno, type Oferta } from '../../lib/api'
import { apagarApelido, sortearApelidoDoAluno } from '../../lib/apelidos'
import { mensagemDeErro } from '../../lib/erros'
import { carregarXpDaTurma, darXp, XP_MANUAL_MAXIMO, type XpDoAluno } from '../../lib/progresso'
import './Professor.css'

const ATALHOS = [5, 10, 20]

/** XP dos alunos de uma turma e XP por participação. Só o professor vê. */
export function XpDaTurma() {
  const { ofertaId } = useParams()
  const id = Number(ofertaId)
  const [oferta, setOferta] = useState<Oferta | null>(null)
  const [alunos, setAlunos] = useState<XpDoAluno[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const [alunoId, setAlunoId] = useState('')
  const [quantidade, setQuantidade] = useState('10')
  const [motivo, setMotivo] = useState('Participação na aula')
  const [enviando, setEnviando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const campoAluno = useRef<HTMLSelectElement>(null)
  const [mexendoApelido, setMexendoApelido] = useState<string | null>(null)
  const [avisoApelido, setAvisoApelido] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  const recarregar = useCallback(async () => {
    const lista = await carregarXpDaTurma(id)
    setAlunos(lista)
  }, [id])

  useEffect(() => {
    let ativo = true
    Promise.all([buscarOferta(id), carregarXpDaTurma(id)])
      .then(([o, lista]) => {
        if (!ativo) return
        if (!o) {
          setErro('Turma não encontrada.')
          return
        }
        setOferta(o)
        setAlunos(lista)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [id])

  function escolher(aluno: XpDoAluno) {
    setAlunoId(aluno.alunoId)
    setSucesso(null)
    setErroForm(null)
    campoAluno.current?.focus()
    campoAluno.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setSucesso(null)
    const aluno = alunos?.find((a) => a.alunoId === alunoId)
    const n = Number(quantidade)
    if (!aluno) return setErroForm('Escolha o aluno.')
    if (!Number.isInteger(n) || n < 1 || n > XP_MANUAL_MAXIMO) return setErroForm(`Escolha de 1 a ${XP_MANUAL_MAXIMO} XP.`)
    if (!motivo.trim()) return setErroForm('Escreva o motivo do XP.')
    setErroForm(null)
    setEnviando(true)
    try {
      await darXp(aluno.alunoId, n, motivo)
      setSucesso(`+${n} XP para ${aluno.nome}.`)
      await recarregar().catch(() => {})
    } catch (falha) {
      setErroForm(mensagemDeErro(falha))
    } finally {
      setEnviando(false)
    }
  }

  async function mudarApelido(aluno: XpDoAluno, acao: 'sortear' | 'apagar') {
    setMexendoApelido(aluno.alunoId)
    setAvisoApelido(null)
    try {
      const novo = acao === 'sortear' ? await sortearApelidoDoAluno(aluno.alunoId) : null
      if (acao === 'apagar') await apagarApelido(aluno.alunoId)
      setAlunos((lista) => lista?.map((a) => (a.alunoId === aluno.alunoId ? { ...a, apelido: novo } : a)) ?? lista)
      setAvisoApelido({
        tipo: 'sucesso',
        texto: novo ? `Novo apelido de ${aluno.nome}: ${novo}.` : `Apelido de ${aluno.nome} apagado. Ele pode sortear outro.`,
      })
    } catch (falha) {
      setAvisoApelido({ tipo: 'erro', texto: mensagemDeErro(falha) })
    } finally {
      setMexendoApelido(null)
    }
  }

  const voltar = (
    <Link to="/professor?aba=turmas" className="botao">
      Voltar ao painel
    </Link>
  )

  if (erro) {
    return (
      <div className="painel container">
        <Aviso tipo="erro" titulo="Não foi possível abrir o XP da turma">
          {erro}
        </Aviso>
        {voltar}
      </div>
    )
  }
  if (!oferta || !alunos) return <Carregando />

  const { turma, disciplina } = oferta
  return (
    <div className="painel container">
      <header className="cartao painel-topo">
        <div className="painel-topo-texto">
          <p className="pixel painel-selo">XP da turma</p>
          <h1>
            {turma.nome} · {disciplina.sigla}
          </h1>
          <p className="painel-intro">
            {disciplina.nome}, {nomeTurno(turma.turno)}, {turma.anoLetivo}. Só você vê esta lista: os alunos não veem o
            XP dos colegas.
          </p>
        </div>
        {voltar}
      </header>

      {alunos.length === 0 ? (
        <p className="cartao painel-vazio xp-turma-vazio">Nenhum aluno aprovado nesta turma ainda.</p>
      ) : (
        <>
          <form className="cartao xp-turma-form" onSubmit={enviar} noValidate aria-labelledby="titulo-dar-xp">
            <h2 id="titulo-dar-xp">Dar XP por participação</h2>
            <div className="campo">
              <label htmlFor="xp-aluno">Aluno</label>
              <select id="xp-aluno" ref={campoAluno} value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
                <option value="">Escolha o aluno</option>
                {alunos.map((a) => (
                  <option key={a.alunoId} value={a.alunoId}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="xp-turma-quantidade">
              <legend>Quanto XP</legend>
              <div className="xp-turma-atalhos">
                {ATALHOS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`botao botao-compacto${quantidade === String(n) ? ' botao-primario' : ''}`}
                    aria-pressed={quantidade === String(n)}
                    onClick={() => setQuantidade(String(n))}
                  >
                    +{n}
                  </button>
                ))}
                <label className="sr-only" htmlFor="xp-quantidade">
                  Outro valor de XP
                </label>
                <input
                  id="xp-quantidade"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={XP_MANUAL_MAXIMO}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
              <p className="campo-dica">De 1 a {XP_MANUAL_MAXIMO} XP por vez.</p>
            </fieldset>
            <div className="campo">
              <label htmlFor="xp-motivo">Motivo</label>
              <input
                id="xp-motivo"
                value={motivo}
                maxLength={200}
                onChange={(e) => setMotivo(e.target.value)}
                aria-describedby="xp-motivo-dica"
              />
              <p id="xp-motivo-dica" className="campo-dica">
                O aluno vê este motivo junto com o XP.
              </p>
            </div>
            {erroForm && <Aviso tipo="erro">{erroForm}</Aviso>}
            {sucesso && <Aviso tipo="sucesso">{sucesso}</Aviso>}
            <button type="submit" className="botao botao-primario" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Dar XP'}
            </button>
          </form>

          <section className="cartao xp-turma-lista" aria-labelledby="titulo-alunos-xp">
            <h2 id="titulo-alunos-xp">
              {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}
            </h2>
            {avisoApelido && <Aviso tipo={avisoApelido.tipo}>{avisoApelido.texto}</Aviso>}
            <ul role="list">
              {alunos.map((a) => (
                <li key={a.alunoId} className="xp-turma-aluno">
                  <span className="xp-turma-nome">
                    {a.nome}
                    <span className="xp-turma-apelido">{a.apelido ? `Apelido: ${a.apelido}` : 'Sem apelido'}</span>
                  </span>
                  <span className="xp-turma-patente">
                    <span className="pixel">{a.patente}</span> · {a.xp} XP
                  </span>
                  <button
                    type="button"
                    className="botao botao-compacto"
                    aria-label={`Dar XP para ${a.nome}`}
                    onClick={() => escolher(a)}
                  >
                    Dar XP
                  </button>
                  <span className="xp-turma-acoes-apelido">
                    <button
                      type="button"
                      className="botao botao-compacto"
                      aria-label={`Sortear outro apelido para ${a.nome}`}
                      disabled={mexendoApelido !== null}
                      onClick={() => void mudarApelido(a, 'sortear')}
                    >
                      Sortear apelido
                    </button>
                    {a.apelido && (
                      <button
                        type="button"
                        className="botao botao-compacto"
                        aria-label={`Apagar o apelido de ${a.nome}`}
                        disabled={mexendoApelido !== null}
                        onClick={() => void mudarApelido(a, 'apagar')}
                      >
                        Apagar apelido
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
