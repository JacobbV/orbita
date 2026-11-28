import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ErroExplicado } from './ErroExplicado'
import { TEMPO_LIMITE_MS, type ResultadoDaExecucao } from './executor'
import type { Linguagem } from './linguagens'
import './Terminal.css'

interface Props {
  /** O que o programa escreveu até agora (inclui as respostas já digitadas). */
  resultado: ResultadoDaExecucao | null
  /** Está rodando agora (ou carregando a linguagem). */
  ocupado: boolean
  mensagemOcupado?: string
  /** Quantas respostas já foram digitadas (o campo da próxima leva esse número + 1). */
  respostasDadas?: number
  /** O programa parou e espera a próxima resposta do input(). */
  aoResponder: (resposta: string) => void
  /** Linguagem do programa, para explicar o erro em português. */
  linguagem?: Linguagem
}

/** Terminal do exercício: mostra a saída do programa e pede as respostas do input() na hora, como o CMD. */
export function Terminal({ resultado, ocupado, mensagemOcupado, respostasDadas = 0, aoResponder, linguagem = 'python' }: Props) {
  const [digitado, setDigitado] = useState('')
  const campo = useRef<HTMLInputElement>(null)
  const esperando = resultado?.precisaDeEntrada === true && !ocupado

  useEffect(() => {
    if (esperando) campo.current?.focus()
  }, [esperando, resultado])

  function enviar(e: FormEvent) {
    e.preventDefault()
    const resposta = digitado
    setDigitado('')
    aoResponder(resposta)
  }

  return (
    <div className="terminal" role="region" aria-label="Terminal">
      <div className="terminal-barra pixel" aria-hidden="true">
        <span>TERMINAL</span>
      </div>
      <div className="terminal-corpo" aria-live="polite">
        {!resultado && !ocupado && <p className="terminal-vazio">Clique em Rodar para ver o seu programa funcionando aqui.</p>}
        {ocupado && <p className="terminal-vazio">{mensagemOcupado ?? 'Rodando…'}</p>}
        {resultado && !ocupado && <Saida resultado={resultado} linguagem={linguagem} />}
        {esperando && (
          <form className="terminal-linha" onSubmit={enviar}>
            <label className="sr-only" htmlFor="terminal-resposta">
              Resposta para o input()
            </label>
            <span aria-hidden="true">&gt;</span>
            <input
              ref={campo}
              id="terminal-resposta"
              data-resposta={respostasDadas + 1}
              className="terminal-campo"
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="digite a resposta e aperte Enter"
              enterKeyHint="send"
            />
            <button type="submit" className="botao botao-compacto">
              Enviar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function Saida({ resultado, linguagem }: { resultado: ResultadoDaExecucao; linguagem: Linguagem }) {
  if (resultado.tempoEsgotado) {
    return (
      <pre className="terminal-erro">
        O programa passou de {TEMPO_LIMITE_MS / 1000} segundos e foi parado. Confira se algum laço (while ou for) nunca
        termina.
      </pre>
    )
  }
  return (
    <>
      {(resultado.saida || (!resultado.erro && !resultado.precisaDeEntrada)) && (
        <pre className="terminal-saida">{resultado.saida || '(sem saída)'}</pre>
      )}
      {resultado.saidaGrande && <p className="terminal-aviso">A saída era muito grande e foi cortada.</p>}
      {resultado.erro && <ErroExplicado erro={resultado.erro} linguagem={linguagem} classeOriginal="terminal-erro" />}
    </>
  )
}
