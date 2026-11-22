import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/Aviso'
import { Carregando } from '../components/Carregando'
import { mensagemDeErro } from '../lib/erros'
import { carregarSlides, SlidesIndisponiveis, type SlidesDaAula } from '../lib/slides'
import './Slides.css'

/**
 * Slides HTML de uma aula, dentro de uma moldura isolada: os scripts do slide
 * rodam, mas não alcançam a página do Órbita nem a sessão de quem está vendo.
 */
export function Slides() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const [slides, setSlides] = useState<SlidesDaAula | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [telaCheia, setTelaCheia] = useState(false)
  const palco = useRef<HTMLDivElement>(null)
  const moldura = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    let ativo = true
    carregarSlides(Number(id))
      .then((s) => {
        if (ativo) setSlides(s)
      })
      .catch((e: unknown) => {
        if (ativo) setErro(e instanceof SlidesIndisponiveis ? e.message : mensagemDeErro(e))
      })
    return () => {
      ativo = false
    }
  }, [id])

  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement === palco.current)
    document.addEventListener('fullscreenchange', aoMudar)
    return () => document.removeEventListener('fullscreenchange', aoMudar)
  }, [])

  const voltar = perfil?.papel === 'professor' ? '/professor?aba=aulas' : '/ponte'

  async function alternarTelaCheia() {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await palco.current?.requestFullscreen?.()
    moldura.current?.focus()
  }

  if (erro) {
    return (
      <div className="slides container">
        <Aviso tipo="erro" titulo="Não foi possível abrir os slides">
          {erro}
        </Aviso>
        <Link to={voltar} className="botao slides-voltar">
          Voltar
        </Link>
      </div>
    )
  }
  if (!slides) return <Carregando />

  return (
    <div className="slides container">
      <div className="slides-barra">
        <Link to={voltar} className="botao slides-voltar">
          <span aria-hidden="true">←</span> Voltar
        </Link>
        <div className="slides-nome">
          <p className="pixel slides-onde">{slides.onde}</p>
          <h1>{slides.titulo}</h1>
        </div>
        <button type="button" className="botao botao-primario slides-tela-cheia" onClick={alternarTelaCheia}>
          {telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
        </button>
      </div>
      <div ref={palco} className="slides-palco">
        <iframe
          ref={moldura}
          className="slides-moldura"
          title={`Slides: ${slides.titulo}`}
          srcDoc={slides.html}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          allow="fullscreen"
          referrerPolicy="no-referrer"
          onLoad={() => moldura.current?.focus()}
        />
      </div>
      <p className="slides-dica">Clique no slide e use as setas do teclado, ou deslize o dedo, para avançar e voltar. No celular, toque em Tela cheia e deite o aparelho.</p>
    </div>
  )
}
