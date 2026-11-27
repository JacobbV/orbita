import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { LINGUAGENS } from '../../lab/linguagens'
import { mensagemDeErro } from '../../lib/erros'
import { listarVisaoDosExercicios, resumoDaVisao, type DisciplinaDaVisao } from '../../lib/exercicios'
import { XP_POR_DIFICULDADE } from '../../lib/laboratorio'
import { numeroRomano } from '../../lib/ponte'
import './Exercicios.css'

/** Aba "Exercícios": todos os exercícios por disciplina, unidade e aula, com atalho para criar e editar. */
export function VisaoDosExercicios() {
  const [disciplinas, setDisciplinas] = useState<DisciplinaDaVisao[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [escolhida, setEscolhida] = useState<number | null>(null)

  useEffect(() => {
    let ativo = true
    listarVisaoDosExercicios().then(
      (d) => {
        if (ativo) setDisciplinas(d)
      },
      (e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      },
    )
    return () => {
      ativo = false
    }
  }, [])

  if (erro) return <Aviso tipo="erro">{erro}</Aviso>
  if (!disciplinas) return <Carregando />
  const disciplina = disciplinas.find((d) => d.id === escolhida) ?? disciplinas[0]

  return (
    <section className="painel-secao" aria-labelledby="visao-exercicios-titulo">
      <div className="painel-secao-topo">
        <h2 id="visao-exercicios-titulo">Exercícios</h2>
      </div>
      <p className="painel-intro">
        Todos os exercícios por unidade e aula. Abra uma aula para criar ou editar exercícios, ou veja as entregas.
      </p>
      {!disciplina ? (
        <p className="cartao painel-vazio">Nenhuma disciplina cadastrada.</p>
      ) : (
        <>
          <div className="visao-disciplinas" role="group" aria-label="Disciplina">
            {disciplinas.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`botao botao-compacto${d.id === disciplina.id ? ' botao-primario' : ''}`}
                aria-pressed={d.id === disciplina.id}
                onClick={() => setEscolhida(d.id)}
              >
                {d.sigla}
              </button>
            ))}
          </div>
          <Resumo disciplina={disciplina} />
          {disciplina.unidades.map((u) => (
            <details key={u.id} className="cartao visao-unidade" open={u.aulas.some((a) => a.exercicios.length > 0)}>
              <summary>
                <span className="pixel visao-unidade-numero">Unidade {numeroRomano(u.numero)}</span>
                <span className="visao-unidade-titulo">{u.titulo}</span>
              </summary>
              {u.aulas.length === 0 ? (
                <p className="painel-vazio">Sem aulas.</p>
              ) : (
                <ul className="visao-aulas" role="list">
                  {u.aulas.map((a) => (
                    <li key={a.id} className="visao-aula">
                      <div className="visao-aula-topo">
                        <span className="visao-aula-titulo">
                          <span className="pixel visao-aula-numero">
                            {numeroRomano(u.numero)}.{a.numero}
                          </span>{' '}
                          {a.titulo}
                        </span>
                        <Link
                          to={`/professor/exercicios/${a.id}`}
                          className="botao botao-compacto"
                          aria-label={`${a.exercicios.length === 0 ? 'Criar exercícios' : 'Editar exercícios'} da aula ${a.titulo}`}
                        >
                          {a.exercicios.length === 0 ? 'Criar' : 'Editar'}
                        </Link>
                      </div>
                      {a.exercicios.length === 0 ? (
                        <p className="visao-sem">Nenhum exercício.</p>
                      ) : (
                        <ul className="visao-exercicios" role="list">
                          {a.exercicios.map((e) => (
                            <li key={e.id}>
                              <span className="visao-exercicio-nome">{e.titulo}</span>
                              <span className="visao-exercicio-info">
                                {LINGUAGENS[e.linguagem].nome} · +{XP_POR_DIFICULDADE[e.dificuldade as 1 | 2 | 3] ?? 20} XP ·{' '}
                                {e.entregas === 0 ? 'sem entregas' : `${e.entregas} ${e.entregas === 1 ? 'entrega' : 'entregas'}`}
                                {e.aConfirmar > 0 && ` · ${e.aConfirmar} para reconferir`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </>
      )}
    </section>
  )
}

function Resumo({ disciplina }: { disciplina: DisciplinaDaVisao }) {
  const { exercicios, aConfirmar } = resumoDaVisao(disciplina)
  return (
    <p className="visao-resumo">
      {disciplina.nome}: {exercicios} {exercicios === 1 ? 'exercício' : 'exercícios'}
      {aConfirmar > 0 && ` · ${aConfirmar} ${aConfirmar === 1 ? 'entrega espera' : 'entregas esperam'} reconferência`}
      {' · '}
      <Link to="?aba=entregas">Ver entregas</Link>
    </p>
  )
}
