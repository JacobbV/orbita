import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { mensagemDeErro } from '../../lib/erros'
import {
  dataHora,
  duracaoEmTexto,
  listarProvas,
  momentoDaProva,
  nomeDasSaidas,
  removerProva,
  type ProvaDoPainel,
} from '../../lib/provas'

const NOME_DO_MOMENTO = { antes: 'Ainda não abriu', aberta: 'Aberta agora', fechada: 'Fechada' } as const

/** Aba Provas do painel: lista, criar, editar, acompanhar e remover. */
export function Provas() {
  const [provas, setProvas] = useState<ProvaDoPainel[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [recado, setRecado] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    listarProvas()
      .then((p) => {
        if (ativo) setProvas(p)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [versao])

  async function remover(p: ProvaDoPainel) {
    setOcupado(true)
    setErro(null)
    try {
      await removerProva(p.id)
      setRemovendo(null)
      setRecado(`Prova "${p.titulo}" removida.`)
      setVersao((v) => v + 1)
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setOcupado(false)
    }
  }

  if (!provas && !erro) return <Carregando />

  return (
    <section className="painel-secao" aria-labelledby="provas-titulo">
      <div className="painel-secao-topo">
        <h2 id="provas-titulo">Provas</h2>
        <Link to="/professor/prova/nova" className="botao botao-primario">
          + Nova prova
        </Link>
      </div>
      <p className="painel-intro">
        A prova abre no horário que você escolher, com cronômetro e aviso de saída da aba. O site detecta a saída, mas não
        impede. A nota só aparece para o aluno depois que você reconferir e publicar.
      </p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {recado && <Aviso tipo="sucesso">{recado}</Aviso>}
      {provas && provas.length === 0 && <p className="cartao painel-vazio">Nenhuma prova criada ainda.</p>}
      {provas && provas.length > 0 && (
        <ul className="provas-lista" role="list">
          {provas.map((p) => {
            const momento = momentoDaProva(p)
            return (
              <li key={p.id} className="cartao provas-item">
                <div className="provas-item-texto">
                  <p className={`pixel provas-momento provas-momento-${momento}`}>{NOME_DO_MOMENTO[momento]}</p>
                  <h3>{p.titulo}</h3>
                  <p className="provas-item-meta">
                    {p.oferta.turma.nome} · {p.oferta.disciplina.sigla} · {dataHora(p.abreEm)} até {dataHora(p.fechaEm)}
                  </p>
                  <p className="provas-item-meta">
                    {duracaoEmTexto(p.duracaoMin)} · {p.questoes} {p.questoes === 1 ? 'questão' : 'questões'} ·{' '}
                    {nomeDasSaidas(p.saidasParaEncerrar)} ·{' '}
                    {p.tentativas === 0 ? 'ninguém começou' : `${p.tentativas} ${p.tentativas === 1 ? 'aluno começou' : 'alunos começaram'}`}
                    {p.notasPublicadasEm && <span className="provas-publicada"> · notas publicadas</span>}
                  </p>
                </div>
                <div className="painel-botoes">
                  <Link to={`/professor/prova/${p.id}/acompanhar`} className="botao" aria-label={`Acompanhar ${p.titulo}`}>
                    Acompanhar
                  </Link>
                  <Link to={`/professor/prova/${p.id}`} className="botao" aria-label={`Editar ${p.titulo}`}>
                    Editar
                  </Link>
                  <button
                    type="button"
                    className="botao"
                    disabled={ocupado}
                    aria-label={`Remover ${p.titulo}`}
                    onClick={() => setRemovendo(removendo === p.id ? null : p.id)}
                  >
                    Remover
                  </button>
                </div>
                {removendo === p.id && (
                  <div className="painel-confirmar painel-confirmar-perigo">
                    {p.tentativas > 0 ? (
                      <p>Alunos já começaram esta prova. Ela não pode ser removida, para não apagar o trabalho deles.</p>
                    ) : (
                      <p>Remover a prova "{p.titulo}"? As questões criadas só para ela também saem.</p>
                    )}
                    <div className="painel-botoes">
                      {p.tentativas === 0 && (
                        <button type="button" className="botao painel-botao-perigo" disabled={ocupado} onClick={() => remover(p)}>
                          Sim, remover
                        </button>
                      )}
                      <button type="button" className="botao" onClick={() => setRemovendo(null)}>
                        {p.tentativas === 0 ? 'Cancelar' : 'Entendi'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
