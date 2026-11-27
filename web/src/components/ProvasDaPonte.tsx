import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { dataHora, duracaoEmTexto, estadoDaProvaDoAluno, minhasProvas, type EstadoDaProvaDoAluno, type ProvaDoAluno } from '../lib/provas'
import './ProvasDaPonte.css'

const ROTULO: Record<EstadoDaProvaDoAluno, string> = {
  antes: 'Ainda não abriu',
  aberta: 'Aberta agora',
  em_andamento: 'Em andamento',
  entregue: 'Entregue',
  perdida: 'Fechada',
}

function acao(estado: EstadoDaProvaDoAluno): string {
  if (estado === 'aberta') return 'Fazer a prova'
  if (estado === 'em_andamento') return 'Continuar'
  return 'Ver'
}

/** Provas das turmas do aluno. Some se não houver nenhuma; erro aqui não atrapalha a ponte. */
export function ProvasDaPonte() {
  const [provas, setProvas] = useState<ProvaDoAluno[]>([])

  useEffect(() => {
    let ativo = true
    minhasProvas().then(
      (p) => {
        if (ativo) setProvas(p)
      },
      () => {},
    )
    return () => {
      ativo = false
    }
  }, [])

  if (provas.length === 0) return null
  return (
    <section className="provas-ponte" aria-labelledby="provas-ponte-titulo">
      <h2 id="provas-ponte-titulo">Provas</h2>
      <ul className="provas-ponte-lista" role="list">
        {provas.map((p) => {
          const estado = estadoDaProvaDoAluno(p)
          return (
            <li key={p.id} className="cartao provas-ponte-item">
              <div className="provas-ponte-texto">
                <p className={`pixel provas-ponte-estado provas-ponte-${estado}`}>{ROTULO[estado]}</p>
                <p className="provas-ponte-titulo">{p.titulo}</p>
                <p className="provas-ponte-meta">
                  {dataHora(p.abreEm)} até {dataHora(p.fechaEm)} · {duracaoEmTexto(p.duracaoMin)}
                  {p.nota !== null && ` · nota ${String(p.nota).replace('.', ',')}`}
                </p>
              </div>
              <Link to={`/prova/${p.id}`} className={`botao${estado === 'aberta' || estado === 'em_andamento' ? ' botao-primario' : ''}`} aria-label={`${acao(estado)}: ${p.titulo}`}>
                {acao(estado)}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
