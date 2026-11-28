import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  CABELO_COR_LIVRE,
  CAMADAS_OPCIONAIS,
  COR_LIVRE,
  PECAS,
  corValida,
  type Camada,
  type Escolhas,
  type Peca,
} from '../arte/avatar'
import { useAuth } from '../auth/AuthContext'
import { EscolherApelido } from '../components/Apelido'
import { Aviso } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Carregando } from '../components/Carregando'
import { carregarAvatar, carregarAvatarNinja, salvarAvatar, salvarAvatarNinja } from '../lib/avatar'
import { mensagemDeErro } from '../lib/erros'
import { carregarLoja, situacaoDaPeca, type Loja, type SituacaoDaPeca } from '../lib/loja'
import { Moeda } from '../components/Moeda'
import { CompraDaPeca, LojaDoHangar } from './LojaDoHangar'
import { OpcaoPeca } from '../components/OpcaoPeca'
import { useModoNinja } from '../ninja/ModoNinja'
import { apelidoDoNinja, guardarApelidoDoNinja } from '../ninja/progressoNinja'
import './Hangar.css'

interface Grupo {
  camada: Camada
  titulo: string
  /** Mostra bolinhas de cor em vez de quadradinhos com a peça. */
  bolinhas?: boolean
}

interface Aba {
  id: string
  rotulo: string
  grupos: Grupo[]
  /** Os grupos viram botões (um por vez) em vez de ficarem um embaixo do outro. */
  submenu?: boolean
}

const ABAS: Aba[] = [
  {
    id: 'corpo',
    rotulo: 'Corpo',
    grupos: [
      { camada: 'base', titulo: 'Base' },
      { camada: 'altura', titulo: 'Altura' },
      { camada: 'corpo', titulo: 'Tipo de corpo' },
    ],
  },
  { id: 'pele', rotulo: 'Pele', grupos: [{ camada: 'pele', titulo: 'Tom de pele', bolinhas: true }] },
  {
    id: 'rosto',
    rotulo: 'Rosto',
    grupos: [
      { camada: 'rosto', titulo: 'Expressão' },
      { camada: 'barba', titulo: 'Barba' },
    ],
  },
  {
    id: 'cabelo',
    rotulo: 'Cabelo',
    grupos: [
      { camada: 'cabelo', titulo: 'Estilo' },
      { camada: 'cor-do-cabelo', titulo: 'Cor', bolinhas: true },
    ],
  },
  {
    id: 'roupa',
    rotulo: 'Roupa',
    submenu: true,
    grupos: [
      { camada: 'roupa', titulo: 'Parte de cima' },
      { camada: 'parte-de-baixo', titulo: 'Parte de baixo' },
      { camada: 'pes', titulo: 'Pés' },
    ],
  },
  {
    id: 'acessorios',
    rotulo: 'Acessórios',
    submenu: true,
    grupos: [
      { camada: 'acessorio-cabeca', titulo: 'Cabeça' },
      { camada: 'acessorio-rosto', titulo: 'Rosto' },
      { camada: 'acessorio-corpo', titulo: 'Corpo e mãos' },
    ],
  },
]

/** Cor de fundo da bolinha: a cor da pele, a do cabelo ou o degradê do cabelo. */
function fundoDaBolinha(p: Peca): string {
  const c = p.cores ?? {}
  if (c.c2) return `linear-gradient(180deg, ${c.c} 0 50%, ${c.c2} 50% 100%)`
  return c.p ?? c.c ?? 'transparent'
}

