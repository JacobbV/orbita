import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Aviso } from '../../components/Aviso'
import { Carregando } from '../../components/Carregando'
import { buscarOferta, nomeTurno } from '../../lib/api'
import { mensagemDeErro } from '../../lib/erros'
import { carregarPonteComoAluno, type DisciplinaDaPonte } from '../../lib/ponte'
import { PreviaDoProfessor } from '../../lib/previa'
import { PainelDisciplina } from '../Ponte'
import '../Ponte.css'

/** O professor vê a ponte de uma turma exatamente como o aluno vê. Só para ver. */
export function VerComoAluno() {
  const { ofertaId } = useParams()
  const [disciplina, setDisciplina] = useState<DisciplinaDaPonte | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    buscarOferta(Number(ofertaId))
      .then((oferta) => {
        if (!oferta) throw new Error('Turma não encontrada.')
        return carregarPonteComoAluno(oferta)
      })
      .then((d) => {
        if (!ativo) return
        if (d) setDisciplina(d)
        else setErro('Turma não encontrada.')
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [ofertaId])

  const voltar = (
    <Link to="/professor?aba=turmas" className="botao">
      Voltar ao painel
    </Link>
  )

  if (erro) {
    return (
      <div className="ponte container">
        <Aviso tipo="erro" titulo="Não foi possível abrir a visão do aluno">
          {erro}
        </Aviso>
        {voltar}
      </div>
    )
  }
  if (!disciplina) return <Carregando />

  const { turma } = disciplina.oferta
  return (
    <div className="ponte container">
      <header className="cartao ponte-topo ponte-previa">
        <div className="ponte-topo-nome">
          <p className="pixel ponte-selo">Vendo como aluno</p>
          <h1>
            {turma.nome} · {disciplina.oferta.disciplina.sigla}
          </h1>
          <p className="ponte-quem">
            É assim que um aluno de {turma.nome} ({nomeTurno(turma.turno)}, {turma.anoLetivo}) vê a ponte. Só para ver: nada
            muda e ninguém ganha XP.
          </p>
        </div>
        {voltar}
      </header>
      <PreviaDoProfessor.Provider value={true}>
        <PainelDisciplina disciplina={disciplina} />
      </PreviaDoProfessor.Provider>
    </div>
  )
}
