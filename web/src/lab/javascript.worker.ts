// Roda o JavaScript do aluno fora da tela principal, sem acesso à página.
// console.log escreve a saída; input() e prompt() leem a entrada, uma linha
// por chamada. Se o código travar (laço infinito), a tela encerra o worker.
import type { PedidoAoPython, RespostaDoPython } from './python.worker'
import { rodarJavaScript } from './javascript'

const responder = (r: RespostaDoPython) => (self as unknown as { postMessage(m: RespostaDoPython): void }).postMessage(r)

self.onmessage = (evento: MessageEvent<PedidoAoPython>) => {
  const { id, codigo, entrada, mostrarPerguntas } = evento.data
  responder({ tipo: 'resultado', id, ...rodarJavaScript(codigo, entrada, mostrarPerguntas) })
}

responder({ tipo: 'pronto' })
