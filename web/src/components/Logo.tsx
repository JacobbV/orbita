import { Link } from 'react-router'
import './Logo.css'

/** Logo do Órbita em pixel. O nome completo fica para leitores de tela. */
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Órbita, página inicial">
      <span aria-hidden="true">ORBITA</span>
    </Link>
  )
}
