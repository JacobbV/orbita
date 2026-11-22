import { useMemo } from 'react'
import { ALTURA_MEDALHA, LARGURA_MEDALHA, retangulosDaMedalha } from '../arte/medalhas'

interface Props {
  codigo: string
  /** Medalha que ainda falta: aparece em cinza. */
  apagada?: boolean
  /** Largura em pixels de tela (múltiplo de 18 deixa o traço mais nítido). */
  tamanho?: number
  /** Texto para leitor de tela; vazio deixa o desenho só decorativo. */
  rotulo?: string
}

/** Medalha em pixel art. */
export function Medalha({ codigo, apagada = false, tamanho = 54, rotulo = '' }: Props) {
  // O SVG sai só do catálogo próprio (cores e números); o código só escolhe o estilo.
  const desenho = useMemo(() => retangulosDaMedalha(codigo, apagada), [codigo, apagada])
  return (
    <svg
      {...(rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true })}
      viewBox={`0 0 ${LARGURA_MEDALHA} ${ALTURA_MEDALHA}`}
      width={tamanho}
      height={Math.round((tamanho * ALTURA_MEDALHA) / LARGURA_MEDALHA)}
      shapeRendering="crispEdges"
      dangerouslySetInnerHTML={{ __html: desenho }}
    />
  )
}
