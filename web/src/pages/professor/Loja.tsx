import { useEffect, useState, type FormEvent } from 'react'
import { PECAS, PADRAO_ALUNO, type Peca } from '../../arte/avatar'
import { Avatar } from '../../components/Avatar'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { Moeda } from '../../components/Moeda'
import { mensagemDeErro } from '../../lib/erros'
import {
  MOEDAS_MANUAL_MAXIMO,
  carregarHistoricoDaLoja,
  carregarMoedasDaTurma,
  darMoedas,
  definirPecaDaLoja,
  devolverCompra,
  lerCatalogo,
  type CompraDaLoja,
  type MoedasDoAluno,
  type PrecoDaPeca,
} from '../../lib/loja'
import { listarOfertasDoPainel, type OfertaDoPainel } from '../../lib/professor'
import { supabase } from '../../lib/supabase'
import './Loja.css'

async function carregarCatalogo(): Promise<Map<string, PrecoDaPeca>> {
  const { data, error } = await supabase().from('pecas').select('id, preco, na_loja, xp_minimo').not('preco', 'is', null)
  if (error) throw error
  return lerCatalogo(data ?? [])
}

const DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' })

/** Aba Loja do painel: moedas da turma, preços das peças e compras dos alunos. */
export function Loja() {
  return (
    <section className="painel-secao" aria-labelledby="loja-painel-titulo">
      <div className="painel-secao-topo">
        <h2 id="loja-painel-titulo">Loja</h2>
      </div>
      <p className="painel-intro">
        As moedinhas são separadas do XP. O aluno ganha 5 de boas-vindas, 10 por nota máxima na prova, 3 por aula e 5 por
        unidade com todos os exercícios certos, e as que você der na sala. Também pode trocar 50 XP por 1 moeda.
      </p>
      <MoedasDaTurma />
      <Precos />
      <Historico />
    </section>
  )
}

