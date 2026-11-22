import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { nomeTurno } from '../../lib/api'
import { mensagemDeErro } from '../../lib/erros'
import { numeroRomano } from '../../lib/ponte'
import {
  adicionarAula,
  adicionarUnidade,
  carregarEstrutura,
  liberarAula,
  liberarUnidade,
  listarOfertasDoPainel,
  removerAula,
  removerUnidade,
  renomearUnidade,
  salvarAula,
  validarLink,
  validarTitulo,
  type AulaDoPainel,
  type OfertaDoPainel,
  type UnidadeDoPainel,
} from '../../lib/professor'

/** Executa uma ação no banco, recarrega a estrutura e mostra o recado ou o erro. */
type Executar = (acao: () => Promise<void>, recado: string) => Promise<boolean>

export function Aulas() {
  const [params, setParams] = useSearchParams()
  const [ofertas, setOfertas] = useState<OfertaDoPainel[] | null>(null)
  const [unidades, setUnidades] = useState<UnidadeDoPainel[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [recado, setRecado] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    listarOfertasDoPainel()
      .then((o) => {
        if (ativo) setOfertas(o)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [])

  const idEscolhido = Number(params.get('oferta'))
  const oferta = ofertas?.find((o) => o.id === idEscolhido) ?? ofertas?.[0] ?? null

  useEffect(() => {
    if (!oferta) return
    let ativo = true
    carregarEstrutura(oferta)
      .then((u) => {
        if (ativo) setUnidades(u)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [oferta, versao])

  const executar: Executar = async (acao, texto) => {
    setOcupado(true)
    setRecado(null)
    try {
      await acao()
      setErro(null)
      setRecado(texto)
      setVersao((v) => v + 1)
      return true
    } catch (e) {
      setErro(mensagemDeErro(e))
      return false
    } finally {
      setOcupado(false)
    }
  }

  if (!ofertas && !erro) return <Carregando />

  function escolher(id: string) {
    setUnidades(null)
    setRecado(null)
    setParams({ aba: 'aulas', oferta: id }, { replace: true })
  }

  const total = unidades?.reduce((s, u) => s + u.aulas.length, 0) ?? 0
  const liberadas = unidades?.reduce((s, u) => s + u.aulas.filter((a) => a.liberada).length, 0) ?? 0

  return (
    <section className="painel-secao" aria-labelledby="aulas-titulo">
      <div className="painel-secao-topo">
        <h2 id="aulas-titulo">Aulas</h2>
      </div>

      {ofertas && ofertas.length > 0 && oferta && (
        <div className="campo painel-escolha">
          <label htmlFor="escolha-oferta">Turma e disciplina</label>
          <select id="escolha-oferta" value={oferta.id} onChange={(e) => escolher(e.target.value)}>
            {ofertas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.disciplina.nome} · {o.turma.nome} ({nomeTurno(o.turma.turno)}, {o.turma.anoLetivo})
              </option>
            ))}
          </select>
          <p className="campo-dica">
            Liberar e bloquear vale só para a turma escolhida. Unidades, títulos e links valem para todas as turmas
            desta disciplina.
          </p>
        </div>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {recado && <Aviso tipo="sucesso">{recado}</Aviso>}

      {oferta && !unidades && !erro && <Carregando />}

      {oferta && unidades && (
        <>
          <p className="painel-resumo">
            {oferta.turma.nome}: {liberadas} de {total} {total === 1 ? 'aula liberada' : 'aulas liberadas'}.
          </p>
          <div className="painel-unidades">
            {unidades.map((u) => (
              <CartaoUnidade
                key={u.id}
                unidade={u}
                oferta={oferta}
                totalUnidades={unidades.length}
                ocupado={ocupado}
                executar={executar}
              />
            ))}
          </div>
          <FormNovo
            rotulo="Nova unidade"
            botao="Adicionar unidade"
            ocupado={ocupado}
            maximo={120}
            aoEnviar={(titulo) =>
              executar(() => adicionarUnidade(oferta.disciplina.id, titulo), `Unidade "${titulo}" adicionada.`)
            }
          />
        </>
      )}
    </section>
  )
}

function CartaoUnidade({
  unidade,
  oferta,
  totalUnidades,
  ocupado,
  executar,
}: {
  unidade: UnidadeDoPainel
  oferta: OfertaDoPainel
  totalUnidades: number
  ocupado: boolean
  executar: Executar
}) {
  const [renomeando, setRenomeando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const romano = numeroRomano(unidade.numero)
  const liberadas = unidade.aulas.filter((a) => a.liberada).length
  const todasLiberadas = unidade.aulas.length > 0 && liberadas === unidade.aulas.length
  const idTitulo = `unidade-${unidade.id}`

  return (
    <section className="cartao painel-unidade" aria-labelledby={idTitulo}>
      <div className="painel-unidade-topo">
        <div className="painel-unidade-nome">
          <p className="pixel painel-unidade-numero">Unidade {romano}</p>
          <h3 id={idTitulo}>{unidade.titulo}</h3>
          <p className="painel-unidade-contagem">
            {unidade.aulas.length === 0
              ? 'Sem aulas ainda'
              : `${liberadas} de ${unidade.aulas.length} liberadas para ${oferta.turma.nome}`}
          </p>
        </div>
        <div className="painel-botoes">
          {unidade.aulas.length > 0 && (
            <button
              type="button"
              className={`botao${todasLiberadas ? '' : ' botao-primario'}`}
              disabled={ocupado}
              aria-label={`${todasLiberadas ? 'Bloquear' : 'Liberar'} unidade ${romano}`}
              onClick={() =>
                executar(
                  () => liberarUnidade(oferta.id, unidade.id, !todasLiberadas),
                  `Unidade ${romano} ${todasLiberadas ? 'bloqueada' : 'liberada'} para ${oferta.turma.nome}.`,
                )
              }
            >
              {todasLiberadas ? 'Bloquear unidade' : 'Liberar unidade'}
            </button>
          )}
          <button
            type="button"
            className="botao"
            disabled={ocupado}
            aria-expanded={renomeando}
            aria-label={`Renomear unidade ${romano}`}
            onClick={() => setRenomeando((v) => !v)}
          >
            Renomear
          </button>
          <button
            type="button"
            className="botao"
            disabled={ocupado}
            aria-label={`Remover unidade ${romano}`}
            onClick={() => setRemovendo(true)}
          >
            Remover
          </button>
        </div>
      </div>

      {renomeando && (
        <FormNovo
          rotulo={`Título da unidade ${romano}`}
          botao="Salvar título"
          inicial={unidade.titulo}
          ocupado={ocupado}
          maximo={120}
          aoCancelar={() => setRenomeando(false)}
          aoEnviar={async (titulo) => {
            const ok = await executar(() => renomearUnidade(unidade.id, titulo), `Unidade ${romano} renomeada.`)
            if (ok) setRenomeando(false)
            return ok
          }}
        />
      )}

      {removendo && (
        <div className="painel-confirmar painel-confirmar-perigo">
          <p>
            Remover a unidade {romano} e {unidade.aulas.length === 1 ? 'a aula dela' : `as ${unidade.aulas.length} aulas dela`}{' '}
            em todas as turmas? Os links e as liberações também saem.
            {unidade.numero < totalUnidades && ' As unidades seguintes mudam de número.'}
          </p>
          <div className="painel-botoes">
            <button
              type="button"
              className="botao painel-botao-perigo"
              disabled={ocupado}
              onClick={() => executar(() => removerUnidade(unidade.id), `Unidade ${romano} removida.`)}
            >
              Sim, remover
            </button>
            <button type="button" className="botao" disabled={ocupado} onClick={() => setRemovendo(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {unidade.aulas.length > 0 && (
        <ol className="painel-aulas" role="list">
          {unidade.aulas.map((a) => (
            <ItemAula key={a.id} aula={a} romano={romano} oferta={oferta} ocupado={ocupado} executar={executar} />
          ))}
        </ol>
      )}

      <FormNovo
        rotulo={`Nova aula na unidade ${romano}`}
        botao="Adicionar aula"
        ocupado={ocupado}
        maximo={160}
        aoEnviar={(titulo) => executar(() => adicionarAula(unidade.id, titulo), `Aula "${titulo}" adicionada.`)}
      />
    </section>
  )
}

function ItemAula({
  aula,
  romano,
  oferta,
  ocupado,
  executar,
}: {
  aula: AulaDoPainel
  romano: string
  oferta: OfertaDoPainel
  ocupado: boolean
  executar: Executar
}) {
  const [editando, setEditando] = useState(false)
  const rotulo = `${romano}.${aula.numero}`

  return (
    <li className={`painel-aula${aula.liberada ? ' painel-aula-liberada' : ''}`}>
      <div className="painel-aula-linha">
        <span className="painel-aula-numero">{rotulo}</span>
        <div className="painel-aula-info">
          <p className="painel-aula-titulo">{aula.titulo}</p>
          <p className="painel-aula-estado">
            <span className={aula.liberada ? 'painel-estado-liberada' : 'painel-estado-bloqueada'}>
              {aula.liberada ? 'Liberada' : 'Bloqueada'}
            </span>
            {' · '}
            {aula.link ? (
              <a href={aula.link.url} target="_blank" rel="noopener noreferrer" className="painel-link-aula">
                abrir link<span className="sr-only"> da aula {rotulo} (abre em outra aba)</span>
              </a>
            ) : (
              <span className="painel-sem-link">sem link</span>
            )}
          </p>
        </div>
        <div className="painel-botoes painel-aula-botoes">
          <button
            type="button"
            className={`botao${aula.liberada ? '' : ' botao-primario'}`}
            disabled={ocupado}
            aria-label={`${aula.liberada ? 'Bloquear' : 'Liberar'} aula ${rotulo}`}
            onClick={() =>
              executar(
                () => liberarAula(oferta.id, aula.id, !aula.liberada),
                `Aula ${rotulo} ${aula.liberada ? 'bloqueada' : 'liberada'} para ${oferta.turma.nome}.`,
              )
            }
          >
            {aula.liberada ? 'Bloquear' : 'Liberar'}
          </button>
          <button
            type="button"
            className="botao"
            disabled={ocupado}
            aria-expanded={editando}
            aria-label={`Editar aula ${rotulo}`}
            onClick={() => setEditando((v) => !v)}
          >
            Editar
          </button>
        </div>
      </div>
      {editando && (
        <FormAula aula={aula} rotulo={rotulo} ocupado={ocupado} executar={executar} aoFechar={() => setEditando(false)} />
      )}
    </li>
  )
}

function FormAula({
  aula,
  rotulo,
  ocupado,
  executar,
  aoFechar,
}: {
  aula: AulaDoPainel
  rotulo: string
  ocupado: boolean
  executar: Executar
  aoFechar: () => void
}) {
  const [titulo, setTitulo] = useState(aula.titulo)
  const [link, setLink] = useState(aula.link?.url ?? '')
  const [erros, setErros] = useState<{ titulo?: string; link?: string }>({})
  const [removendo, setRemovendo] = useState(false)
  const id = `aula-${aula.id}`

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const erroTitulo = validarTitulo(titulo)
    const erroLink = validarLink(link)
    setErros({ ...(erroTitulo ? { titulo: erroTitulo } : {}), ...(erroLink ? { link: erroLink } : {}) })
    if (erroTitulo || erroLink) return
    if (await executar(() => salvarAula(aula.id, titulo, link), `Aula ${rotulo} salva.`)) aoFechar()
  }

  return (
    <form className="painel-form-aula" onSubmit={salvar} noValidate>
      <div className={`campo${erros.titulo ? ' campo-com-erro' : ''}`}>
        <label htmlFor={`${id}-titulo`}>Título da aula {rotulo}</label>
        <input
          id={`${id}-titulo`}
          value={titulo}
          maxLength={160}
          onChange={(e) => setTitulo(e.target.value)}
          aria-invalid={erros.titulo ? true : undefined}
          aria-describedby={erros.titulo ? `${id}-titulo-erro` : undefined}
        />
        {erros.titulo && (
          <p id={`${id}-titulo-erro`} className="campo-erro">
            {erros.titulo}
          </p>
        )}
      </div>
      <div className={`campo${erros.link ? ' campo-com-erro' : ''}`}>
        <label htmlFor={`${id}-link`}>Link da aula (Drive, slides)</label>
        <input
          id={`${id}-link`}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          aria-invalid={erros.link ? true : undefined}
          aria-describedby={`${id}-link-dica${erros.link ? ` ${id}-link-erro` : ''}`}
        />
        <p id={`${id}-link-dica`} className="campo-dica">
          O aluno só vê o link quando a aula está liberada para a turma dele. Deixe vazio para tirar o link.
        </p>
        {erros.link && (
          <p id={`${id}-link-erro`} className="campo-erro">
            {erros.link}
          </p>
        )}
      </div>
      <div className="painel-botoes">
        <button type="submit" className="botao botao-primario" disabled={ocupado}>
          Salvar aula
        </button>
        <button type="button" className="botao" disabled={ocupado} onClick={aoFechar}>
          Cancelar
        </button>
        <button type="button" className="botao painel-botao-perigo" disabled={ocupado} onClick={() => setRemovendo(true)}>
          Remover aula
        </button>
      </div>
      {removendo && (
        <div className="painel-confirmar painel-confirmar-perigo">
          <p>Remover a aula {rotulo} em todas as turmas? O link e as liberações dela também saem, e as aulas seguintes mudam de número.</p>
          <div className="painel-botoes">
            <button
              type="button"
              className="botao painel-botao-perigo"
              disabled={ocupado}
              onClick={() => executar(() => removerAula(aula.id), `Aula ${rotulo} removida.`)}
            >
              Sim, remover
            </button>
            <button type="button" className="botao" disabled={ocupado} onClick={() => setRemovendo(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </form>
  )
}

/** Formulário de uma linha: título + botão (nova unidade, nova aula, renomear). */
function FormNovo({
  rotulo,
  botao,
  inicial = '',
  maximo,
  ocupado,
  aoEnviar,
  aoCancelar,
}: {
  rotulo: string
  botao: string
  inicial?: string
  maximo: number
  ocupado: boolean
  aoEnviar: (titulo: string) => Promise<boolean>
  aoCancelar?: () => void
}) {
  const [titulo, setTitulo] = useState(inicial)
  const [erro, setErro] = useState<string | null>(null)
  const id = `novo-${rotulo.replace(/\W+/g, '-').toLowerCase()}`

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const problema = validarTitulo(titulo, maximo)
    setErro(problema)
    if (problema) return
    if ((await aoEnviar(titulo.trim())) && !inicial) setTitulo('')
  }

  return (
    <form className="painel-form-novo" onSubmit={enviar} noValidate>
      <div className={`campo${erro ? ' campo-com-erro' : ''}`}>
        <label htmlFor={id}>{rotulo}</label>
        <div className="painel-form-linha">
          <input
            id={id}
            value={titulo}
            maxLength={maximo}
            onChange={(e) => setTitulo(e.target.value)}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? `${id}-erro` : undefined}
          />
          <button type="submit" className="botao" disabled={ocupado}>
            {botao}
          </button>
          {aoCancelar && (
            <button type="button" className="botao" disabled={ocupado} onClick={aoCancelar}>
              Cancelar
            </button>
          )}
        </div>
        {erro && (
          <p id={`${id}-erro`} className="campo-erro">
            {erro}
          </p>
        )}
      </div>
    </form>
  )
}
