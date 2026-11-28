import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { EscolherApelido } from '../components/Apelido'
import { Aviso } from '../components/Aviso'
import { BonecoDoHangar } from '../components/BonecoDoHangar'
import { Carregando } from '../components/Carregando'
import { ProfessorDaNave } from '../components/ProfessorDaNave'
import { ProvasDaPonte } from '../components/ProvasDaPonte'
import { listarOfertas, nomeTurno, type Oferta } from '../lib/api'
import { mensagemDeErro } from '../lib/erros'
import { carregarPonteNinja, type DisciplinaDaPonte } from '../lib/ponte'
import { PreviaDoProfessor } from '../lib/previa'
import { maiorPatente } from '../lib/progresso'
import { PainelDisciplina, ResumoDaPonte, UltimasMedalhas } from '../pages/Ponte'
import { useModoNinja } from './ModoNinja'
import { apelidoDoNinja, estudoDoNinja, guardarApelidoDoNinja } from './progressoNinja'
import '../pages/Ponte.css'
import './Ninja.css'

/** Ponte do Modo Ninja: o professor anda pela nave como aluno de qualquer turma. */
export function PonteNinja() {
  const ninja = useModoNinja()
  const { perfil } = useAuth()
  const perfilId = perfil?.id ?? ''
  const [apelido, setApelido] = useState<string | null>(() => (perfilId ? apelidoDoNinja(perfilId) : null))
  // Lido a cada visita: a última aula aberta e os dias seguidos ficam só neste navegador.
  const estudo = useMemo(() => (perfilId ? estudoDoNinja(perfilId) : null), [perfilId])
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
            {apelido && (
              <span className="ponte-apelido" title="Apelido do ninja (troque no Hangar ninja)">
                <span className="sr-only">Apelido: </span>
                {apelido}
              </span>
            )}
            {turma && (
              <span className="ponte-turma">
                {turma.nome} · {nomeTurno(turma.turno)} · {turma.anoLetivo}
              </span>
            )}
          </p>
          <p className="ponte-quem">
            Você vê a ponte como um aluno de qualquer turma, com todas as aulas abertas e todas as medalhas. Abra os
            slides, faça os exercícios e treine as provas à vontade: nada é entregue, ninguém ganha XP e você não
            aparece nas listas da turma.
          </p>
        </div>
        <CartaoPatenteNinja />
        <Link to="/medalhas" className="botao ponte-pedidos">
          Todas as medalhas
        </Link>
      </header>

      {!apelido && perfilId && (
        <EscolherApelido
          titulo="Apelido do ninja"
          ninja={{
            atual: apelido,
            aoUsar: (a) => {
              guardarApelidoDoNinja(perfilId, a)
              setApelido(a)
            },
          }}
        />
      )}

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

      {turma &&
        (disciplinas ? (
          <PreviaDoProfessor.Provider value={true}>
            <ResumoDaPonte disciplinas={disciplinas} estudo={estudo} ninja />
            <ProfessorDaNave />
            <ProvasDaPonte ninjaTurmaId={turma.id} />
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

/** A patente do ninja: a maior da nave, como as medalhas todas acesas. O XP não conta. */
function CartaoPatenteNinja() {
  const [maior, setMaior] = useState('Almirante Galáctico')

  useEffect(() => {
    let ativo = true
    maiorPatente().then(
      (nome) => {
        if (ativo && nome) setMaior(nome)
      },
      () => {},
    )
    return () => {
      ativo = false
    }
  }, [])

  return (
    <div className="ponte-patente ninja-patente">
      <p className="ponte-patente-linha">
        <span className="pixel ponte-patente-nome">{maior}</span>
        <span className="ponte-patente-xp">XP não conta</span>
      </p>
      <div className="ponte-barra ponte-barra-xp" role="progressbar" aria-label="Patente do ninja" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
        <span style={{ width: '100%' }} />
      </div>
      <p className="ponte-patente-falta">No Modo Ninja a patente fica na maior da nave.</p>
      <UltimasMedalhas />
    </div>
  )
}
