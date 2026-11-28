// Moedinha da nave em pixel art (arte original do Órbita, todos os direitos
// reservados). Grade 10 x 10: borda escura, miolo dourado, brilho no canto e
// uma estrela no meio.

const GRADE = [
  '...BBBB...',
  '.BBOOOOBB.',
  '.BOLLOOOB.',
  'BOLOOSOOOB',
  'BOOOSSSOOB',
  'BOOSSSSSOB',
  'BOOOSOSOOB',
  '.BOOOOOOB.',
  '.BBOOOOBB.',
  '...BBBB...',
]

const CORES: Record<string, string> = {
  B: '#92400e',
  O: '#fbbf24',
  L: '#fef3c7',
  S: '#fde68a',
}

const RETANGULOS = GRADE.flatMap((linha, y) =>
  [...linha].flatMap((c, x) => (CORES[c] ? [{ x, y, cor: CORES[c] }] : [])),
)

interface Props {
  /** Largura em pixels de tela (múltiplo de 10 deixa o traço mais nítido). */
  tamanho?: number
  /** Texto para leitor de tela; vazio deixa o desenho só decorativo. */
  rotulo?: string
}

export function Moeda({ tamanho = 20, rotulo = '' }: Props) {
  return (
    <svg
      {...(rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true })}
      className="moeda"
      viewBox="0 0 10 10"
      width={tamanho}
      height={tamanho}
      shapeRendering="crispEdges"
    >
      {RETANGULOS.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={1} height={1} fill={r.cor} />
      ))}
    </svg>
  )
}

/** "12 moedas" com a moedinha na frente. */
export function Moedas({ quantidade, tamanho = 18 }: { quantidade: number; tamanho?: number }) {
  return (
    <span className="moedas">
      <Moeda tamanho={tamanho} />
      <span>
        {quantidade} {Math.abs(quantidade) === 1 ? 'moeda' : 'moedas'}
      </span>
    </span>
  )
}
