/** Aviso simples de carregamento, acessível para leitores de tela. */
export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="container carregando" role="status" aria-live="polite">
      <span className="carregando-ponto" aria-hidden="true" />
      {texto}
    </div>
  )
}
