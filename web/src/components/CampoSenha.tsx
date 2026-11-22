import { useState } from 'react'
import { Campo } from './Campo'

interface Props {
  rotulo: string
  valor: string
  onChange: (valor: string) => void
  erro?: string | undefined
  dica?: string
  autoComplete: 'current-password' | 'new-password'
}

/** Campo de senha com botão para mostrar ou esconder o que foi digitado. */
export function CampoSenha({ rotulo, valor, onChange, erro, dica, autoComplete }: Props) {
  const [visivel, setVisivel] = useState(false)
  return (
    <Campo rotulo={rotulo} erro={erro} dica={dica}>
      {(p) => (
        <div className="senha-linha">
          <input
            {...p}
            type={visivel ? 'text' : 'password'}
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            autoComplete={autoComplete}
            minLength={autoComplete === 'new-password' ? 8 : undefined}
            required
          />
          <button
            type="button"
            className="botao senha-mostrar"
            aria-pressed={visivel}
            onClick={() => setVisivel((v) => !v)}
          >
            {visivel ? 'Esconder' : 'Mostrar'}
            <span className="sr-only"> senha</span>
          </button>
        </div>
      )}
    </Campo>
  )
}
