import { useId } from 'react'
import { COMO_CONFERE_PARA_O_ALUNO, type ModoDeConferencia } from '../lab/correcao'
import './CaixaDoEnunciado.css'

/**
 * O enunciado do exercício numa caixa própria, separada do título, para o aluno
 * achar a pergunta logo. Embaixo, como o site confere a saída.
 */
export function CaixaDoEnunciado({ texto, modo }: { texto: string; modo?: ModoDeConferencia | null }) {
  const id = useId()
  return (
    <section className="caixa-enunciado" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="caixa-enunciado-titulo">
        <span aria-hidden="true" className="caixa-enunciado-icone">
          ?
        </span>
        Enunciado
      </h2>
      <div className="caixa-enunciado-texto">{texto}</div>
      {modo && (
        <p className="caixa-enunciado-conferencia">
          <strong>Como o site confere:</strong> {COMO_CONFERE_PARA_O_ALUNO[modo]}
        </p>
      )}
    </section>
  )
}
