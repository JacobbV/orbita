import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { Aviso } from '../components/Aviso'
import { BonecoDoHangar } from '../components/BonecoDoHangar'
import { Carregando } from '../components/Carregando'
import { ProfessorDaNave } from '../components/ProfessorDaNave'
import { listarOfertas, nomeTurno, type Oferta } from '../lib/api'
import { mensagemDeErro } from '../lib/erros'
import { carregarPonteNinja, type DisciplinaDaPonte } from '../lib/ponte'
import { PreviaDoProfessor } from '../lib/previa'
import { PainelDisciplina } from '../pages/Ponte'
import { useModoNinja } from './ModoNinja'
import '../pages/Ponte.css'
import './Ninja.css'

/** Ponte do Modo Ninja: o professor anda pela nave como aluno de qualquer turma. */
export function PonteNinja() {
  const ninja = useModoNinja()
  const [params, setParams] = useSearchParams()
  const [ofertas, setOfertas] = useState<Oferta[] | null>(null)
  const [carregadas, setCarregadas] = useState<{ turmaId: number; lista: DisciplinaDaPonte[] } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    listarOfertas()
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

  const turmas = useMemo(() => {
    const mapa = new Map<number, Oferta['turma']>()
    for (const o of ofertas ?? []) mapa.set(o.turma.id, o.turma)
    return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [ofertas])

  const pedida = Number(params.get('turma'))
  const turmaId = turmas.some((t) => t.id === pedida) ? pedida : turmas[0]?.id

  useEffect(() => {
    if (!ofertas || turmaId === undefined) return
    let ativo = true
    carregarPonteNinja(ofertas.filter((o) => o.turma.id === turmaId))
      .then((lista) => {
        if (ativo) setCarregadas({ turmaId, lista })
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [ofertas, turmaId])

  // Chegou aqui sem ligar o modo (link direto): volta ao painel.
  if (!ninja.ativo) return <Navigate to="/professor" replace />

  if (erro) {
    return (
      <div className="ponte container">
        <Aviso tipo="erro" titulo="Não foi possível abrir o Modo Ninja">
          {erro}
        </Aviso>
      </div>
    )
  }
  if (!ofertas) return <Carregando />

  const turma = turmas.find((t) => t.id === turmaId)
  const disciplinas = carregadas && carregadas.turmaId === turmaId ? carregadas.lista : null
  return (
    <div className="ponte container">
      <header className="cartao ponte-topo ninja-topo">
        <BonecoDoHangar />
        <div className="ponte-topo-nome">
          <p className="pixel ponte-selo ninja-selo">Modo Ninja</p>
          <h1>Ninja na nave</h1>
          <p className="ponte-quem">
            Você vê a ponte como um aluno de qualquer turma, com todas as aulas abertas e todas as medalhas. Abra os
            slides e teste os exercícios à vontade: nada é entregue, ninguém ganha XP e você não aparece nas listas
            da turma.
          </p>
        </div>
        <Link to="/medalhas" className="botao ponte-pedidos">
          Todas as medalhas
        </Link>
      </header>

      {turmas.length === 0 ? (
        <p className="ponte-aviso-vazio">Nenhuma turma ativa no momento.</p>
      ) : (
        <nav className="ninja-turmas" aria-label="Turma">
          {turmas.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`ninja-turma${t.id === turmaId ? ' ninja-turma-atual' : ''}`}
              aria-pressed={t.id === turmaId}
              onClick={() => setParams({ turma: String(t.id) }, { replace: true })}
            >
              {t.nome}
              <span className="ninja-turma-turno">
                {nomeTurno(t.turno)} · {t.anoLetivo}
              </span>
            </button>
          ))}
        </nav>
      )}

      <ProfessorDaNave />

      {turma &&
        (disciplinas ? (
          <PreviaDoProfessor.Provider value={true}>
            {disciplinas.map((d) => (
              <PainelDisciplina key={d.oferta.id} disciplina={d} />
            ))}
          </PreviaDoProfessor.Provider>
        ) : (
          <Carregando />
        ))}
    </div>
  )
}
