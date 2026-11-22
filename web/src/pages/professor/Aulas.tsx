import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { nomeTurno } from '../../lib/api'
import { mensagemDeErro } from '../../lib/erros'
import { numeroRomano } from '../../lib/ponte'
import {
  adicionarAula,
  adicionarUnidade,
  carregarEstrutura,
  enviarSlides,
  liberarAula,
  liberarUnidade,
  listarOfertasDoPainel,
  planejarEnvioEmLote,
  soArquivosHtml,
  removerAula,
  removerSlides,
  removerUnidade,
  renomearUnidade,
  salvarAula,
  validarArquivoDeSlides,
  validarLink,
  validarTitulo,
  type ItemDoEnvio,
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
          <EnvioEmLote unidades={unidades} disciplina={oferta.disciplina.nome} sigla={oferta.disciplina.sigla} ocupado={ocupado} executar={executar} />
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
            em todas as turmas? Os links, os slides e as liberações também saem.
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
            {' · '}
            {aula.slides ? <span>com slides</span> : <span className="painel-sem-link">sem slides</span>}
            {' · '}
            {aula.exercicios > 0 ? (
              <span>
                {aula.exercicios} {aula.exercicios === 1 ? 'exercício' : 'exercícios'}
              </span>
            ) : (
              <span className="painel-sem-link">sem exercícios</span>
            )}
          </p>
        </div>
        <div className="painel-botoes painel-aula-botoes">
          {aula.slides ? (
            // Apresentar em sala vale mesmo com a aula bloqueada: o aluno só vê depois de Liberar.
            <Link to={`/slides/${aula.slides.id}`} className="botao" aria-label={`Apresentar slides da aula ${rotulo}`}>
              <span aria-hidden="true">▶</span> Apresentar
            </Link>
          ) : null}
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
          <Link to={`/professor/exercicios/${aula.id}`} className="botao" aria-label={`Exercícios da aula ${rotulo}`}>
            Exercícios
          </Link>
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
      <CampoSlides aula={aula} rotulo={rotulo} ocupado={ocupado} executar={executar} />
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
          <p>Remover a aula {rotulo} em todas as turmas? O link, os slides e as liberações dela também saem, e as aulas seguintes mudam de número.</p>
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

/** Slides HTML de uma aula: enviar, trocar ou remover o arquivo. */
function CampoSlides({
  aula,
  rotulo,
  ocupado,
  executar,
}: {
  aula: AulaDoPainel
  rotulo: string
  ocupado: boolean
  executar: Executar
}) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
  const id = `aula-${aula.id}-slides`

  async function enviar() {
    const problema = arquivo ? validarArquivoDeSlides(arquivo) : 'Escolha o arquivo .html dos slides.'
    setErro(problema)
    if (problema || !arquivo) return
    const ok = await executar(
      () => enviarSlides(aula.id, arquivo),
      `Slides da aula ${rotulo} ${aula.slides ? 'trocados' : 'enviados'}.`,
    )
    if (ok) {
      setArquivo(null)
      if (entrada.current) entrada.current.value = ''
    }
  }

  return (
    <fieldset className={`painel-slides campo${erro ? ' campo-com-erro' : ''}`}>
      <legend>Slides da aula {rotulo} (HTML)</legend>
      <p className="campo-dica" id={`${id}-dica`}>
        {aula.slides ? (
          <>
            Esta aula tem slides.{' '}
            <Link to={`/slides/${aula.slides.id}`} className="painel-link-aula">
              Abrir os slides
            </Link>
            . Enviar outro arquivo substitui o atual.
          </>
        ) : (
          'Arquivo .html de até 10 MB. O aluno só abre quando a aula está liberada para a turma dele.'
        )}
      </p>
      <label htmlFor={id} className="sr-only">
        Arquivo de slides da aula {rotulo}
      </label>
      <input
        ref={entrada}
        id={id}
        type="file"
        accept=".html,.htm,text/html"
        className="painel-arquivo"
        onChange={(e) => {
          setArquivo(e.target.files?.[0] ?? null)
          setErro(null)
        }}
        aria-invalid={erro ? true : undefined}
        aria-describedby={`${id}-dica${erro ? ` ${id}-erro` : ''}`}
      />
      {erro && (
        <p id={`${id}-erro`} className="campo-erro">
          {erro}
        </p>
      )}
      <div className="painel-botoes">
        <button type="button" className="botao" disabled={ocupado} onClick={enviar}>
          {aula.slides ? 'Trocar slides' : 'Enviar slides'}
        </button>
        {aula.slides && (
          <button type="button" className="botao painel-botao-perigo" disabled={ocupado} onClick={() => setRemovendo(true)}>
            Remover slides
          </button>
        )}
      </div>
      {removendo && aula.slides && (
        <div className="painel-confirmar painel-confirmar-perigo">
          <p>Remover os slides da aula {rotulo}? O arquivo é apagado e sai para todas as turmas.</p>
          <div className="painel-botoes">
            <button
              type="button"
              className="botao painel-botao-perigo"
              disabled={ocupado}
              onClick={async () => {
                if (await executar(() => removerSlides(aula.id), `Slides da aula ${rotulo} removidos.`)) setRemovendo(false)
              }}
            >
              Sim, remover slides
            </button>
            <button type="button" className="botao" disabled={ocupado} onClick={() => setRemovendo(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </fieldset>
  )
}

/** Vários arquivos de uma vez: cada um vai para a aula indicada no nome (ex.: ALG_U1_A2). */
function EnvioEmLote({
  unidades,
  disciplina,
  sigla,
  ocupado,
  executar,
}: {
  unidades: UnidadeDoPainel[]
  disciplina: string
  sigla: string
  ocupado: boolean
  executar: Executar
}) {
  const [itens, setItens] = useState<ItemDoEnvio[]>([])
  const [progresso, setProgresso] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const entradaPasta = useRef<HTMLInputElement>(null)
  const validos = itens.filter((i) => i.aula)
  const substitui = validos.filter((i) => i.aula?.temSlides).length

  async function enviarTodos() {
    const falhas: string[] = []
    const ok = await executar(async () => {
      for (const [n, item] of validos.entries()) {
        setProgresso(`Enviando ${n + 1} de ${validos.length}…`)
        try {
          if (item.aula) await enviarSlides(item.aula.id, item.arquivo)
        } catch {
          falhas.push(item.arquivo.name)
        }
      }
      setProgresso(null)
      if (falhas.length > 0) {
        throw new Error(
          `${validos.length - falhas.length} de ${validos.length} enviados. Não foi possível enviar: ${falhas.join(', ')}.`,
        )
      }
    }, `${validos.length} ${validos.length === 1 ? 'arquivo de slides enviado' : 'arquivos de slides enviados'}.`)
    setProgresso(null)
    if (ok || falhas.length > 0) {
      setItens([])
      if (entrada.current) entrada.current.value = ''
      if (entradaPasta.current) entradaPasta.current.value = ''
      if (entradaPasta.current) entradaPasta.current.value = ''
    }
  }

  return (
    <details className="cartao painel-lote">
      <summary>Enviar vários slides de uma vez</summary>
      <div className="painel-lote-corpo">
        <p className="campo-dica">
          Escolha os arquivos .html de {disciplina}, ou a pasta que guarda as pastas das unidades. O nome de cada
          arquivo diz a aula: <code>ALG_U1_A2.html</code> vai para a Unidade I, Aula 2. Os slides valem para todas as
          turmas desta disciplina e só aparecem para o aluno quando a aula é liberada.
        </p>
        <div className="campo">
          <label htmlFor="lote-arquivos">Arquivos de slides</label>
          <input
            ref={entrada}
            id="lote-arquivos"
            type="file"
            multiple
            accept=".html,.htm,text/html"
            className="painel-arquivo"
            onChange={(e) => setItens(planejarEnvioEmLote([...(e.target.files ?? [])], unidades, sigla))}
          />
        </div>
        <div className="campo">
          <label htmlFor="lote-pasta">Ou uma pasta inteira (com as subpastas)</label>
          <input
            ref={entradaPasta}
            id="lote-pasta"
            type="file"
            multiple
            className="painel-arquivo"
            {...{ webkitdirectory: '' }}
            onChange={(e) => setItens(planejarEnvioEmLote(soArquivosHtml([...(e.target.files ?? [])]), unidades, sigla))}
          />
        </div>
        {itens.length > 0 && (
          <>
            <ul className="painel-lote-lista" role="list">
              {itens.map((i) => (
                <li key={i.arquivo.webkitRelativePath || i.arquivo.name} className={i.aula ? 'painel-lote-ok' : 'painel-lote-problema'}>
                  <span className="painel-lote-arquivo">{i.arquivo.name}</span>
                  <span>
                    {i.aula
                      ? `→ Aula ${i.aula.rotulo}: ${i.aula.titulo}${i.aula.temSlides ? ' (substitui)' : ''}`
                      : i.problema}
                  </span>
                </li>
              ))}
            </ul>
            <p className="painel-resumo" aria-live="polite">
              {progresso ??
                `${validos.length} de ${itens.length} ${itens.length === 1 ? 'arquivo pronto' : 'arquivos prontos'} para enviar${
                  substitui > 0 ? `, ${substitui} substituindo slides que já existem` : ''
                }.`}
            </p>
            <div className="painel-botoes">
              <button
                type="button"
                className="botao botao-primario"
                disabled={ocupado || validos.length === 0}
                onClick={enviarTodos}
              >
                Enviar {validos.length} {validos.length === 1 ? 'arquivo' : 'arquivos'}
              </button>
            </div>
          </>
        )}
      </div>
    </details>
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
