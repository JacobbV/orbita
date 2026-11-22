import { Link } from 'react-router'
import './Mensagem.css'

export function NaoEncontrada() {
  return (
    <div className="mensagem container">
      <div className="cartao mensagem-cartao">
        <p className="pixel mensagem-selo">Erro 404</p>
        <h1>Esta parte da galáxia não existe.</h1>
        <p>Confira o endereço ou volte para a base.</p>
        <Link to="/" className="botao botao-primario">
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
