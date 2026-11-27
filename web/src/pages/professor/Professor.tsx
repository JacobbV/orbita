import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { BonecoDoHangar } from '../../components/BonecoDoHangar'
import { saudacao } from '../../lib/saudacao'
import { Aulas } from './Aulas'
import { Entregas } from './Entregas'
import { Pedidos } from './Pedidos'
import { Turmas } from './Turmas'
import './Professor.css'

const ABAS = [
  { id: 'pedidos', rotulo: 'Pedidos' },
  { id: 'aulas', rotulo: 'Aulas' },
  { id: 'turmas', rotulo: 'Turmas' },
  { id: 'entregas', rotulo: 'Entregas' },
] as const

type Aba = (typeof ABAS)[number]['id']

/** Painel do professor: pedidos de acesso, liberação de aulas e turmas. */
export function Professor() {
  const { perfil } = useAuth()
  const [params] = useSearchParams()
  const aba: Aba = ABAS.find((a) => a.id === params.get('aba'))?.id ?? 'pedidos'

  return (
    <div className="painel container">
      <header className="cartao painel-topo">
        <BonecoDoHangar />
        <div>
          <p className="pixel painel-selo">Painel do professor</p>
          <h1>{saudacao(perfil?.nome, 'professor')}</h1>
          <p className="painel-intro">Aprove os pedidos de acesso, libere as aulas de cada turma e organize as disciplinas.</p>
        </div>
      </header>

      <nav className="painel-abas" aria-label="Seções do painel">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            to={`?aba=${a.id}`}
            className={`painel-aba${a.id === aba ? ' painel-aba-atual' : ''}`}
            aria-current={a.id === aba ? 'page' : undefined}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>

      {aba === 'pedidos' && <Pedidos />}
      {aba === 'aulas' && <Aulas />}
      {aba === 'turmas' && <Turmas />}
      {aba === 'entregas' && <Entregas />}
    </div>
  )
}
