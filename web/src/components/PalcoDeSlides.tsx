import { useEffect, useRef, useState } from 'react'
import '../pages/Slides.css'

/**
 * Moldura isolada de um arquivo HTML da aula (slides ou apostila): os scripts do
 * arquivo rodam, mas não alcançam a página do Órbita nem a sessão de quem está
 * vendo. A marca-d'água com o nome do aluno fica por cima.
 */
export function PalcoDeSlides({
  html,
  titulo,
  marca,
  rotuloTelaCheia = 'Tela cheia',
  dica,
  proporcao = 'slide',
}: {
  html: string
  titulo: string
  marca: string | null
  rotuloTelaCheia?: string
  dica?: string
  /** 'slide' (16:9) ou 'texto' (mais alto, para a apostila). */
  proporcao?: 'slide' | 'texto'
}) {
  const [telaCheia, setTelaCheia] = useState(false)
  const palco = useRef<HTMLDivElement>(null)
  const moldura = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement === palco.current)
    document.addEventListener('fullscreenchange', aoMudar)
    return () => document.removeEventListener('fullscreenchange', aoMudar)
  }, [])

  // Na página do Órbita em volta do arquivo: sem Ctrl+S / Ctrl+P (salvar ou
  // imprimir a página levaria o conteúdo junto).
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const tecla = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && (tecla === 's' || tecla === 'p' || tecla === 'u')) e.preventDefault()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [])

  async function alternarTelaCheia() {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await palco.current?.requestFullscreen?.()
    moldura.current?.focus()
  }

  return (
    <div className="palco-de-slides">
      <div className="palco-barra">
        <button type="button" className="botao botao-primario slides-tela-cheia" onClick={alternarTelaCheia}>
          {telaCheia ? 'Sair da tela cheia' : rotuloTelaCheia}
        </button>
      </div>
      <div ref={palco} className="slides-palco" onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}>
        <iframe
          ref={moldura}
          className={`slides-moldura${proporcao === 'texto' ? ' slides-moldura-texto' : ''}`}
          title={titulo}
          srcDoc={html}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          allow="fullscreen"
          referrerPolicy="no-referrer"
          onLoad={() => moldura.current?.focus()}
        />
        {marca ? (
          <div className="slides-marca" aria-hidden="true" data-testid="marca-dagua">
            {Array.from({ length: 80 }, (_, i) => (
              <span key={i}>{marca}</span>
            ))}
          </div>
        ) : null}
      </div>
      {dica ? <p className="slides-dica">{dica}</p> : null}
    </div>
  )
}
