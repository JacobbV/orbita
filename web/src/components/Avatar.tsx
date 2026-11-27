import { useMemo } from 'react'
import { ALTURA, LADO, retangulosSvg, type Escolhas, type Recorte } from '../arte/avatar'

interface Props {
  escolhas: Escolhas
  /** Largura em pixels de tela (múltiplo de 48 deixa o traço mais nítido). */
  tamanho?: number
  /** Texto para leitor de tela; vazio deixa o desenho só decorativo. */
  rotulo?: string
  /** Mostra só um pedaço do boneco (ex.: a cabeça), em pixels da grade. */
  recorte?: Recorte | null
}

/** Boneco em pixel art montado com as peças escolhidas. */
export function Avatar({ escolhas, tamanho = 144, rotulo = 'Avatar', recorte = null }: Props) {
  // O SVG é gerado só a partir do catálogo próprio (cores e números), sem texto do usuário.
  const desenho = useMemo(() => retangulosSvg(escolhas), [escolhas])
  const [x, y, w, h] = recorte ?? [0, 0, LADO, ALTURA]
  return (
    <svg
      {...(rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true })}
      viewBox={`${x} ${y} ${w} ${h}`}
      width={tamanho}
      height={Math.round((tamanho * h) / w)}
      shapeRendering="crispEdges"
      dangerouslySetInnerHTML={{ __html: desenho }}
    />
  )
}
