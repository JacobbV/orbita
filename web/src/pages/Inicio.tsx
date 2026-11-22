import { Link } from 'react-router'
import { DISCIPLINAS_VITRINE } from '../data/disciplinas'
import './Inicio.css'

const PASSOS = [
  {
    numero: '01',
    titulo: 'Crie sua conta',
    texto: 'Use o e-mail @academico.ifpb.edu.br e escolha sua turma.',
  },
  {
    numero: '02',
    titulo: 'O professor aprova',
    texto: 'Ele confere se você é da turma. Enquanto isso, você vê a parte pública do site.',
  },
  {
    numero: '03',
    titulo: 'Estude aula por aula',
    texto: 'Cada aula aparece quando o professor libera para a sua turma.',
  },
] as const

export function Inicio() {
  return (
    <div className="inicio container">
      <section className="heroi" aria-labelledby="heroi-titulo">
        <div className="heroi-texto">
          <p className="pixel heroi-selo">IFPB · Campus Catolé do Rocha</p>
          <h1 id="heroi-titulo">Estude programação a bordo da sua própria nave.</h1>
          <p className="heroi-resumo">
            Aulas, apostilas e exercícios de código das disciplinas do Prof. Rameson Jacó, num só
            lugar, liberados aula por aula para a sua turma.
          </p>
          <div className="heroi-acoes">
            <Link to="/entrar" className="botao botao-primario">
              Sou aluno, quero entrar
            </Link>
            <Link to="/cadastro" className="botao">
              Criar conta
            </Link>
          </div>
        </div>
        <OrbitaIlustracao />
      </section>

      <section id="disciplinas" className="secao" aria-labelledby="disciplinas-titulo">
        <h2 id="disciplinas-titulo">Disciplinas a bordo</h2>
        <ul className="grade-disciplinas" role="list">
          {DISCIPLINAS_VITRINE.map((d) => (
            <li key={d.sigla} className={`cartao disciplina disciplina-${d.cor}`}>
              <p className="pixel disciplina-ano">{d.ano}</p>
              <h3>{d.nome}</h3>
              <p className="disciplina-resumo">{d.resumo}</p>
              <p className="disciplina-detalhe">{d.detalhe}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="como-funciona" className="secao" aria-labelledby="como-titulo">
        <h2 id="como-titulo">Como funciona</h2>
        <ol className="grade-passos" role="list">
          {PASSOS.map((p, i) => (
            <li key={p.numero} className={`passo passo-${i + 1}`}>
              <span className="pixel passo-numero" aria-hidden="true">
                {p.numero}
              </span>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

/** Planeta com órbita, desenhado em SVG (arte original, sem avatar na Fase 1). */
function OrbitaIlustracao() {
  return (
    <div className="heroi-arte" aria-hidden="true">
      <svg viewBox="0 0 240 240" className="heroi-svg">
        <circle cx="120" cy="120" r="112" fill="none" stroke="#2A3160" strokeWidth="1" />
        <circle cx="120" cy="120" r="82" fill="none" stroke="#2A3160" strokeWidth="1" strokeDasharray="3 6" />
        <circle cx="120" cy="120" r="46" fill="#161B33" stroke="#22D3EE" strokeWidth="2" />
        <path d="M84 108 Q120 92 156 108" fill="none" stroke="#22D3EE" strokeOpacity="0.5" strokeWidth="3" />
        <path d="M78 126 Q120 142 162 126" fill="none" stroke="#A78BFA" strokeOpacity="0.5" strokeWidth="3" />
        <ellipse cx="120" cy="120" rx="76" ry="16" fill="none" stroke="#22D3EE" strokeWidth="2" transform="rotate(-18 120 120)" />
        <g className="heroi-satelite">
          <circle cx="210" cy="64" r="12" fill="#A78BFA" />
        </g>
        <circle cx="38" cy="182" r="7" fill="#FBBF24" />
        <rect x="170" y="186" width="6" height="6" fill="#F472B6" />
        <rect x="58" y="44" width="4" height="4" fill="#E5E7F5" />
      </svg>
    </div>
  )
}
