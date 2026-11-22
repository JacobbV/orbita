import { decidirReconferencia, validarExercicio } from './exercicios'

describe('decidirReconferencia', () => {
  const tudoCerto = { testesCertos: 2, testesTotal: 2 }

  it('confere quando os testes batem e os secretos passam', () => {
    const r = decidirReconferencia(tudoCerto, [
      { tipo: 'visivel', certo: true },
      { tipo: 'oculto', certo: true },
      { tipo: 'secreto', certo: true },
    ])
    expect(r).toEqual({ confere: true, motivo: 'Confere: 2 de 2 testes e o secreto.' })
  })

  it('não confere quando o número de acertos mudou', () => {
    const r = decidirReconferencia(tudoCerto, [
      { tipo: 'visivel', certo: true },
      { tipo: 'oculto', certo: false },
    ])
    expect(r.confere).toBe(false)
    expect(r.motivo).toBe('A entrega dizia 2 de 2 testes certos, e agora deu 1 de 2.')
  })

  it('quem disse que acertou tudo precisa passar nos secretos', () => {
    const r = decidirReconferencia(tudoCerto, [
      { tipo: 'visivel', certo: true },
      { tipo: 'oculto', certo: true },
      { tipo: 'secreto', certo: false },
      { tipo: 'secreto', certo: true },
    ])
    expect(r).toEqual({ confere: false, motivo: 'Errou 1 de 2 testes secretos.' })
  })

  it('entrega parcial que bate confere, mesmo errando secretos', () => {
    const r = decidirReconferencia({ testesCertos: 1, testesTotal: 2 }, [
      { tipo: 'visivel', certo: true },
      { tipo: 'oculto', certo: false },
      { tipo: 'secreto', certo: false },
    ])
    expect(r).toEqual({ confere: true, motivo: 'Confere: 1 de 2 testes certos.' })
  })
})

describe('validarExercicio', () => {
  it('aceita um exercício completo', () => {
    expect(
      validarExercicio({
        titulo: 'Soma',
        enunciado: 'Some.',
        dificuldade: 1,
        codigoInicial: '',
        testes: [{ tipo: 'visivel', entrada: '1 2', saidaEsperada: '3' }],
      }),
    ).toEqual({})
  })
})
