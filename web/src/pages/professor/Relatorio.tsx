import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { LINGUAGENS } from '../../lab/linguagens'
import { buscarOferta, nomeTurno, type Oferta } from '../../lib/api'
import { mensagemDeErro } from '../../lib/erros'
import { NOME_DA_SITUACAO } from '../../lib/laboratorio'
import {
  carregarRelatorio,
  codigoDaEntrega,
  relatorioEmCsv,
  type CelulaDoRelatorio,
  type EntregaDoRelatorio,
  type ExercicioDoRelatorio,
  type Relatorio as DadosDoRelatorio,
} from '../../lib/relatorio'
import './Professor.css'
import './Relatorio.css'

const NOME_DA_CELULA: Record<CelulaDoRelatorio['situacao'], string> = {
  sem_entrega: 'sem entrega',
  acertou: 'acertou tudo',
  parcial: 'acertou parte',
  a_confirmar: 'a confirmar',
  nao_confere: 'não conferiu',
}

const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const nota = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

type Aberta = { nome: string; exercicio: ExercicioDoRelatorio; celula: CelulaDoRelatorio }

/** Relatório de uma turma: nota, tentativas e código de cada entrega. Só o professor vê. */
export function Relatorio() {
  const { ofertaId } = useParams()
  const id = Number(ofertaId)
  const [oferta, setOferta] = useState<Oferta | null>(null)
  const [dados, setDados] = useState<DadosDoRelatorio | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aberta, setAberta] = useState<Aberta | null>(null)
  const detalhe = useRef<HTMLElement>(null)

  useEffect(() => {
    let ativo = true
    Promise.all([buscarOferta(id), carregarRelatorio(id)])
      .then(([o, r]) => {
        if (!ativo) return
        if (!o) {
          setErro('Turma não encontrada.')
          return
        }
        setOferta(o)
        setDados(r)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [id])

  useEffect(() => {
    if (aberta) detalhe.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  }, [aberta])

  const voltar = (
    <Link to="/professor?aba=turmas" className="botao">
      Voltar ao painel
    </Link>
  )

  if (erro) {
    return (
      <div className="painel container">
        <Aviso tipo="erro" titulo="Não foi possível abrir o relatório">
          {erro}
        </Aviso>
        {voltar}
      </div>
    )
  }
  if (!oferta || !dados) return <Carregando />

  const { turma, disciplina } = oferta

  function baixar() {
    if (!dados) return
    const arquivo = new Blob([relatorioEmCsv(dados)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(arquivo)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${disciplina.sigla}-${turma.nome}.csv`.replace(/[^\w.-]+/g, '-')
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="painel container relatorio">
      <header className="cartao painel-topo">
        <div className="painel-topo-texto">
          <p className="pixel painel-selo">Notas da turma</p>
          <h1>
            {turma.nome} · {disciplina.sigla}
          </h1>
          <p className="painel-intro">
            {disciplina.nome}, {nomeTurno(turma.turno)}, {turma.anoLetivo}. Exercícios das aulas liberadas, com a maior
            nota de cada aluno (de 0 a 10). Entregas que não conferiram valem zero.
          </p>
        </div>
        {voltar}
      </header>

      {dados.exercicios.length === 0 || dados.linhas.length === 0 ? (
        <p className="cartao painel-vazio relatorio-vazio">
          {dados.linhas.length === 0
            ? 'Nenhum aluno aprovado nesta turma ainda.'
            : 'Nenhum exercício nas aulas liberadas para esta turma ainda.'}
        </p>
      ) : (
        <>
          <section className="cartao relatorio-tabela-cartao" aria-labelledby="relatorio-titulo-tabela">
            <div className="relatorio-tabela-topo">
              <h2 id="relatorio-titulo-tabela">
                {dados.linhas.length} {dados.linhas.length === 1 ? 'aluno' : 'alunos'} · {dados.exercicios.length}{' '}
                {dados.exercicios.length === 1 ? 'exercício' : 'exercícios'}
              </h2>
              <button type="button" className="botao botao-compacto" onClick={baixar}>
                Baixar planilha (CSV)
              </button>
            </div>
            <p className="campo-dica">Clique numa nota para ver as tentativas e o código do aluno.</p>
            <div className="relatorio-rolagem" tabIndex={0} role="region" aria-label="Tabela de notas">
              <table className="relatorio-tabela">
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    {dados.exercicios.map((e) => (
                      <th key={e.id} scope="col" title={e.titulo}>
                        <span className="relatorio-aula">
                          U{e.unidade} A{e.aula}
                        </span>
                        <span className="relatorio-exercicio">{e.titulo}</span>
                      </th>
                    ))}
                    <th scope="col">Feitos</th>
                    <th scope="col">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.linhas.map((l) => (
                    <tr key={l.alunoId}>
                      <th scope="row">{l.nome}</th>
                      {l.celulas.map((c, i) => {
                        const exercicio = dados.exercicios[i] as ExercicioDoRelatorio
                        return (
                          <td key={exercicio.id}>
                            {c.situacao === 'sem_entrega' ? (
                              <span className="relatorio-vazia" aria-label={`${l.nome}, ${exercicio.titulo}: sem entrega`}>
                                –
                              </span>
                            ) : (
                              <button
                                type="button"
                                className={`relatorio-nota relatorio-${c.situacao}`}
                                aria-label={`${l.nome}, ${exercicio.titulo}: nota ${nota(c.nota ?? 0)}, ${NOME_DA_CELULA[c.situacao]}, ${c.entregas.length} ${c.entregas.length === 1 ? 'tentativa' : 'tentativas'}`}
                                onClick={() => setAberta({ nome: l.nome, exercicio, celula: c })}
                              >
                                {nota(c.nota ?? 0)}
                                <span className="relatorio-tentativas" aria-hidden="true">
                                  {c.entregas.length}×
                                </span>
                              </button>
                            )}
                          </td>
                        )
                      })}
                      <td>
                        {l.feitos}/{dados.exercicios.length}
                      </td>
                      <td className="relatorio-media">{nota(l.media)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="relatorio-legenda" role="list" aria-label="Legenda">
              {(['acertou', 'parcial', 'a_confirmar', 'nao_confere'] as const).map((s) => (
                <li key={s}>
                  <span className={`relatorio-bolinha relatorio-${s}`} aria-hidden="true" /> {NOME_DA_CELULA[s]}
                </li>
              ))}
              <li>N× = tentativas</li>
            </ul>
          </section>

          {aberta && (
            <section
              ref={detalhe}
              className="cartao relatorio-detalhe"
              aria-labelledby="relatorio-titulo-detalhe"
              key={`${aberta.nome}-${aberta.exercicio.id}`}
            >
              <div className="relatorio-tabela-topo">
                <h2 id="relatorio-titulo-detalhe">
                  {aberta.nome} · {aberta.exercicio.titulo}
                </h2>
                <button type="button" className="botao botao-compacto" onClick={() => setAberta(null)}>
                  Fechar
                </button>
              </div>
              <p className="campo-dica">
                {LINGUAGENS[aberta.exercicio.linguagem].nome} · Unidade {aberta.exercicio.unidade}, aula{' '}
                {aberta.exercicio.aula}
              </p>
              <ol className="relatorio-entregas" role="list">
                {aberta.celula.entregas.map((e) => (
                  <EntregaComCodigo key={e.id} entrega={e} />
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function EntregaComCodigo({ entrega }: { entrega: EntregaDoRelatorio }) {
  const [codigo, setCodigo] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function verCodigo() {
    setCarregando(true)
    setErro(null)
    try {
      setCodigo(await codigoDaEntrega(entrega.id))
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <li className={`relatorio-entrega relatorio-entrega-${entrega.situacao}`}>
      <p className="relatorio-entrega-linha">
        <strong>Entrega {entrega.tentativa}</strong>
        <span>
          {entrega.testesCertos} de {entrega.testesTotal} testes · nota {nota(entrega.nota)}
        </span>
        <span className="relatorio-entrega-situacao">{NOME_DA_SITUACAO[entrega.situacao]}</span>
        <span className="relatorio-entrega-data">{formatoData.format(new Date(entrega.criadoEm))}</span>
      </p>
      {codigo === null ? (
        <button type="button" className="botao botao-compacto" onClick={verCodigo} disabled={carregando}>
          {carregando ? 'Carregando…' : `Ver código da entrega ${entrega.tentativa}`}
        </button>
      ) : (
        <pre className="relatorio-codigo" aria-label={`Código da entrega ${entrega.tentativa}`}>
          {codigo}
        </pre>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </li>
  )
}
