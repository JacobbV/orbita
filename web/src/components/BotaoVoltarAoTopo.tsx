import { useEffect, useState } from 'react'
import './BotaoVoltarAoTopo.css'

/** Botão fixo no canto inferior direito que leva ao topo da página. Só aparece depois de rolar um pouco. */
export function BotaoVoltarAoTopo() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const aoRolar = () => setVisivel(window.scrollY > 400)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  if (!visivel) return null
  return (
    <button type="button" className="botao botao-primario voltar-ao-topo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <span aria-hidden="true">↑ </span>Voltar ao topo
    </button>
  )
}
