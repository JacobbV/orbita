import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { PECAS, type Camada, type Escolhas, type Peca } from '../arte/avatar'
import { useAuth } from '../auth/AuthContext'
import { EscolherApelido } from '../components/Apelido'
import { Aviso } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Carregando } from '../components/Carregando'
import { carregarAvatar, carregarAvatarNinja, salvarAvatar, salvarAvatarNinja } from '../lib/avatar'
import { mensagemDeErro } from '../lib/erros'
import { carregarProgresso } from '../lib/progresso'
import { useModoNinja } from '../ninja/ModoNinja'
import './Hangar.css'

const ABAS: { camada: Camada; rotulo: string }[] = [
  { camada: 'corpo', rotulo: 'Corpo' },
  { camada: 'pele', rotulo: 'Pele' },
  { camada: 'rosto', rotulo: 'Rosto' },
  { camada: 'cabelo', rotulo: 'Cabelo' },
  { camada: 'cor-do-cabelo', rotulo: 'Cor do cabelo' },
  { camada: 'roupa', rotulo: 'Roupa' },
  { camada: 'acessorio', rotulo: 'Acessório' },
]

/** Hangar: o aluno (ou o professor) monta o boneco com as peças liberadas. */
export function Hangar() {
  const { perfil } = useAuth()
  const papel = perfil?.papel === 'professor' ? 'professor' : 'aluno'
  const ninja = useModoNinja().ativo
  const [salvo, setSalvo] = useState<Escolhas | null>(null)
  const [escolhas, setEscolhas] = useState<Escolhas | null>(null)
  const [xp, setXp] = useState(0)
  const [aba, setAba] = useState<Camada>('corpo')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    if (!perfil) return
    let ativo = true
    Promise.all([
      ninja ? carregarAvatarNinja(perfil.id) : carregarAvatar(perfil.id, papel),
      papel === 'aluno' ? carregarProgresso().then((p) => p.xp, () => 0) : Promise.resolve(Number.MAX_SAFE_INTEGER),
    ])
      .then(([avatar, xpAtual]) => {
        if (!ativo) return
        setSalvo(avatar)
        setEscolhas(avatar)
        setXp(xpAtual)
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
  const pecasDaAba = PECAS.filter((p) => p.camada === aba && (ninja || p.para === 'todos' || p.para === papel))
  const mudou = JSON.stringify(escolhas) !== JSON.stringify(salvo)
  const voltarPara = ninja ? '/ninja' : papel === 'professor' ? '/professor' : '/ponte'

  function escolher(peca: Peca | null) {
    setMensagem(null)
    setEscolhas((atual) => {
      const novo: Escolhas = { ...atual }
      if (peca) novo[aba] = peca.id
      else delete novo[aba]
      return novo
    })
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
            : `Você tem ${xp} XP. Peças com cadeado se abrem quando você ganha mais XP. Só você e o professor veem o seu boneco.`}
        </p>
      </header>

      <div className="hangar-oficina">
        <section className="cartao hangar-previa" aria-label="Prévia do boneco">
          <div className="hangar-palco">
            <Avatar escolhas={escolhas} tamanho={192} rotulo={ninja ? 'Prévia do seu ninja' : 'Prévia do seu boneco'} />
          </div>
          <div className="hangar-acoes">
            <button type="button" className="botao botao-primario" onClick={salvar} disabled={!mudou || salvando}>
              {salvando ? 'Salvando…' : ninja ? 'Salvar ninja' : 'Salvar boneco'}
            </button>
            <button type="button" className="botao" onClick={() => setEscolhas(salvo)} disabled={!mudou || salvando}>
              Desfazer
            </button>
          </div>
          <p role="status" className={`hangar-mensagem hangar-mensagem-${mensagem?.tipo ?? 'vazia'}`}>
            {mensagem?.texto ?? (mudou ? 'Há mudanças não salvas.' : '')}
          </p>
        </section>

        <section className="cartao hangar-pecas" aria-label="Peças">
          <div className="hangar-abas" role="tablist" aria-label="Partes do boneco">
            {ABAS.map((a) => (
              <button
                key={a.camada}
                type="button"
                role="tab"
                aria-selected={a.camada === aba}
                className={`hangar-aba${a.camada === aba ? ' hangar-aba-atual' : ''}`}
                onClick={() => setAba(a.camada)}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
          <div className="hangar-grade" role="tabpanel" aria-label={ABAS.find((a) => a.camada === aba)?.rotulo}>
            {aba === 'acessorio' && (
              <OpcaoPeca
                nome="Nenhum"
                escolhida={!escolhas.acessorio}
                aoEscolher={() => escolher(null)}
                previa={{ ...escolhas, acessorio: undefined }}
              />
            )}
            {pecasDaAba.map((p) => (
              <OpcaoPeca
                key={p.id}
                nome={p.nome}
                escolhida={escolhas[aba] === p.id}
                trancada={p.xpMinimo > xp ? p.xpMinimo : null}
                aoEscolher={() => escolher(p)}
                previa={{ ...escolhas, [aba]: p.id }}
              />
            ))}
          </div>
        </section>
      </div>

      {!ninja && (
        <EscolherApelido titulo={papel === 'professor' ? 'Seu apelido (aparece para os alunos)' : 'Seu apelido na nave'} />
      )}
    </div>
  )
}

function OpcaoPeca({
  nome,
  escolhida,
  trancada = null,
  aoEscolher,
  previa,
}: {
  nome: string
  escolhida: boolean
  trancada?: number | null
  aoEscolher: () => void
  previa: Partial<Record<Camada, string | undefined>>
}) {
  const limpa: Escolhas = Object.fromEntries(Object.entries(previa).filter(([, v]) => v)) as Escolhas
  return (
    <button
      type="button"
      className={`hangar-opcao${escolhida ? ' hangar-opcao-escolhida' : ''}${trancada ? ' hangar-opcao-trancada' : ''}`}
      aria-pressed={escolhida}
      disabled={trancada !== null}
      onClick={aoEscolher}
    >
      <Avatar escolhas={limpa} tamanho={72} rotulo="" />
      <span className="hangar-opcao-nome">{nome}</span>
      {trancada !== null && <span className="hangar-opcao-cadeado">🔒 {trancada} XP</span>}
    </button>
  )
}
