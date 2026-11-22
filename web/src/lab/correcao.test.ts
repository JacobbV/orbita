import { impressaoDigital, normalizarSaida, saidaConfere } from './correcao'

describe('correção dos testes', () => {
  it('normaliza como o banco: Windows, espaços no fim e linhas vazias no fim', () => {
    expect(normalizarSaida('10  \r\n20\t\n\n\n')).toBe('10\n20')
    expect(normalizarSaida('  recuo fica')).toBe('  recuo fica')
  })

  it('impressão digital igual à do banco (SHA-256 de "10")', async () => {
    expect(await impressaoDigital('10 \n')).toBe('4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5')
  })

  it('teste visível compara a saída; oculto compara a impressão digital', async () => {
    expect(await saidaConfere({ saida_esperada: '3', saida_hash: 'x' }, '3\n')).toBe(true)
    expect(await saidaConfere({ saida_esperada: '3', saida_hash: 'x' }, '4')).toBe(false)
    const hash = await impressaoDigital('10')
    expect(await saidaConfere({ saida_esperada: null, saida_hash: hash }, '10\r\n')).toBe(true)
    expect(await saidaConfere({ saida_esperada: null, saida_hash: hash }, '11')).toBe(false)
  })
})
