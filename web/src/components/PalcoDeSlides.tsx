import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import '../pages/Slides.css'
import { CamadaDeRabiscos } from './CamadaDeRabiscos'
import { FerramentasDosSlides } from './FerramentasDosSlides'
import { useAnotacoes } from './useAnotacoes'

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
  materialId = null,
}: {
  html: string
  titulo: string
  marca: string | null
  rotuloTelaCheia?: string
  dica?: string
  /** 'slide' (16:9) ou 'texto' (mais alto, para a apostila). */
  proporcao?: 'slide' | 'texto'
  /** Slides de uma aula: liga o marcador de página e os rabiscos (guardados por pessoa). */
  materialId?: number | null
}) {
  const { perfil } = useAuth()
  const [telaCheia, setTelaCheia] = useState(false)
  const [ferramentasAbertas, setFerramentasAbertas] = useState(false)
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false)
  const palco = useRef<HTMLDivElement>(null)
  const moldura = useRef<HTMLIFrameElement>(null)
  const anotacoes = useAnotacoes(materialId, perfil?.id ?? null, moldura)
  const tracosDoSlide = anotacoes.slideAtual === null ? [] : (anotacoes.rabiscos[String(anotacoes.slideAtual)] ?? [])
  const ferramentas = anotacoes.ativo ? (
    <FerramentasDosSlides a={anotacoes} tracos={tracosDoSlide} confirmandoLimpar={confirmandoLimpar} aoPedirLimpar={setConfirmandoLimpar} />
  ) : null

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
        {!telaCheia && ferramentas}
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
        {anotacoes.ativo && (
          <>
            <CamadaDeRabiscos
              tracos={tracosDoSlide}
              ferramenta={anotacoes.ferramenta}
              cor={anotacoes.cor}
              espessura={anotacoes.espessura}
              aoMudar={(tracos) => (anotacoes.slideAtual === null ? false : anotacoes.mudarTracos(anotacoes.slideAtual, tracos))}
              aoMover={anotacoes.mover}
            />
            {anotacoes.slideAtual !== null && anotacoes.marcador === anotacoes.slideAtual && (
              <div className="anotacoes-fita" aria-hidden="true" data-testid="fita-do-marcador" />
            )}
            {anotacoes.retomar !== null && (
              <div className="anotacoes-retomar" role="status">
                <p>Você parou no slide {anotacoes.retomar}.</p>
                <button
                  type="button"
                  className="botao botao-compacto botao-primario"
                  onClick={() => {
                    anotacoes.irPara(anotacoes.retomar!)
                    anotacoes.dispensarRetomar()
                  }}
                >
                  Continuar do slide {anotacoes.retomar}
                </button>
                <button type="button" className="botao botao-compacto" onClick={anotacoes.dispensarRetomar}>
                  Ficar aqui
                </button>
              </div>
            )}
            {telaCheia && (
              <div className="anotacoes-flutuante">
                {ferramentasAbertas ? (
                  <>
                    {ferramentas}
                    <button type="button" className="botao botao-compacto" onClick={() => setFerramentasAbertas(false)}>
                      Esconder ferramentas
                    </button>
                  </>
                ) : (
                  <button type="button" className="botao botao-compacto" onClick={() => setFerramentasAbertas(true)}>
                    Marcador e rabiscos
                  </button>
                )}
              </div>
            )}
            {anotacoes.aviso && (
              <p className="anotacoes-aviso" role="alert">
                {anotacoes.aviso}
              </p>
            )}
          </>
        )}
      </div>
      {dica ? <p className="slides-dica">{dica}</p> : null}
    </div>
  )
}
