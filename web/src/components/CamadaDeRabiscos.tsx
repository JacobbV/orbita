import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import {
  acrescentarPonto,
  apagarPerto,
  daTelaParaOPalco,
  doPalcoParaATela,
  enquadrar,
  FATOR_DO_MARCA_TEXTO,
  OPACIDADE_DO_MARCA_TEXTO,
  type Area,
  type Traco,
} from '../lib/rabiscos'
import type { Ferramenta } from './useAnotacoes'

/** Raio da borracha, em unidades do palco (1920 x 1080). */
const RAIO_DA_BORRACHA = 28

function desenhar(ctx: CanvasRenderingContext2D, tracos: Traco[], area: Area, dpr: number) {
  ctx.clearRect(0, 0, area.largura * dpr, area.altura * dpr)
  const { escala } = enquadrar(area)
  for (const t of tracos) {
    const largura = (t.t === 'm' ? t.w * FATOR_DO_MARCA_TEXTO : t.w) * escala * dpr
    ctx.save()
    ctx.globalAlpha = t.t === 'm' ? OPACIDADE_DO_MARCA_TEXTO : 1
    ctx.strokeStyle = t.c
    ctx.fillStyle = t.c
    ctx.lineWidth = largura
    ctx.lineCap = t.t === 'm' ? 'butt' : 'round'
    ctx.lineJoin = 'round'
    const pontos: [number, number][] = []
    for (let i = 0; i + 1 < t.p.length; i += 2) {
      const [x, y] = doPalcoParaATela(t.p[i]!, t.p[i + 1]!, area)
      pontos.push([x * dpr, y * dpr])
    }
    if (pontos.length === 1) {
      ctx.beginPath()
      ctx.arc(pontos[0]![0], pontos[0]![1], largura / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      pontos.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
      ctx.stroke()
    }
    ctx.restore()
  }
}

/**
 * Tela transparente por cima do slide para rabiscar. Com a ferramenta "nada",
 * deixa os cliques passarem para o slide e só mostra o que já foi rabiscado.
 */
export function CamadaDeRabiscos({
  tracos,
  ferramenta,
  cor,
  espessura,
  aoMudar,
  aoMover,
}: {
  tracos: Traco[]
  ferramenta: Ferramenta
  cor: string
  espessura: number
  /** Troca os traços do slide. Devolve false quando passou do limite. */
  aoMudar: (tracos: Traco[]) => boolean
  aoMover: (d: 1 | -1) => void
}) {
  const tela = useRef<HTMLCanvasElement>(null)
  const area = useRef<Area>({ largura: 0, altura: 0 })
  const dpr = useRef(1)
  const atual = useRef<Traco | null>(null)
  const apagando = useRef<Traco[] | null>(null)
  const tracosRef = useRef(tracos)
  tracosRef.current = tracos

  function redesenhar() {
    const canvas = tela.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    desenhar(ctx, atual.current ? [...(apagando.current ?? tracosRef.current), atual.current] : (apagando.current ?? tracosRef.current), area.current, dpr.current)
  }

  // Acompanha o tamanho do slide (tela cheia, giro do aparelho).
  useEffect(() => {
    const canvas = tela.current
    if (!canvas) return
    const medir = () => {
      const caixa = canvas.getBoundingClientRect()
      dpr.current = window.devicePixelRatio || 1
      area.current = { largura: caixa.width, altura: caixa.height }
      canvas.width = Math.max(1, Math.round(caixa.width * dpr.current))
      canvas.height = Math.max(1, Math.round(caixa.height * dpr.current))
      redesenhar()
    }
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const olho = new ResizeObserver(medir)
    olho.observe(canvas)
    return () => olho.disconnect()
    // redesenhar só lê refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(redesenhar)

  function ponto(e: PointerEvent<HTMLCanvasElement>): [number, number] {
    const caixa = e.currentTarget.getBoundingClientRect()
    return daTelaParaOPalco(e.clientX - caixa.left, e.clientY - caixa.top, area.current)
  }

  function aoPressionar(e: PointerEvent<HTMLCanvasElement>) {
    if (ferramenta === 'nada' || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = ponto(e)
    if (ferramenta === 'borracha') {
      apagando.current = apagarPerto(tracosRef.current, x, y, RAIO_DA_BORRACHA)
    } else {
      atual.current = { c: cor, w: espessura, t: ferramenta === 'marca-texto' ? 'm' : 'l', p: [x, y] }
    }
    redesenhar()
  }

  function aoArrastar(e: PointerEvent<HTMLCanvasElement>) {
    if (!atual.current && !apagando.current) return
    const [x, y] = ponto(e)
    if (apagando.current) apagando.current = apagarPerto(apagando.current, x, y, RAIO_DA_BORRACHA)
    else if (atual.current) atual.current = acrescentarPonto(atual.current, x, y)
    redesenhar()
  }

  function aoSoltar() {
    const feito = atual.current
    const apagado = apagando.current
    atual.current = null
    apagando.current = null
    if (feito) {
      if (!aoMudar([...tracosRef.current, feito])) redesenhar()
    } else if (apagado && apagado !== tracosRef.current) {
      aoMudar(apagado)
    } else redesenhar()
  }

  function aoTeclar(e: KeyboardEvent<HTMLCanvasElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault()
      aoMover(1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault()
      aoMover(-1)
    }
  }

  const desenhando = ferramenta !== 'nada'
  return (
    <canvas
      ref={tela}
      className={`rabiscos-camada${desenhando ? ` rabiscos-camada-ativa rabiscos-${ferramenta}` : ''}`}
      data-testid="camada-de-rabiscos"
      aria-hidden={!desenhando}
      {...(desenhando ? { tabIndex: 0, role: 'application', 'aria-label': 'Área de rabiscos sobre o slide. Setas mudam de slide.' } : {})}
      onPointerDown={aoPressionar}
      onPointerMove={aoArrastar}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      onKeyDown={aoTeclar}
    />
  )
}
