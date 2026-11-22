import { useEffect, useRef } from 'react'
import { generateStars, starCount, type Star } from '../lib/starfield'
import './Starfield.css'

/** Atualiza o brilho no máximo 20 vezes por segundo: suave e leve. */
const INTERVALO_MS = 50

/**
 * Céu de estrelas fixo atrás de todo o conteúdo.
 * Cobre sempre a tela inteira, se ajusta ao redimensionar ou girar o aparelho
 * e fica parado quando o sistema pede menos movimento.
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)')
    let stars: Star[] = []
    let width = 0
    let height = 0
    let frame = 0
    let ultimo = 0

    const desenhar = (tempo: number) => {
      ctx.clearRect(0, 0, width, height)
      const animar = !reduzirMovimento.matches
      for (const s of stars) {
        const brilho = animar ? 0.75 + 0.25 * Math.sin(s.phase + (tempo / 1000) * s.speed) : 1
        ctx.globalAlpha = s.alpha * brilho
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(s.x * width, s.y * height, s.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const ajustar = () => {
      // Medimos a área visível de verdade (inclui a barra do navegador no celular).
      width = Math.max(document.documentElement.clientWidth, window.innerWidth)
      height = Math.max(document.documentElement.clientHeight, window.innerHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const quantas = starCount(width, height)
      if (quantas !== stars.length) stars = generateStars(quantas)
      desenhar(performance.now())
    }

    const loop = (tempo: number) => {
      frame = requestAnimationFrame(loop)
      if (tempo - ultimo < INTERVALO_MS) return
      ultimo = tempo
      desenhar(tempo)
    }

    const iniciar = () => {
      cancelAnimationFrame(frame)
      if (!reduzirMovimento.matches && document.visibilityState === 'visible') {
        frame = requestAnimationFrame(loop)
      } else {
        desenhar(performance.now())
      }
    }

    ajustar()
    iniciar()

    window.addEventListener('resize', ajustar)
    window.addEventListener('orientationchange', ajustar)
    document.addEventListener('visibilitychange', iniciar)
    reduzirMovimento.addEventListener('change', iniciar)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', ajustar)
      window.removeEventListener('orientationchange', ajustar)
      document.removeEventListener('visibilitychange', iniciar)
      reduzirMovimento.removeEventListener('change', iniciar)
    }
  }, [])

  return (
    <div className="ceu" aria-hidden="true">
      <canvas ref={canvasRef} className="ceu-estrelas" />
    </div>
  )
}
