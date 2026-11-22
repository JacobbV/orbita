import { useId, type ReactNode } from 'react'

interface CampoProps {
  rotulo: string
  /** Texto de ajuda abaixo do campo. */
  dica?: ReactNode
  erro?: string | undefined
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode
}

/**
 * Rótulo + campo + dica + erro, já ligados para leitores de tela.
 * Uso: <Campo rotulo="Nome">{(p) => <input {...p} />}</Campo>
 */
export function Campo({ rotulo, dica, erro, children }: CampoProps) {
  const id = useId()
  const idDica = `${id}-dica`
  const idErro = `${id}-erro`
  const descricoes = [dica ? idDica : null, erro ? idErro : null].filter(Boolean).join(' ')
  return (
    <div className={`campo${erro ? ' campo-com-erro' : ''}`}>
      <label htmlFor={id}>{rotulo}</label>
      {children({
        id,
        ...(descricoes ? { 'aria-describedby': descricoes } : {}),
        ...(erro ? { 'aria-invalid': true as const } : {}),
      })}
      {dica && (
        <p id={idDica} className="campo-dica">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="campo-erro">
          {erro}
        </p>
      )}
    </div>
  )
}
