import { situacaoDeAcesso } from '../lib/acessos'
import './IndicadorDeAcesso.css'

/** Bolinha verde e texto: "online agora" ou "visto há…". Só aparece para o professor. */
export function IndicadorDeAcesso({ ultimo }: { ultimo: string | null | undefined }) {
  const s = situacaoDeAcesso(ultimo)
  return (
    <span className={`acesso${s.online ? ' acesso-online' : ''}`}>
      <span className="acesso-bolinha" aria-hidden="true" />
      {s.texto}
    </span>
  )
}
