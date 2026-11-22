import type { ReactNode } from 'react'

type Tipo = 'info' | 'erro' | 'sucesso' | 'atencao'

/** Caixa de aviso. Erros são anunciados na hora por leitores de tela. */
export function Aviso({ tipo = 'info', titulo, children }: { tipo?: Tipo; titulo?: string; children: ReactNode }) {
  return (
    <div className={`aviso aviso-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      {titulo && <p className="aviso-titulo">{titulo}</p>}
      <div className="aviso-texto">{children}</div>
    </div>
  )
}
