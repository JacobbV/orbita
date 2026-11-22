import { ARTE, BIBLIOTECAS, FONTES, type Credito } from '../data/creditos'
import './Creditos.css'

export function Creditos() {
  return (
    <div className="creditos container">
      <p className="pixel creditos-selo">Tripulação de apoio</p>
      <h1>Créditos e licenças</h1>
      <p className="creditos-intro">
        O Órbita usa só recursos com licença livre. Aqui estão todos, com autor, link e licença.
      </p>

      <GrupoCreditos titulo="Fontes" itens={FONTES} />
      <GrupoCreditos titulo="Bibliotecas e ferramentas" itens={BIBLIOTECAS} />
      <GrupoCreditos titulo="Arte" itens={ARTE} />

      <section className="cartao creditos-marca" aria-labelledby="marca-titulo">
        <h2 id="marca-titulo">Quem fez</h2>
        <p>
          Desenvolvido por{' '}
          <a href="https://jacobbv.github.io" className="qyudev" rel="noopener">
            QYUDEV.
          </a>{' '}
          para as turmas do IFPB Campus Catolé do Rocha.
        </p>
      </section>
    </div>
  )
}

function GrupoCreditos({ titulo, itens }: { titulo: string; itens: Credito[] }) {
  return (
    <section className="creditos-grupo" aria-label={titulo}>
      <h2>{titulo}</h2>
      <ul className="creditos-lista" role="list">
        {itens.map((c) => (
          <li key={c.nome} className="cartao credito">
            <h3>
              <a href={c.link} rel="noopener">
                {c.nome}
              </a>
            </h3>
            <dl>
              <div>
                <dt>Autor</dt>
                <dd>{c.autor}</dd>
              </div>
              <div>
                <dt>Licença</dt>
                <dd>{c.licenca}</dd>
              </div>
              <div>
                <dt>Uso</dt>
                <dd>{c.uso}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  )
}
