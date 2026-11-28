import type { Linguagem } from './linguagens'
import { traduzirErro } from './traducaoDeErros'
import './ErroExplicado.css'

interface Props {
  erro: string
  linguagem: Linguagem
  /** Classe da mensagem original (o terminal e os resultados usam cores diferentes). */
  classeOriginal: string
}

/** Erro do programa em português simples, com a linha, e a mensagem original logo abaixo. */
export function ErroExplicado({ erro, linguagem, classeOriginal }: Props) {
  const t = traduzirErro(erro, linguagem)
  if (!t) return <pre className={classeOriginal}>{erro}</pre>
  return (
    <div className="erro-explicado">
      <p className="erro-explicado-texto">
        <strong className="erro-explicado-titulo">
          {t.linha !== null ? `Erro na linha ${t.linha}` : 'Erro'}
          <span className="erro-explicado-tipo"> ({t.tipo})</span>:
        </strong>{' '}
        {t.explicacao}
      </p>
      <div className="erro-explicado-original">
        <p className="erro-explicado-rotulo">Mensagem original do {linguagem === 'javascript' ? 'JavaScript' : 'Python'}:</p>
        <pre className={classeOriginal}>{erro}</pre>
      </div>
    </div>
  )
}
