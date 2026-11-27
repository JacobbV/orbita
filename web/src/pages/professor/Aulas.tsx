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
  enviarMaterial,
  enviarSlides,
  lerTopicos,
  removerMaterial,
  salvarTopicos,
  validarArquivoDeMaterial,
  validarTopicos,
  NOME_DO_ARQUIVO,
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
  unidadeAtual,
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
  // Unidades abertas na turma escolhida. Null = ainda não mexeu: só a atual aberta.
  const [abertas, setAbertas] = useState<{ ofertaId: number; ids: Set<number> } | null>(null)

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

  const idsAbertos =
    abertas && oferta && abertas.ofertaId === oferta.id ? abertas.ids : new Set(unidades ? [unidadeAtual(unidades)?.id ?? -1] : [])
  const todasAbertas = Boolean(unidades && unidades.length > 0 && unidades.every((u) => idsAbertos.has(u.id)))
  function alternar(id: number) {
    if (!oferta) return
    const ids = new Set(idsAbertos)
    if (ids.has(id)) ids.delete(id)
    else ids.add(id)
    setAbertas({ ofertaId: oferta.id, ids })
  }
  function abrirOuFecharTodas() {
    if (!oferta || !unidades) return
    setAbertas({ ofertaId: oferta.id, ids: new Set(todasAbertas ? [] : unidades.map((u) => u.id)) })
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
          {unidades.length > 1 && (
            <div className="painel-unidades-barra">
              <p className="campo-dica">Só a unidade atual começa aberta. Toque no nome de uma unidade para abrir ou fechar.</p>
              <button type="button" className="botao botao-compacto" onClick={abrirOuFecharTodas}>
                {todasAbertas ? 'Fechar todas as unidades' : 'Abrir todas as unidades'}
              </button>
            </div>
          )}
          <div className="painel-unidades">
            {unidades.map((u) => (
              <CartaoUnidade
                key={u.id}
                unidade={u}
                oferta={oferta}
                totalUnidades={unidades.length}
                aberta={idsAbertos.has(u.id)}
                aoAlternar={() => alternar(u.id)}
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
  aberta,
  aoAlternar,
  ocupado,
  executar,
}: {
  unidade: UnidadeDoPainel
  oferta: OfertaDoPainel
  totalUnidades: number
  aberta: boolean
  aoAlternar: () => void
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
    <section className={`cartao painel-unidade${aberta ? ' painel-unidade-aberta' : ''}`} aria-labelledby={idTitulo}>
      <div className="painel-unidade-topo">
        <h3 className="painel-unidade-nome">
          <button
            type="button"
            className="painel-unidade-alternar"
            aria-expanded={aberta}
            aria-controls={`${idTitulo}-aulas`}
            onClick={aoAlternar}
          >
            <span className="painel-unidade-seta" aria-hidden="true" />
            <span className="painel-unidade-textos">
              <span className="pixel painel-unidade-numero">Unidade {romano}</span>
              <span id={idTitulo} className="painel-unidade-titulo">
                {unidade.titulo}
              </span>
              <span className="painel-unidade-contagem">
                {unidade.aulas.length === 0
                  ? 'Sem aulas ainda'
                  : `${liberadas} de ${unidade.aulas.length} liberadas para ${oferta.turma.nome}`}
              </span>
            </span>
          </button>
        </h3>
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

      <div id={`${idTitulo}-aulas`} className="painel-unidade-conteudo" hidden={!aberta}>
        {aberta && (
          <>
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
          </>
        )}
      </div>
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
            {aula.apostila ? <span>{' · '}com apostila</span> : null}
            {aula.audio ? <span>{' · '}com áudio</span> : null}
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
  const [topicos, setTopicos] = useState(aula.topicos.join('\n'))
  const [erros, setErros] = useState<{ titulo?: string; link?: string; topicos?: string }>({})
  const [removendo, setRemovendo] = useState(false)
  const id = `aula-${aula.id}`

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const erroTitulo = validarTitulo(titulo)
    const erroLink = validarLink(link)
    const lista = lerTopicos(topicos)
    const erroTopicos = validarTopicos(lista)
    setErros({
      ...(erroTitulo ? { titulo: erroTitulo } : {}),
      ...(erroLink ? { link: erroLink } : {}),
      ...(erroTopicos ? { topicos: erroTopicos } : {}),
    })
    if (erroTitulo || erroLink || erroTopicos) return
    const salvou = await executar(async () => {
      await salvarAula(aula.id, titulo, link)
      await salvarTopicos(aula.id, lista)
    }, `Aula ${rotulo} salva.`)
    if (salvou) aoFechar()
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
      <div className={`campo${erros.topicos ? ' campo-com-erro' : ''}`}>
        <label htmlFor={`${id}-topicos`}>Nesta aula (um tópico por linha, até 5)</label>
        <textarea
          id={`${id}-topicos`}
          rows={5}
          value={topicos}
          onChange={(e) => setTopicos(e.target.value)}
          aria-invalid={erros.topicos ? true : undefined}
          aria-describedby={`${id}-topicos-dica${erros.topicos ? ` ${id}-topicos-erro` : ''}`}
        />
        <p id={`${id}-topicos-dica`} className="campo-dica">
          Aparecem para o aluno no cartão "Nesta aula" da página da aula.
        </p>
        {erros.topicos && (
          <p id={`${id}-topicos-erro`} className="campo-erro">
            {erros.topicos}
          </p>
        )}
      </div>
      <CampoSlides aula={aula} rotulo={rotulo} ocupado={ocupado} executar={executar} />
      <CampoMaterial tipo="apostila" aula={aula} rotulo={rotulo} ocupado={ocupado} executar={executar} />
      <CampoMaterial tipo="audio" aula={aula} rotulo={rotulo} ocupado={ocupado} executar={executar} />
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

/** Apostila (.html) ou áudio (.mp3) de uma aula: enviar, trocar ou remover o arquivo. */
function CampoMaterial({
  tipo,
  aula,
  rotulo,
  ocupado,
  executar,
}: {
  tipo: 'apostila' | 'audio'
  aula: AulaDoPainel
  rotulo: string
  ocupado: boolean
  executar: Executar
}) {
  const atual = tipo === 'apostila' ? aula.apostila : aula.audio
  const nome = NOME_DO_ARQUIVO[tipo]
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
  const id = `aula-${aula.id}-${tipo}`

  async function enviar() {
    const problema = arquivo ? validarArquivoDeMaterial(tipo, arquivo) : `Escolha o arquivo ${tipo === 'audio' ? '.mp3' : '.html'}.`
    setErro(problema)
    if (problema || !arquivo) return
    const ok = await executar(
      () => enviarMaterial(aula.id, tipo, arquivo),
      tipo === 'audio' ? `Áudio da aula ${rotulo} ${atual ? 'trocado' : 'enviado'}.` : `Apostila da aula ${rotulo} ${atual ? 'trocada' : 'enviada'}.`,
    )
    if (ok) {
      setArquivo(null)
      if (entrada.current) entrada.current.value = ''
    }
  }

  return (
    <fieldset className={`painel-slides campo${erro ? ' campo-com-erro' : ''}`}>
      <legend>
        {tipo === 'audio' ? `Áudio da aula ${rotulo} (.mp3)` : `Apostila da aula ${rotulo} (HTML)`}
      </legend>
      <p className="campo-dica" id={`${id}-dica`}>
        {atual
          ? `Esta aula tem ${nome}. Enviar outro arquivo substitui o atual.`
          : tipo === 'audio'
            ? 'Arquivo .mp3 de até 10 MB (qualidade de voz, uns 3 MB para 12 minutos). O aluno ganha 10 XP ao ouvir até o fim.'
            : 'Arquivo .html de até 10 MB, igual ao dos slides. Aparece na página da aula, com a marca-d\'água do aluno.'}
      </p>
      <label htmlFor={id} className="sr-only">
        Arquivo de {nome} da aula {rotulo}
      </label>
      <input
        ref={entrada}
        id={id}
        type="file"
        accept={tipo === 'audio' ? '.mp3,audio/mpeg' : '.html,.htm,text/html'}
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
          {atual ? `Trocar ${nome}` : `Enviar ${nome}`}
        </button>
        {atual && (
          <button type="button" className="botao painel-botao-perigo" disabled={ocupado} onClick={() => setRemovendo(true)}>
            Remover {nome}
          </button>
        )}
      </div>
      {removendo && atual && (
        <div className="painel-confirmar painel-confirmar-perigo">
          <p>Remover {tipo === 'audio' ? 'o' : 'a'} {nome} da aula {rotulo}? O arquivo é apagado e sai para todas as turmas.</p>
          <div className="painel-botoes">
            <button
              type="button"
              className="botao painel-botao-perigo"
              disabled={ocupado}
              onClick={async () => {
                if (await executar(() => removerMaterial(aula.id, tipo), `${tipo === 'audio' ? 'Áudio removido' : 'Apostila removida'} da aula ${rotulo}.`)) setRemovendo(false)
              }}
            >
              Sim, remover {nome}
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
  const substitui = validos.filter((i) => i.aula?.substitui).length

  async function enviarTodos() {
    const falhas: string[] = []
    const ok = await executar(async () => {
      for (const [n, item] of validos.entries()) {
        setProgresso(`Enviando ${n + 1} de ${validos.length}…`)
        try {
          if (item.aula) {
            if (item.tipo === 'slide') await enviarSlides(item.aula.id, item.arquivo)
            else await enviarMaterial(item.aula.id, item.tipo, item.arquivo)
          }
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
    }, validos.every((i) => i.tipo === 'slide')
        ? `${validos.length} ${validos.length === 1 ? 'arquivo de slides enviado' : 'arquivos de slides enviados'}.`
        : `${validos.length} ${validos.length === 1 ? 'arquivo enviado' : 'arquivos enviados'}.`)
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
          Escolha os arquivos de {disciplina} (.html e .mp3), ou a pasta que guarda as pastas das unidades. O nome de
          cada arquivo diz a aula: <code>ALG_U1_A2.html</code> vai para a Unidade I, Aula 2 como slides,{' '}
          <code>ALG_U1_A2_apostila.html</code> como apostila e <code>ALG_U1_A2_audio.mp3</code> como áudio. Os slides valem para todas as
          turmas desta disciplina e só aparecem para o aluno quando a aula é liberada.
        </p>
        <div className="campo">
          <label htmlFor="lote-arquivos">Arquivos de slides</label>
          <input
            ref={entrada}
            id="lote-arquivos"
            type="file"
            multiple
            accept=".html,.htm,text/html,.mp3,audio/mpeg"
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
                      ? `→ Aula ${i.aula.rotulo}${i.tipo === 'slide' ? '' : ` (${NOME_DO_ARQUIVO[i.tipo]})`}: ${i.aula.titulo}${i.aula.substitui ? ' (substitui)' : ''}`
                      : i.problema}
                  </span>
                </li>
              ))}
            </ul>
            <p className="painel-resumo" aria-live="polite">
              {progresso ??
                `${validos.length} de ${itens.length} ${itens.length === 1 ? 'arquivo pronto' : 'arquivos prontos'} para enviar${
                  substitui > 0 ? `, ${substitui} substituindo arquivos que já existem` : ''
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
