import { Link } from 'react-router'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { nomeTurno } from '../../lib/api'
import { mensagemDeErro } from '../../lib/erros'
import {
  listarOfertasDoPainel,
  listarPedidos,
  listarTurmas,
  salvarTurma,
  validarAnoLetivo,
  type OfertaDoPainel,
  type PedidoDoPainel,
  type TurmaDoPainel,
} from '../../lib/professor'

interface Dados {
  turmas: TurmaDoPainel[]
  ofertas: OfertaDoPainel[]
  pedidos: PedidoDoPainel[]
}

export function Turmas() {
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [recado, setRecado] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    Promise.all([listarTurmas(), listarOfertasDoPainel(), listarPedidos()])
      .then(([turmas, ofertas, pedidos]) => {
        if (ativo) setDados({ turmas, ofertas, pedidos })
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [versao])

  if (!dados && !erro) return <Carregando />

  return (
    <section className="painel-secao" aria-labelledby="turmas-titulo">
      <div className="painel-secao-topo">
        <h2 id="turmas-titulo">Turmas</h2>
      </div>
      <p className="painel-intro">
        Turma que não aceita pedidos some da lista do cadastro. Os alunos já aprovados continuam com acesso.
      </p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {recado && <Aviso tipo="sucesso">{recado}</Aviso>}
      {dados && (
        <ul className="painel-turmas" role="list">
          {dados.turmas.map((t) => (
            <CartaoTurma
              key={t.id}
              turma={t}
              dados={dados}
              aoSalvar={(texto) => {
                setErro(null)
                setRecado(texto)
                setVersao((v) => v + 1)
              }}
              aoErrar={(texto) => {
                setRecado(null)
                setErro(texto)
              }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function CartaoTurma({
  turma,
  dados,
  aoSalvar,
  aoErrar,
}: {
  turma: TurmaDoPainel
  dados: Dados
  aoSalvar: (texto: string) => void
  aoErrar: (texto: string) => void
}) {
  const [ano, setAno] = useState(String(turma.anoLetivo))
  const [ativa, setAtiva] = useState(turma.ativa)
  const [erroAno, setErroAno] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const id = `turma-${turma.id}`

  const ofertasDaTurma = useMemo(() => dados.ofertas.filter((o) => o.turma.id === turma.id), [dados.ofertas, turma.id])
  const disciplinas = ofertasDaTurma.map((o) => o.disciplina.nome)
  const daTurma = dados.pedidos.filter((p) => p.oferta.turma.id === turma.id)
  const aprovados = new Set(daTurma.filter((p) => p.status === 'aprovado').map((p) => p.aluno.email)).size
  const pendentes = daTurma.filter((p) => p.status === 'pendente').length
  const mudou = ano !== String(turma.anoLetivo) || ativa !== turma.ativa

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const problema = validarAnoLetivo(ano)
    setErroAno(problema)
    if (problema) return
    setOcupado(true)
    try {
      await salvarTurma(turma.id, { anoLetivo: Number(ano), ativa })
      aoSalvar(`Turma ${turma.nome} salva.`)
    } catch (erro) {
      aoErrar(mensagemDeErro(erro))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <li className="cartao painel-turma">
      <div className="painel-turma-topo">
        <h3 id={`${id}-nome`}>{turma.nome}</h3>
        <p className="painel-turma-info">
          {turma.serie}º ano · {nomeTurno(turma.turno)}
          {disciplinas.length > 0 && ` · ${disciplinas.join(', ')}`}
        </p>
        <p className="painel-turma-info">
          {aprovados} {aprovados === 1 ? 'aluno aprovado' : 'alunos aprovados'} · {pendentes}{' '}
          {pendentes === 1 ? 'pedido aguardando' : 'pedidos aguardando'}
        </p>
        {ofertasDaTurma.length > 0 && (
          <ul className="painel-ver-como-aluno" role="list">
            {ofertasDaTurma.map((o) => (
              <li key={o.id}>
                <Link to={`/professor/ver-como-aluno/${o.id}`} className="botao botao-compacto">
                  Ver como aluno{ofertasDaTurma.length > 1 ? `: ${o.disciplina.sigla}` : ''}
                  <span className="sr-only">
                    {' '}
                    ({turma.nome}, {o.disciplina.nome})
                  </span>
                </Link>
                <Link to={`/professor/xp/${o.id}`} className="botao botao-compacto">
                  XP da turma{ofertasDaTurma.length > 1 ? `: ${o.disciplina.sigla}` : ''}
                  <span className="sr-only">
                    {' '}
                    ({turma.nome}, {o.disciplina.nome})
                  </span>
                </Link>
                <Link to={`/professor/tripulacao/${o.id}`} className="botao botao-compacto">
                  Tripulação{ofertasDaTurma.length > 1 ? `: ${o.disciplina.sigla}` : ''}
                  <span className="sr-only">
                    {' '}
                    ({turma.nome}, {o.disciplina.nome})
                  </span>
                </Link>
                <Link to={`/professor/relatorio/${o.id}`} className="botao botao-compacto">
                  Relatório{ofertasDaTurma.length > 1 ? `: ${o.disciplina.sigla}` : ''}
                  <span className="sr-only">
                    {' '}
                    ({turma.nome}, {o.disciplina.nome})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form className="painel-turma-form" onSubmit={salvar} noValidate aria-labelledby={`${id}-nome`}>
        <div className={`campo painel-campo-ano${erroAno ? ' campo-com-erro' : ''}`}>
          <label htmlFor={`${id}-ano`}>Ano letivo</label>
          <input
            id={`${id}-ano`}
            type="number"
            inputMode="numeric"
            min={2020}
            max={2100}
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            aria-invalid={erroAno ? true : undefined}
            aria-describedby={erroAno ? `${id}-ano-erro` : undefined}
          />
          {erroAno && (
            <p id={`${id}-ano-erro`} className="campo-erro">
              {erroAno}
            </p>
          )}
        </div>
        <label className="painel-caixa">
          <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
          Aceita novos pedidos
        </label>
        <button type="submit" className="botao botao-primario" disabled={ocupado || !mudou}>
          Salvar
        </button>
      </form>
    </li>
  )
}
