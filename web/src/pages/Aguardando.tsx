import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Campo } from '../components/Campo'
import { Carregando } from '../components/Carregando'
import {
  disciplinasDasOfertas,
  listarOfertas,
  MAX_TENTATIVAS_POR_TURMA,
  meusPedidos,
  nomeTurno,
  pedirAcesso,
  rotuloTurma,
  type Oferta,
  type Pedido,
} from '../lib/api'
import { mensagemDeErro } from '../lib/erros'
import { situacoesPorOferta, type SituacaoOferta } from '../lib/rotas'
import { QUEM_E_VOCE_MAX, validarQuemEVoce } from '../lib/validacao'
import './Aguardando.css'

const ROTULO_STATUS = { pendente: 'Aguardando', aprovado: 'Aprovado', recusado: 'Recusado' } as const

export function Aguardando() {
  const { perfil } = useAuth()
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null)
  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [erro, setErro] = useState<string | null>(null)

  // Mudar "versao" recarrega os dados (depois de um pedido novo, por exemplo).
  const [versao, setVersao] = useState(0)
  const carregar = useCallback(async () => setVersao((v) => v + 1), [])

  useEffect(() => {
    let ativo = true
    Promise.all([meusPedidos(), listarOfertas()])
      .then(([p, o]) => {
        if (!ativo) return
        setPedidos(p)
        setOfertas(o)
        setErro(null)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [versao])

  const situacoes = useMemo(() => situacoesPorOferta(pedidos ?? []), [pedidos])

  // Disciplinas sem pedido pendente/aprovado: dá para pedir.
  const ofertasLivres = useMemo(() => {
    const ocupadas = new Set((pedidos ?? []).filter((p) => p.status !== 'recusado').map((p) => p.oferta.disciplina.id))
    const usadas = new Map<number, number>()
    for (const p of pedidos ?? []) usadas.set(p.oferta.id, (usadas.get(p.oferta.id) ?? 0) + 1)
    return ofertas.filter(
      (o) => !ocupadas.has(o.disciplina.id) && (usadas.get(o.id) ?? 0) < MAX_TENTATIVAS_POR_TURMA,
    )
  }, [ofertas, pedidos])

  if (!pedidos && !erro) return <Carregando />

  const primeiroNome = perfil?.nome.trim().split(/\s+/)[0] ?? 'tripulante'
  const algumAprovado = situacoes.some((s) => s.pedido.status === 'aprovado')
  const algumPendente = situacoes.some((s) => s.pedido.status === 'pendente')

  return (
    <div className="acesso container">
      <section className="cartao acesso-cartao acesso-largo" aria-labelledby="aguardando-titulo">
        <p className="pixel acesso-selo aguardando-selo">
          {algumAprovado ? 'Acesso liberado' : 'Aguardando aprovação'}
        </p>
        <h1 id="aguardando-titulo">Olá, {primeiroNome}.</h1>
        <p className="acesso-intro">
          {algumPendente
            ? 'O professor confere cada pedido. Quando ele aprovar, as aulas da sua turma aparecem na sua área.'
            : 'Aqui você acompanha os seus pedidos de acesso.'}{' '}
          Enquanto isso, você pode ver a parte pública do site.
        </p>
        <div className="acesso-links">
          <Link to="/">Ver a parte pública do site</Link>
        </div>

        {erro && (
          <div className="aguardando-bloco">
            <Aviso tipo="erro">{erro}</Aviso>
          </div>
        )}

        {algumAprovado && (
          <div className="aguardando-bloco">
            <Link to="/ponte" className="botao botao-primario">
              Ir para a ponte de comando
            </Link>
          </div>
        )}

        <h2 className="aguardando-subtitulo">Seus pedidos</h2>
        {situacoes.length === 0 ? (
          <p className="acesso-intro">Você ainda não tem pedidos. Peça acesso a uma disciplina abaixo.</p>
        ) : (
          <ul className="pedidos" role="list">
            {situacoes.map((s) => (
              <CartaoPedido key={s.pedido.oferta.id} situacao={s} aoPedir={carregar} />
            ))}
          </ul>
        )}

        {ofertasLivres.length > 0 && <NovoPedido ofertas={ofertasLivres} aoPedir={carregar} />}
      </section>
    </div>
  )
}

function CartaoPedido({ situacao, aoPedir }: { situacao: SituacaoOferta; aoPedir: () => Promise<void> }) {
  const { pedido, tentativasUsadas, podeTentarDeNovo } = situacao
  const { oferta } = pedido
  const restantes = MAX_TENTATIVAS_POR_TURMA - tentativasUsadas

  return (
    <li className={`pedido pedido-${pedido.status}`}>
      <div className="pedido-topo">
        <div>
          <p className="pedido-disciplina">{oferta.disciplina.nome}</p>
          <p className="pedido-turma">
            {rotuloTurma(oferta.turma)} · {nomeTurno(oferta.turma.turno)}
          </p>
        </div>
        <span className="pedido-status">{ROTULO_STATUS[pedido.status]}</span>
      </div>

      {pedido.status === 'pendente' && (
        <p className="pedido-texto">Pedido enviado. Aguarde a aprovação do professor.</p>
      )}

      {pedido.status === 'recusado' && (
        <>
          <p className="pedido-texto">
            {pedido.motivoRecusa ? (
              <>
                <strong>Motivo do professor:</strong> {pedido.motivoRecusa}
              </>
            ) : (
              'O professor recusou este pedido.'
            )}
          </p>
          {podeTentarDeNovo ? (
            <TentarDeNovo oferta={oferta} restantes={restantes} aoPedir={aoPedir} />
          ) : (
            restantes <= 0 && (
              <p className="pedido-texto">
                Você usou as {MAX_TENTATIVAS_POR_TURMA} tentativas desta turma. Fale com o professor.
              </p>
            )
          )}
        </>
      )}
    </li>
  )
}

function TentarDeNovo({
  oferta,
  restantes,
  aoPedir,
}: {
  oferta: Oferta
  restantes: number
  aoPedir: () => Promise<void>
}) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | undefined>()
  const [enviando, setEnviando] = useState(false)

  if (!aberto) {
    return (
      <button type="button" className="botao" onClick={() => setAberto(true)}>
        Pedir de novo ({restantes} {restantes === 1 ? 'tentativa restante' : 'tentativas restantes'})
      </button>
    )
  }

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault()
    const problema = validarQuemEVoce(texto)
    setErro(problema)
    if (problema) return
    setEnviando(true)
    try {
      await pedirAcesso(oferta.id, texto)
      await aoPedir()
    } catch (e) {
      setErro(mensagemDeErro(e))
      setEnviando(false)
    }
  }

  return (
    <form className="formulario pedido-form" onSubmit={enviar} noValidate>
      <CampoQuemEVoce valor={texto} onChange={setTexto} erro={erro} />
      <div className="pedido-acoes">
        <button type="submit" className="botao botao-primario" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar novo pedido'}
        </button>
        <button type="button" className="botao" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function NovoPedido({ ofertas, aoPedir }: { ofertas: Oferta[]; aoPedir: () => Promise<void> }) {
  const disciplinas = useMemo(() => disciplinasDasOfertas(ofertas), [ofertas])
  const [disciplinaId, setDisciplinaId] = useState('')
  const [ofertaId, setOfertaId] = useState('')
  const [texto, setTexto] = useState('')
  const [erros, setErros] = useState<{ disciplina?: string; turma?: string; texto?: string; geral?: string }>({})
  const [enviando, setEnviando] = useState(false)
  const turmas = ofertas.filter((o) => String(o.disciplina.id) === disciplinaId)

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault()
    const problemaTexto = validarQuemEVoce(texto)
    const novos = {
      ...(!disciplinaId ? { disciplina: 'Escolha a disciplina.' } : {}),
      ...(!ofertaId ? { turma: 'Escolha a turma.' } : {}),
      ...(problemaTexto ? { texto: problemaTexto } : {}),
    }
    setErros(novos)
    if (Object.keys(novos).length > 0) return
    setEnviando(true)
    try {
      await pedirAcesso(Number(ofertaId), texto)
      setDisciplinaId('')
      setOfertaId('')
      setTexto('')
      await aoPedir()
    } catch (e) {
      setErros({ geral: mensagemDeErro(e) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="aguardando-novo" aria-labelledby="novo-pedido-titulo">
      <h2 id="novo-pedido-titulo" className="aguardando-subtitulo">
        Pedir acesso a outra disciplina
      </h2>
      <p className="acesso-intro">Cada disciplina é aprovada separado.</p>
      <form className="formulario" onSubmit={enviar} noValidate>
        {erros.geral && <Aviso tipo="erro">{erros.geral}</Aviso>}
        <div className="formulario-duas-colunas">
          <Campo rotulo="Disciplina" erro={erros.disciplina}>
            {(p) => (
              <select
                {...p}
                value={disciplinaId}
                onChange={(e) => {
                  setDisciplinaId(e.target.value)
                  setOfertaId('')
                }}
              >
                <option value="">Escolha a disciplina</option>
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Turma" erro={erros.turma}>
            {(p) => (
              <select {...p} value={ofertaId} onChange={(e) => setOfertaId(e.target.value)} disabled={!disciplinaId}>
                <option value="">Escolha a sua turma</option>
                {turmas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {rotuloTurma(o.turma)} ({nomeTurno(o.turma.turno)})
                  </option>
                ))}
              </select>
            )}
          </Campo>
        </div>
        <CampoQuemEVoce valor={texto} onChange={setTexto} erro={erros.texto} />
        <button type="submit" className="botao" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar pedido'}
        </button>
      </form>
    </section>
  )
}

function CampoQuemEVoce({
  valor,
  onChange,
  erro,
}: {
  valor: string
  onChange: (v: string) => void
  erro?: string | undefined
}) {
  return (
    <Campo
      rotulo="Quem é você"
      erro={erro}
      dica="Nome completo, turma e turno (manhã ou tarde). O professor lê isso para aprovar."
    >
      {(p) => (
        <textarea
          {...p}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex.: Ana Exemplo da Silva, 1º INFO M, manhã"
          maxLength={QUEM_E_VOCE_MAX}
        />
      )}
    </Campo>
  )
}
