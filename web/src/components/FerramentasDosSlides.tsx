import { CORES_DO_LAPIS, ESPESSURAS, type Traco } from '../lib/rabiscos'
import type { Anotacoes, Ferramenta } from './useAnotacoes'

const FERRAMENTAS: { id: Exclude<Ferramenta, 'nada'>; nome: string }[] = [
  { id: 'lapis', nome: 'Lápis' },
  { id: 'marca-texto', nome: 'Marca-texto' },
  { id: 'borracha', nome: 'Borracha' },
]

function Fita({ cheia }: { cheia: boolean }) {
  return (
    <svg viewBox="0 0 16 20" width="16" height="20" aria-hidden="true" className="anotacoes-fita-icone">
      <path d="M2 1h12v18l-6-4.5L2 19z" fill={cheia ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

/** Barra com o marcador de página, o lápis, o marca-texto, a borracha e o limpar. */
export function FerramentasDosSlides({
  a,
  tracos,
  confirmandoLimpar,
  aoPedirLimpar,
}: {
  a: Anotacoes
  /** Traços do slide aberto. */
  tracos: Traco[]
  confirmandoLimpar: boolean
  aoPedirLimpar: (pedir: boolean) => void
}) {
  const marcado = a.slideAtual !== null && a.marcador === a.slideAtual
  const desenhando = a.ferramenta !== 'nada'
  const slide = a.slideAtual
  return (
    <div className="anotacoes-ferramentas" role="toolbar" aria-label="Marcador e rabiscos">
      <div className="anotacoes-grupo">
        <button
          type="button"
          className={`botao botao-compacto anotacoes-marcador${marcado ? ' anotacoes-marcador-ligado' : ''}`}
          aria-pressed={marcado}
          disabled={slide === null}
          onClick={() => void a.alternarMarcador()}
          title="Marca o slide onde você parou. Da próxima vez, é só continuar dali."
        >
          <Fita cheia={marcado} />
          {marcado ? 'Parei aqui' : 'Marcar onde parei'}
        </button>
        {slide !== null && a.marcador !== null && a.marcador !== slide && (
          <button type="button" className="botao botao-compacto" onClick={() => a.irPara(a.marcador!)}>
            Ir ao marcador (slide {a.marcador})
          </button>
        )}
      </div>

      <div className="anotacoes-grupo" role="group" aria-label="Ferramentas de rabisco">
        {FERRAMENTAS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`botao botao-compacto${a.ferramenta === f.id ? ' botao-primario' : ''}`}
            aria-pressed={a.ferramenta === f.id}
            onClick={() => a.setFerramenta(a.ferramenta === f.id ? 'nada' : f.id)}
          >
            {f.nome}
          </button>
        ))}
      </div>

      {(a.ferramenta === 'lapis' || a.ferramenta === 'marca-texto') && (
        <>
          <div className="anotacoes-grupo" role="group" aria-label="Cor">
            {CORES_DO_LAPIS.map((c) => (
              <button
                key={c.valor}
                type="button"
                className={`anotacoes-cor${a.cor === c.valor ? ' anotacoes-cor-escolhida' : ''}`}
                aria-label={c.nome}
                aria-pressed={a.cor === c.valor}
                onClick={() => a.setCor(c.valor)}
              >
                <span style={{ background: c.valor }} />
              </button>
            ))}
          </div>
          <div className="anotacoes-grupo" role="group" aria-label="Tamanho">
            {ESPESSURAS.map((e) => (
              <button
                key={e.valor}
                type="button"
                className={`botao botao-compacto${a.espessura === e.valor ? ' botao-primario' : ''}`}
                aria-pressed={a.espessura === e.valor}
                onClick={() => a.setEspessura(e.valor)}
              >
                {e.nome}
              </button>
            ))}
          </div>
        </>
      )}

      {desenhando && (
        <div className="anotacoes-grupo" role="group" aria-label="Mudar de slide">
          <button type="button" className="botao botao-compacto" onClick={() => a.mover(-1)} aria-label="Slide anterior">
            ◀
          </button>
          <button type="button" className="botao botao-compacto" onClick={() => a.mover(1)} aria-label="Próximo slide">
            ▶
          </button>
        </div>
      )}

      {slide !== null && (
        <div className="anotacoes-grupo">
          <button
            type="button"
            className="botao botao-compacto"
            disabled={tracos.length === 0}
            onClick={() => a.mudarTracos(slide, tracos.slice(0, -1))}
          >
            Desfazer
          </button>
          {confirmandoLimpar ? (
            <>
              <button
                type="button"
                className="botao botao-compacto botao-primario"
                onClick={() => {
                  a.mudarTracos(slide, [])
                  aoPedirLimpar(false)
                }}
              >
                Sim, limpar o slide
              </button>
              <button type="button" className="botao botao-compacto" onClick={() => aoPedirLimpar(false)}>
                Não
              </button>
            </>
          ) : (
            <button type="button" className="botao botao-compacto" disabled={tracos.length === 0} onClick={() => aoPedirLimpar(true)}>
              Limpar tela
            </button>
          )}
        </div>
      )}

      <p className="anotacoes-estado" role="status">
        {slide !== null && <span>Slide {slide}</span>}
        {a.salvamento === 'salvando' && <span> · Guardando…</span>}
        {a.salvamento === 'salvo' && <span> · Rabiscos guardados</span>}
      </p>
    </div>
  )
}
