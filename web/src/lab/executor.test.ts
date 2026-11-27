import { ExecutorPython, TEMPO_LIMITE_MS } from './executor'

/** Worker falso: responde "pronto" e devolve a saída que o teste mandar. */
class WorkerFalso {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  encerrado = false
  responder = true
  constructor(primeiraResposta: object = { tipo: 'pronto' }) {
    queueMicrotask(() => this.onmessage?.({ data: primeiraResposta } as MessageEvent))
  }
  postMessage(pedido: { id: number; codigo: string }) {
    if (!this.responder) return
    queueMicrotask(() =>
      this.onmessage?.({
        data: { tipo: 'resultado', id: pedido.id, saida: `rodou: ${pedido.codigo}`, erro: null, saidaGrande: false, precisaDeEntrada: false },
      } as MessageEvent),
    )
  }
  terminate() {
    this.encerrado = true
  }
}

describe('ExecutorPython', () => {
  afterEach(() => vi.useRealTimers())

  it('roda o código no worker e devolve a saída', async () => {
    const executor = new ExecutorPython(() => new WorkerFalso() as unknown as Worker)
    expect(await executor.rodar('print(1)')).toEqual({ saida: 'rodou: print(1)', erro: null, tempoEsgotado: false, saidaGrande: false, precisaDeEntrada: false })
  })

  it('código que não termina é parado no tempo limite e o worker é trocado', async () => {
    const criados: WorkerFalso[] = []
    const executor = new ExecutorPython(() => {
      const w = new WorkerFalso()
      w.responder = criados.length > 0
      criados.push(w)
      return w as unknown as Worker
    })
    await executor.carregar()
    vi.useFakeTimers()
    const resultado = executor.rodar('while True: pass')
    await vi.advanceTimersByTimeAsync(TEMPO_LIMITE_MS + 10)
    expect((await resultado).tempoEsgotado).toBe(true)
    expect(criados[0]?.encerrado).toBe(true)
    vi.useRealTimers()
    expect((await executor.rodar('print(2)')).saida).toBe('rodou: print(2)')
    expect(criados).toHaveLength(2)
  })

  it('falha ao carregar o Python vira mensagem clara', async () => {
    const executor = new ExecutorPython(
      () => new WorkerFalso({ tipo: 'falha-ao-carregar', mensagem: 'sem rede' }) as unknown as Worker,
    )
    await expect(executor.carregar()).rejects.toThrow('Não foi possível carregar o Python')
  })
})
