import { CRITERIOS_DE_ORDEM, type CriterioDeOrdem } from '../lib/ordem'
import './OrdenarPor.css'

/** Escolha da ordem de uma lista de alunos (nome ou XP). */
export function OrdenarPor({ valor, aoMudar }: { valor: CriterioDeOrdem; aoMudar: (c: CriterioDeOrdem) => void }) {
  return (
    <div className="ordenar-por" role="group" aria-label="Ordenar por">
      <span className="ordenar-por-rotulo" aria-hidden="true">
        Ordenar por
      </span>
      {CRITERIOS_DE_ORDEM.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`botao botao-compacto${c.id === valor ? ' botao-primario' : ''}`}
          aria-pressed={c.id === valor}
          onClick={() => aoMudar(c.id)}
        >
          {c.rotulo}
        </button>
      ))}
    </div>
  )
}
