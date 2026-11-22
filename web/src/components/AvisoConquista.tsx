import { useEffect, useState } from 'react'
import { frasesDaConquista, ouvirConquistas } from '../lib/progresso'
import './AvisoConquista.css'

/** Aviso curto no canto da tela quando o aluno ganha XP, patente ou medalha. */
export function AvisoConquista() {
  const [frases, setFrases] = useState<string[]>([])

  useEffect(
    () =>
      ouvirConquistas((c) => {
        setFrases(frasesDaConquista(c))
      }),
    [],
  )

  useEffect(() => {
    if (frases.length === 0) return
    const t = setTimeout(() => setFrases([]), 5000)
    return () => clearTimeout(t)
  }, [frases])

  return (
    <div className="aviso-conquista" role="status" aria-live="polite">
      {frases.length > 0 && (
        <div className="aviso-conquista-caixa">
          {frases.map((f, i) => (
            <p key={f} className={i === 0 ? 'aviso-conquista-principal' : undefined}>
              {f}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