function MoedasDaTurma() {
  const [ofertas, setOfertas] = useState<OfertaDoPainel[] | null>(null)
  const [ofertaId, setOfertaId] = useState<number | null>(null)
  const [alunos, setAlunos] = useState<MoedasDoAluno[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [alunoId, setAlunoId] = useState('')
  const [quantidade, setQuantidade] = useState('5')
  const [tirar, setTirar] = useState(false)
  const [motivo, setMotivo] = useState('Participação na aula')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    let ativo = true
    listarOfertasDoPainel().then(
      (lista) => {
        if (!ativo) return
        setOfertas(lista)
        setOfertaId(lista[0]?.id ?? null)
      },
      (e: unknown) => ativo && setErro(mensagemDeErro(e)),
    )
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (ofertaId === null) return
    let ativo = true
    carregarMoedasDaTurma(ofertaId).then(
      (lista) => ativo && setAlunos(lista),
      (e: unknown) => ativo && setErro(mensagemDeErro(e)),
    )
    return () => {
      ativo = false
    }
  }, [ofertaId])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setAviso(null)
    const aluno = alunos?.find((a) => a.alunoId === alunoId)
    const n = Number(quantidade)
    if (!aluno) return setAviso({ tipo: 'erro', texto: 'Escolha o aluno.' })
    if (!Number.isInteger(n) || n < 1 || n > (tirar ? 100 : MOEDAS_MANUAL_MAXIMO)) {
      return setAviso({ tipo: 'erro', texto: tirar ? 'Tire de 1 a 100 moedas.' : `Dê de 1 a ${MOEDAS_MANUAL_MAXIMO} moedas.` })
    }
    if (!motivo.trim()) return setAviso({ tipo: 'erro', texto: 'Escreva o motivo (até 200 caracteres).' })
    setEnviando(true)
    try {
      const saldo = await darMoedas(aluno.alunoId, tirar ? -n : n, motivo)
      setAlunos((lista) => lista?.map((a) => (a.alunoId === aluno.alunoId ? { ...a, moedas: saldo } : a)) ?? lista)
      setAviso({ tipo: 'sucesso', texto: `${tirar ? '-' : '+'}${n} para ${aluno.nome}. Saldo: ${saldo}.` })
    } catch (falha) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(falha) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="cartao loja-painel-bloco">
      <h3>Moedas da turma</h3>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!ofertas ? (
        <Carregando />
      ) : ofertas.length === 0 ? (
        <p className="painel-vazio">Nenhuma turma ainda.</p>
      ) : (
        <>
          <div className="campo">
            <label htmlFor="loja-oferta">Turma</label>
            <select id="loja-oferta" value={ofertaId ?? ''} onChange={(e) => {
                const id = Number(e.target.value)
                if (id === ofertaId) return
                setAlunos(null)
                setAlunoId('')
                setOfertaId(id)
              }}>
              {ofertas.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.turma.nome} · {o.disciplina.sigla}
                </option>
              ))}
            </select>
          </div>
          {!alunos ? (
            <Carregando />
          ) : alunos.length === 0 ? (
            <p className="painel-vazio">Nenhum aluno aprovado nesta turma ainda.</p>
          ) : (
            <>
              <form className="loja-painel-form" onSubmit={(e) => void enviar(e)} noValidate>
                <div className="campo">
                  <label htmlFor="loja-aluno">Aluno</label>
                  <select id="loja-aluno" value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
                    <option value="">Escolha o aluno</option>
                    {alunos.map((a) => (
                      <option key={a.alunoId} value={a.alunoId}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <fieldset className="loja-painel-tipo">
                  <legend>Dar ou tirar</legend>
                  <label>
                    <input type="radio" name="loja-tipo" checked={!tirar} onChange={() => setTirar(false)} /> Dar (1 a{' '}
                    {MOEDAS_MANUAL_MAXIMO})
                  </label>
                  <label>
                    <input type="radio" name="loja-tipo" checked={tirar} onChange={() => setTirar(true)} /> Tirar (corrigir
                    engano)
                  </label>
                </fieldset>
                <div className="campo">
                  <label htmlFor="loja-quantidade">Quantas moedas</label>
                  <input
                    id="loja-quantidade"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={tirar ? 100 : MOEDAS_MANUAL_MAXIMO}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                  />
                </div>
                <div className="campo">
                  <label htmlFor="loja-motivo">Motivo</label>
                  <input id="loja-motivo" value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} />
                  <p className="campo-dica">O aluno vê este motivo em "Últimas moedas".</p>
                </div>
                {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
                <button type="submit" className="botao botao-primario" disabled={enviando}>
                  {enviando ? 'Enviando…' : tirar ? 'Tirar moedas' : 'Dar moedas'}
                </button>
              </form>
              <ul role="list" className="loja-painel-alunos">
                {alunos.map((a) => (
                  <li key={a.alunoId} className="loja-painel-aluno">
                    <span className="loja-painel-nome">{a.nome}</span>
                    <span className="loja-painel-saldo">
                      <Moeda tamanho={16} /> {a.moedas}
                    </span>
                    <span className="loja-painel-detalhe">
                      ganhou {a.ganhas} · gastou {a.gastas} · {a.xp} XP
                    </span>
                    <button type="button" className="botao botao-compacto" onClick={() => setAlunoId(a.alunoId)}>
                      Escolher
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

function Precos() {
  const [catalogo, setCatalogo] = useState<Map<string, PrecoDaPeca> | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    carregarCatalogo().then(
      (c) => ativo && setCatalogo(c),
      (e: unknown) => ativo && setErro(mensagemDeErro(e)),
    )
    return () => {
      ativo = false
    }
  }, [])

  const pecas = catalogo
    ? PECAS.filter((p) => catalogo.has(p.id)).sort(
        (a, b) => (catalogo.get(a.id)?.preco ?? 0) - (catalogo.get(b.id)?.preco ?? 0) || a.nome.localeCompare(b.nome, 'pt-BR'),
      )
    : []

  return (
    <div className="cartao loja-painel-bloco">
      <h3>Peças e preços</h3>
      <p className="painel-intro">
        Tirar uma peça da loja não tira de quem já comprou. As 5 peças do uniforme continuam abrindo pela patente.
      </p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!catalogo ? (
        <Carregando />
      ) : (
        <ul role="list" className="loja-painel-pecas">
          {pecas.map((p) => (
            <LinhaDePreco key={p.id} peca={p} atual={catalogo.get(p.id)!} />
          ))}
        </ul>
      )}
    </div>
  )
}

function LinhaDePreco({ peca, atual }: { peca: Peca; atual: PrecoDaPeca }) {
  const [preco, setPreco] = useState(String(atual.preco ?? ''))
  const [naLoja, setNaLoja] = useState(atual.naLoja)
  const [salvo, setSalvo] = useState({ preco: String(atual.preco ?? ''), naLoja: atual.naLoja })
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const mudou = preco !== salvo.preco || naLoja !== salvo.naLoja

  async function salvar() {
    const n = Number(preco)
    if (!Number.isInteger(n) || n < 1 || n > 9999) return setAviso({ tipo: 'erro', texto: 'O preço vai de 1 a 9999 moedas.' })
    setSalvando(true)
    setAviso(null)
    try {
      await definirPecaDaLoja(peca.id, n, naLoja)
      setSalvo({ preco, naLoja })
      setAviso({ tipo: 'sucesso', texto: 'Salvo.' })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <li className="loja-painel-peca">
      <Avatar escolhas={{ ...PADRAO_ALUNO, [peca.camada]: peca.id }} tamanho={48} rotulo="" />
      <span className="loja-painel-nome">{peca.nome}</span>
      <label className="loja-painel-preco">
        <Moeda tamanho={14} />
        <span className="sr-only">Preço de {peca.nome}</span>
        <input type="number" inputMode="numeric" min={1} max={9999} value={preco} onChange={(e) => setPreco(e.target.value)} />
      </label>
      <label className="loja-painel-venda">
        <input type="checkbox" checked={naLoja} onChange={(e) => setNaLoja(e.target.checked)} /> À venda
      </label>
      <button
        type="button"
        className="botao botao-compacto"
        aria-label={`Salvar ${peca.nome}`}
        disabled={!mudou || salvando}
        onClick={() => void salvar()}
      >
        {salvando ? 'Salvando…' : 'Salvar'}
      </button>
      {aviso && <span className={`loja-painel-aviso loja-painel-aviso-${aviso.tipo}`}>{aviso.texto}</span>}
    </li>
  )
}

function Historico() {
  const [compras, setCompras] = useState<CompraDaLoja[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<number | null>(null)

  useEffect(() => {
    let ativo = true
    carregarHistoricoDaLoja(50).then(
      (c) => ativo && setCompras(c),
      (e: unknown) => ativo && setErro(mensagemDeErro(e)),
    )
    return () => {
      ativo = false
    }
  }, [])

  async function devolver(c: CompraDaLoja) {
    setErro(null)
    try {
      await devolverCompra(c.compraId)
      setCompras((lista) => lista?.map((x) => (x.compraId === c.compraId ? { ...x, devolvidaEm: new Date().toISOString() } : x)) ?? lista)
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setConfirmando(null)
    }
  }

  return (
    <div className="cartao loja-painel-bloco">
      <h3>Últimas compras</h3>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!compras ? (
        <Carregando />
      ) : compras.length === 0 ? (
        <p className="painel-vazio">Nenhuma compra ainda.</p>
      ) : (
        <ul role="list" className="loja-painel-compras">
          {compras.map((c) => (
            <li key={c.compraId} className="loja-painel-compra">
              <span>
                <strong>{c.nome}</strong> comprou {c.peca} por {c.preco}
              </span>
              <span className="loja-painel-detalhe">{DATA.format(new Date(c.compradaEm))}</span>
              {c.devolvidaEm ? (
                <span className="loja-painel-detalhe">Devolvida</span>
              ) : confirmando === c.compraId ? (
                <span className="loja-painel-confirmar">
                  Devolver {c.preco} moedas e tirar a peça?
                  <button type="button" className="botao botao-compacto botao-primario" onClick={() => void devolver(c)}>
                    Sim, devolver
                  </button>
                  <button type="button" className="botao botao-compacto" onClick={() => setConfirmando(null)}>
                    Cancelar
                  </button>
                </span>
              ) : (
                <button type="button" className="botao botao-compacto" onClick={() => setConfirmando(c.compraId)}>
                  Devolver
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
