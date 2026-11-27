import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { alertaDeProva, dataHora, listarProvas, type AlertaDeProva as Alerta } from '../../lib/provas'

const TEXTO = {
  aberta: 'Prova aberta agora',
  publicar: 'Notas por publicar',
  proxima: 'Próxima prova',
} as const

/** Aviso na entrada do painel: prova aberta, notas por publicar ou a próxima prova. Se falhar, some. */
export function AlertaDeProva() {
  const [alerta, setAlerta] = useState<Alerta | null>(null)

  useEffect(() => {
    let ativo = true
    listarProvas().then(
      (p) => {
        if (ativo) setAlerta(alertaDeProva(p))
      },
      () => {},
    )
    return () => {
      ativo = false
    }
  }, [])

  if (!alerta) return null
  const { tipo, prova } = alerta
  return (
    <aside className={`cartao painel-alerta painel-alerta-${tipo}`} aria-label="Alerta de prova">
      <div>
        <p className="pixel painel-alerta-selo">{TEXTO[tipo]}</p>
        <p className="painel-alerta-titulo">{prova.titulo}</p>
        <p className="painel-alerta-info">
          {prova.oferta.turma.nome} · {prova.oferta.disciplina.sigla} ·{' '}
          {tipo === 'aberta' && `fecha em ${dataHora(prova.fechaEm)}`}
          {tipo === 'aberta' && ` · ${prova.tentativas} ${prova.tentativas === 1 ? 'aluno começou' : 'alunos começaram'}`}
          {tipo === 'publicar' && `fechou em ${dataHora(prova.fechaEm)} · ${prova.tentativas} ${prova.tentativas === 1 ? 'aluno fez' : 'alunos fizeram'}`}
          {tipo === 'proxima' && `abre em ${dataHora(prova.abreEm)}`}
        </p>
      </div>
      {tipo === 'proxima' ? (
        <Link to={`/professor/prova/${prova.id}`} className="botao">
          Ver a prova
        </Link>
      ) : (
        <Link to={`/professor/prova/${prova.id}/acompanhar`} className="botao botao-primario">
          {tipo === 'aberta' ? 'Acompanhar' : 'Conferir e publicar'}
        </Link>
      )}
    </aside>
  )
}
