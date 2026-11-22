import type { PedidoAoPython, RespostaDoPython } from './python.worker'

export interface ResultadoDaExecucao {
  saida: string
  /** Mensagem de erro do Python (traceback curto), ou null. */
  erro: string | null
  tempoEsgotado: boolean
  saidaGrande: boolean
}

/** Tempo máximo de cada execução, depois que o Python já carregou. */
export const TEMPO_LIMITE_MS = 5_000

type Pendente = { resolver: (r: ResultadoDaExecucao) => void; relogio: ReturnType<typeof setTimeout> }

/** Python do navegador num worker. Uma execução por vez. */
export class ExecutorPython {
  private worker: Worker | null = null
  private pronto: Promise<void> | null = null
  private pendente: Pendente | null = null
  private proximoId = 1

  private readonly criarWorker: () => Worker

  constructor(criarWorker: () => Worker = criarWorkerPython) {
    this.criarWorker = criarWorker
  }

  /** Carrega o Python (alguns segundos na primeira vez). */
  carregar(): Promise<void> {
    if (this.pronto) return this.pronto
    const worker = this.criarWorker()
    this.worker = worker
    this.pronto = new Promise((resolve, reject) => {
      worker.onmessage = (evento: MessageEvent<RespostaDoPython>) => {
        const r = evento.data
        if (r.tipo === 'pronto') resolve()
        else if (r.tipo === 'falha-ao-carregar') {
          this.descartar()
          reject(new Error('Não foi possível carregar o Python. Confira a internet e tente de novo.'))
        } else if (this.pendente) {
          const { resolver, relogio } = this.pendente
          clearTimeout(relogio)
          this.pendente = null
          resolver({ saida: r.saida, erro: r.erro, tempoEsgotado: false, saidaGrande: r.saidaGrande })
        }
      }
      worker.onerror = () => {
        this.descartar()
        reject(new Error('Não foi possível carregar o Python. Confira a internet e tente de novo.'))
      }
    })
    return this.pronto
  }

  async rodar(codigo: string, entrada = '', mostrarPerguntas = false): Promise<ResultadoDaExecucao> {
    await this.carregar()
    const worker = this.worker
    if (!worker || this.pendente) throw new Error('O Python ainda está rodando outro código.')
    return new Promise((resolver) => {
      const relogio = setTimeout(() => {
        // Laço infinito ou código muito lento: encerra e prepara outro Python.
        this.pendente = null
        this.descartar()
        resolver({ saida: '', erro: null, tempoEsgotado: true, saidaGrande: false })
      }, TEMPO_LIMITE_MS)
      this.pendente = { resolver, relogio }
      const pedido: PedidoAoPython = { id: this.proximoId++, codigo, entrada, mostrarPerguntas }
      worker.postMessage(pedido)
    })
  }

  encerrar() {
    if (this.pendente) clearTimeout(this.pendente.relogio)
    this.pendente = null
    this.descartar()
  }

  private descartar() {
    this.worker?.terminate()
    this.worker = null
    this.pronto = null
  }
}

function criarWorkerPython(): Worker {
  return new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' })
}
