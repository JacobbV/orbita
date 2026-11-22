import { useMemo } from 'react'
import { ALTURA, LADO, retangulosSvg, type Escolhas } from '../arte/avatar'

interface Props {
  escolhas: Escolhas
  /** Largura em pixels de tela (múltiplo de 48 deixa o traço mais nítido). */
  tamanho?: number
  rotulo?: string
}

/** Boneco em pixel art montado com as peças escolhidas. */
export function Avatar({ escolhas, tamanho = 144, rotulo = 'Avatar' }: Props) {
  // O SVG é gerado só a partir do catálogo próprio (cores e números), sem texto do usuário.
  const desenho = useMemo(() => retangulosSvg(escolhas), [escolhas])
  return (
    <svg
      role="img"
      aria-label={rotulo}
      viewBox={`0 0 ${LADO} ${ALTURA}`}
      width={tamanho}
      height={Math.round((tamanho * ALTURA) / LADO)}
      shapeRendering="crispEdges"
      dangerouslySetInnerHTML={{ __html: desenho }}
    />
  )
}
