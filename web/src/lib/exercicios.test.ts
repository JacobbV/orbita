import { decidirReconferencia, resumirParaRefazer, validarExercicio } from './exercicios'

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

  it('confere quando agora dá mais acertos (conferência ficou mais flexível depois da entrega)', () => {
    const r = decidirReconferencia({ testesCertos: 1, testesTotal: 2 }, [
      { tipo: 'visivel', certo: true },
      { tipo: 'oculto', certo: true },
    ])
    expect(r).toEqual({ confere: true, motivo: 'Confere: 2 de 2 testes certos.' })
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
        linguagem: 'python',
        codigoInicial: '',
        testes: [{ tipo: 'visivel', entrada: '1 2', saidaEsperada: '3' }],
        conferencia: 'valores',
        palavrasExtras: '',
      }),
    ).toEqual({})
  })

  it('palavras extras têm limite de 500 letras', () => {
    const erros = validarExercicio({
      titulo: 'Par ou ímpar',
      enunciado: 'Diga se é par.',
      dificuldade: 1,
      linguagem: 'python',
      codigoInicial: '',
      testes: [{ tipo: 'visivel', entrada: '2', saidaEsperada: 'par' }],
      conferencia: 'valores',
      palavrasExtras: 'par '.repeat(130),
    })
    expect(erros.palavrasExtras).toBe('Use até 500 letras nas palavras que também contam.')
  })

  it('dicas: cada uma até 1000 letras; as vazias não contam', () => {
    const base = {
      titulo: 'Soma',
      enunciado: 'Some.',
      dificuldade: 1 as const,
      linguagem: 'python' as const,
      codigoInicial: '',
      testes: [{ tipo: 'visivel' as const, entrada: '1 2', saidaEsperada: '3' }],
      conferencia: 'valores' as const,
      palavrasExtras: '',
    }
    expect(validarExercicio({ ...base, dicas: ['', 'Use +.', ''] })).toEqual({})
    expect(validarExercicio({ ...base, dicas: ['x'.repeat(1001)] }).dicas).toBe('Cada dica pode ter até 1000 letras.')
  })
})

describe('resumirParaRefazer', () => {
  it('conta visíveis e ocultos certos e exige todos os secretos', () => {
    expect(
      resumirParaRefazer([
        { tipo: 'visivel', certo: true },
        { tipo: 'oculto', certo: true },
        { tipo: 'secreto', certo: false },
      ]),
    ).toEqual({ certos: 2, secretosOk: false })
    expect(resumirParaRefazer([{ tipo: 'visivel', certo: false }])).toEqual({ certos: 0, secretosOk: true })
  })
})