/** Hangar: o aluno (ou o professor) monta o boneco com as peças liberadas. */
export function Hangar() {
  const { perfil } = useAuth()
  const papel = perfil?.papel === 'professor' ? 'professor' : 'aluno'
  const ninja = useModoNinja().ativo
  const [salvo, setSalvo] = useState<Escolhas | null>(null)
  const [escolhas, setEscolhas] = useState<Escolhas | null>(null)
  // Só o aluno tem loja: professor e ninja usam tudo de graça.
  const [loja, setLoja] = useState<Loja | null>(null)
  const [params] = useSearchParams()
  const [aba, setAba] = useState(() => (params.get('aba') === 'loja' ? 'loja' : 'corpo'))
  const [sub, setSub] = useState<Record<string, number>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    if (!perfil) return
    let ativo = true
    Promise.all([
      ninja ? carregarAvatarNinja(perfil.id) : carregarAvatar(perfil.id, papel),
      papel === 'aluno' && !ninja ? carregarLoja() : Promise.resolve(null),
    ])
      .then(([avatar, lojaAtual]) => {
        if (!ativo) return
        setSalvo(avatar)
        setEscolhas(avatar)
        setLoja(lojaAtual)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [perfil, papel, ninja])

  if (erro) {
    return (
      <div className="hangar container">
        <Aviso tipo="erro" titulo="Não foi possível abrir o Hangar">
          {erro}
        </Aviso>
      </div>
    )
  }
  if (!escolhas || !salvo) return <Carregando />

  // O ninja usa qualquer peça; aluno e professor, só as do seu papel.
  // Peça da loja fora de venda e não comprada nem aparece.
  const situacao = (p: Peca): SituacaoDaPeca => (loja ? situacaoDaPeca(p.id, loja, p.xpMinimo) : { tipo: 'livre' })
  const pode = (p: Peca) => {
    if (!(ninja || p.para === 'todos' || p.para === papel)) return false
    const s = situacao(p)
    return s.tipo !== 'loja' || s.aVenda
  }
  const abas = loja ? [...ABAS, { id: 'loja', rotulo: 'Loja', grupos: [] }] : ABAS
  const abaAtual = abas.find((a) => a.id === aba) ?? ABAS[0]!
  // Peças da loja que o aluno está só experimentando (ainda não comprou).
  const experimentando = PECAS.filter(
    (p) => escolhas[p.camada] === p.id && situacao(p).tipo === 'loja',
  )
  const grupos = abaAtual.submenu ? [abaAtual.grupos[sub[aba] ?? 0] ?? abaAtual.grupos[0]!] : abaAtual.grupos
  const mudou = JSON.stringify(escolhas) !== JSON.stringify(salvo)
  const voltarPara = ninja ? '/ninja' : papel === 'professor' ? '/professor' : '/ponte'

  function escolher(camada: Camada, peca: Peca | null) {
    setMensagem(null)
    setEscolhas((atual) => {
      const novo: Escolhas = { ...atual }
      if (peca) novo[camada] = peca.id
      else delete novo[camada]
      if (camada === 'cor-do-cabelo' && peca?.id !== CABELO_COR_LIVRE) delete novo[COR_LIVRE]
      return novo
    })
  }

  function escolherCorLivre(cor: string) {
    const valor = cor.toLowerCase()
    if (!corValida(valor)) return
    setMensagem(null)
    setEscolhas((atual) => ({ ...atual, 'cor-do-cabelo': CABELO_COR_LIVRE, [COR_LIVRE]: valor }))
  }

  async function salvar() {
    if (!escolhas) return
    setSalvando(true)
    setMensagem(null)
    try {
      await (ninja ? salvarAvatarNinja(escolhas) : salvarAvatar(escolhas))
      setSalvo(escolhas)
      setMensagem({ tipo: 'sucesso', texto: ninja ? 'Ninja salvo!' : 'Boneco salvo!' })
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(e) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="hangar container">
      <Link to={voltarPara} className="hangar-voltar">
        ← Voltar
      </Link>
      <header className="cartao hangar-topo">
        <p className="pixel hangar-selo">{ninja ? 'Hangar ninja' : 'Hangar'}</p>
        <h1>{ninja ? 'Monte o seu ninja' : papel === 'professor' ? 'Monte o seu boneco' : 'Monte o seu tripulante'}</h1>
        <p className="hangar-intro">
          {ninja
            ? 'O ninja pode usar qualquer peça, inclusive as cinco só dele. Ele aparece só no Modo Ninja: os alunos continuam vendo o seu boneco de professor.'
            : papel === 'professor'
            ? 'Os alunos veem o seu boneco. As peças de professor são só suas.'
            : `Você tem ${loja?.xp ?? 0} XP. As peças do uniforme se abrem sozinhas quando a sua patente sobe. As peças com moedinha ficam na Loja: dá para experimentar antes de comprar. Só você e o professor veem o seu boneco.`}
        </p>
        {loja && (
          <p className="hangar-saldo">
            <Moeda tamanho={20} />
            <span>
              <strong>{loja.moedas}</strong> {loja.moedas === 1 ? 'moeda' : 'moedas'}
            </span>
          </p>
        )}
      </header>

      <div className="hangar-oficina">
        <section className="cartao hangar-previa" aria-label="Prévia do boneco">
          <div className="hangar-palco">
            <Avatar escolhas={escolhas} tamanho={192} rotulo={ninja ? 'Prévia do seu ninja' : 'Prévia do seu boneco'} />
          </div>
          <div className="hangar-acoes">
            <button
              type="button"
              className="botao botao-primario"
              onClick={salvar}
              disabled={!mudou || salvando || experimentando.length > 0}
            >
              {salvando ? 'Salvando…' : ninja ? 'Salvar ninja' : 'Salvar boneco'}
            </button>
            <button type="button" className="botao" onClick={() => setEscolhas(salvo)} disabled={!mudou || salvando}>
              Desfazer
            </button>
          </div>
          <p role="status" className={`hangar-mensagem hangar-mensagem-${mensagem?.tipo ?? 'vazia'}`}>
            {mensagem?.texto ??
              (experimentando.length > 0
                ? 'Peça da loja: compre antes de salvar o boneco.'
                : mudou
                  ? 'Há mudanças não salvas.'
                  : '')}
          </p>
          {loja &&
            experimentando.map((p) => (
              <CompraDaPeca
                key={p.id}
                peca={p}
                loja={loja}
                aoComprar={(moedas) => {
                  setLoja({ ...loja, moedas, compradas: new Set([...loja.compradas, p.id]) })
                  setMensagem({ tipo: 'sucesso', texto: `${p.nome} agora é sua! Salve o boneco para usar.` })
                }}
              />
            ))}
        </section>

        <section className="cartao hangar-pecas" aria-label="Peças">
          <div className="hangar-abas" role="tablist" aria-label="Partes do boneco">
            {abas.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={a.id === aba}
                className={`hangar-aba${a.id === aba ? ' hangar-aba-atual' : ''}`}
                onClick={() => setAba(a.id)}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
          <div className="hangar-painel" role="tabpanel" aria-label={abaAtual.rotulo}>
            {abaAtual.id === 'loja' && loja && (
              <LojaDoHangar
                loja={loja}
                escolhas={escolhas}
                aoMudarLoja={setLoja}
                aoExperimentar={(p) => {
                  setMensagem(null)
                  setEscolhas((atual) => ({ ...atual, [p.camada]: p.id }))
                }}
              />
            )}
            {abaAtual.submenu && (
              <div className="hangar-submenu" role="group" aria-label={`Grupos de ${abaAtual.rotulo.toLowerCase()}`}>
                {abaAtual.grupos.map((g, i) => {
                  const atual = (sub[aba] ?? 0) === i
                  return (
                    <button
                      key={g.camada}
                      type="button"
                      aria-pressed={atual}
                      className={`hangar-sub${atual ? ' hangar-sub-atual' : ''}`}
                      onClick={() => setSub((s) => ({ ...s, [aba]: i }))}
                    >
                      {g.titulo}
                    </button>
                  )
                })}
              </div>
            )}
            {grupos.map((g) => {
              const pecas = PECAS.filter((p) => p.camada === g.camada && pode(p))
              const opcional = CAMADAS_OPCIONAIS.includes(g.camada)
              return (
                <div key={g.camada} className="hangar-grupo">
                  <h2 className="hangar-grupo-titulo">{g.titulo}</h2>
                  {g.bolinhas ? (
                    <div className="hangar-bolinhas">
                      {pecas.map((p) =>
                        p.id === CABELO_COR_LIVRE ? (
                          <CorLivre
                            key={p.id}
                            cor={corValida(escolhas[COR_LIVRE]) ? escolhas[COR_LIVRE] : '#6b4027'}
                            escolhida={escolhas['cor-do-cabelo'] === p.id}
                            aoEscolher={escolherCorLivre}
                          />
                        ) : (
                          <Bolinha
                            key={p.id}
                            peca={p}
                            escolhida={escolhas[g.camada] === p.id}
                            situacao={situacao(p)}
                            aoEscolher={() => escolher(g.camada, p)}
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="hangar-grade">
                      {opcional && (
                        <OpcaoPeca
                          nome="Nenhum"
                          escolhida={!escolhas[g.camada]}
                          aoEscolher={() => escolher(g.camada, null)}
                          previa={{ ...escolhas, [g.camada]: undefined }}
                          camada={g.camada}
                        />
                      )}
                      {pecas.map((p) => (
                        <OpcaoPeca
                          key={p.id}
                          nome={p.nome}
                          escolhida={escolhas[g.camada] === p.id}
                          situacao={situacao(p)}
                          aoEscolher={() => escolher(g.camada, p)}
                          previa={{ ...escolhas, [g.camada]: p.id }}
                          camada={g.camada}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {ninja ? (
        perfil && <ApelidoDoNinja perfilId={perfil.id} />
      ) : (
        <EscolherApelido titulo={papel === 'professor' ? 'Seu apelido (aparece para os alunos)' : 'Seu apelido na nave'} />
      )}
    </div>
  )
}

/** Apelido do ninja: sorteado como o do aluno, guardado só no navegador do professor. */
function ApelidoDoNinja({ perfilId }: { perfilId: string }) {
  const [atual, setAtual] = useState(() => apelidoDoNinja(perfilId))
  return (
    <EscolherApelido
      titulo="Apelido do ninja"
      ninja={{
        atual,
        aoUsar: (a) => {
          guardarApelidoDoNinja(perfilId, a)
          setAtual(a)
        },
      }}
    />
  )
}

export function Bolinha({
  peca,
  escolhida,
  situacao,
  aoEscolher,
}: {
  peca: Peca
  escolhida: boolean
  situacao: SituacaoDaPeca
  aoEscolher: () => void
}) {
  const trancada = situacao.tipo === 'xp' ? situacao.xp : null
  const nome =
    situacao.tipo === 'xp'
      ? `${peca.nome} (abre com ${situacao.xp} XP)`
      : situacao.tipo === 'loja'
        ? `${peca.nome} (na loja por ${situacao.preco} moedas)`
        : peca.nome
  return (
    <button
      type="button"
      className={`hangar-bolinha${escolhida ? ' hangar-bolinha-escolhida' : ''}`}
      style={{ background: fundoDaBolinha(peca) }}
      aria-pressed={escolhida}
      aria-label={nome}
      title={nome}
      disabled={trancada !== null}
      onClick={aoEscolher}
    >
      {trancada !== null && (
        <span className="hangar-bolinha-cadeado" aria-hidden="true">
          🔒
        </span>
      )}
      {situacao.tipo === 'loja' && (
        <span className="hangar-bolinha-moeda" aria-hidden="true">
          <Moeda tamanho={14} />
        </span>
      )}
    </button>
  )
}

/** "Escolher minha cor": abre o seletor de cor do aparelho. */
function CorLivre({ cor, escolhida, aoEscolher }: { cor: string; escolhida: boolean; aoEscolher: (cor: string) => void }) {
  return (
    <label className={`hangar-cor-livre${escolhida ? ' hangar-bolinha-escolhida' : ''}`}>
      <input type="color" value={cor} onChange={(e) => aoEscolher(e.target.value)} />
      <span>Escolher minha cor</span>
    </label>
  )
}
