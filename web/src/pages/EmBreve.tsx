import { Link } from 'react-router'
import './Mensagem.css'

/** Página provisória para telas das próximas etapas (ponte do aluno e painel do professor). */
export function EmBreve({ titulo }: { titulo: string }) {
  return (
    <div className="mensagem container">
      <div className="cartao mensagem-cartao">
        <p className="pixel mensagem-selo">Em construção</p>
        <h1>{titulo}</h1>
        <p>Esta tela chega na próxima etapa da Fase 1.</p>
        <Link to="/" className="botao">
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
