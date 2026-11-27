import {
  fichas,
  formaConferida,
  impressaoDigital,
  impressaoDigitalConferida,
  modoDoTeste,
  normalizarSaida,
  saidaConfere,
  saidasConferem,
  valoresConferidos,
} from './correcao'

const valores = { modo: 'valores', palavras: '' } as const

describe('correção dos testes: modo exato', () => {
  it('normaliza como o banco: Windows, espaços no fim e linhas vazias no fim', () => {
    expect(normalizarSaida('10  \r\n20\t\n\n\n')).toBe('10\n20')
    expect(normalizarSaida('  recuo fica')).toBe('  recuo fica')
  })

  it('impressão digital igual à do banco (SHA-256 de "10")', async () => {
    expect(await impressaoDigital('10 \n')).toBe('4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5')
  })

  it('no modo exato, uma letra diferente já erra', () => {
    const exato = { modo: 'exato', palavras: '' } as const
    expect(saidasConferem('Soma: 3\n', 'Soma: 3', '1\n2', exato)).toBe(true)
    expect(saidasConferem('soma: 3', 'Soma: 3', '1\n2', exato)).toBe(false)
  })
})

describe('correção dos testes: palavras e números', () => {
  it('separa palavras e números sem maiúsculas, acentos e pontuação', () => {
    expect(fichas(`Lista de nomes: ['Ána', "BIA"]`)).toEqual(['lista', 'de', 'nomes', 'ana', 'bia'])
    expect(fichas('12.0 2.50 -3 x1 [1, 2]')).toEqual(['12', '2.5', '-3', 'x', '1', '1', '2'])
    expect(fichas('João, ÇÉU e café')).toEqual(['joao', 'ceu', 'e', 'cafe'])
  })

  it('mesmas fichas que o banco (casos do teste pgTAP 18)', () => {
    expect(formaConferida(`Lista de nomes: ['Ana', 'Bia']`, 'Ana\nBia', '', 'valores')).toBe('ana bia')
    expect(formaConferida('Resultado: 12.0', '7\n5', '', 'valores')).toBe('12')
    expect(formaConferida('Nota 7: APROVADO!', '7', 'aprovado, par', 'valores')).toBe('7 aprovado')
    expect(formaConferida('Olá, Mundo!', '', '', 'texto')).toBe('ola mundo')
  })
})

describe('correção dos testes: só os valores (padrão)', () => {
  it('a lista de nomes passa com aspas simples, aspas duplas ou sem nada', () => {
    const esperada = `Lista de nomes: ['Ana', 'Bia', 'Caio']`
    const entrada = 'Ana\nBia\nCaio'
    for (const saida of [`['Ana', 'Bia', 'Caio']`, `Nomes: ["Ana", "Bia", "Caio"]`, 'ana, bia, caio', 'Lista:\nAna\nBia\nCaio']) {
      expect(saidasConferem(saida, esperada, entrada, valores)).toBe(true)
    }
    expect(saidasConferem(`['Ana', 'Caio', 'Bia']`, esperada, entrada, valores)).toBe(false)
    expect(saidasConferem(`['Ana', 'Bia']`, esperada, entrada, valores)).toBe(false)
  })

  it('o texto em volta do número não conta, mas o número sim', () => {
    expect(saidasConferem('A soma é 7', 'Soma: 7', '3\n4', valores)).toBe(true)
    expect(saidasConferem('7.0', 'Soma: 7', '3\n4', valores)).toBe(true)
    expect(saidasConferem('A soma é 8', 'Soma: 7', '3\n4', valores)).toBe(false)
  })

  it('palavras que não vieram da entrada só contam se o professor marcar', () => {
    const entrada = '7'
    expect(saidasConferem('7 reprovado', '7 aprovado', entrada, valores)).toBe(true)
    const marcadas = { modo: 'valores', palavras: 'aprovado reprovado' } as const
    expect(saidasConferem('7 reprovado', '7 aprovado', entrada, marcadas)).toBe(false)
    expect(saidasConferem('Nota 7: APROVADO', '7 aprovado', entrada, marcadas)).toBe(true)
  })

  it('sem nenhum valor na saída esperada, vale o texto flexível', () => {
    expect(modoDoTeste('Olá, mundo!', '', valores)).toBe('texto')
    expect(saidasConferem('ola mundo', 'Olá, mundo!', '', valores)).toBe(true)
    expect(saidasConferem('', 'Olá, mundo!', '', valores)).toBe(false)
    expect(saidasConferem('Tchau', 'Olá, mundo!', '', valores)).toBe(false)
  })

  it('mostra o que foi conferido', () => {
    expect(valoresConferidos('Lista de nomes: Ana e Bia', 'Ana\nBia', '', 'valores')).toEqual(['ana', 'bia'])
  })
})

describe('teste do aluno', () => {
  it('visível compara a saída com a regra do teste', async () => {
    const t = { saida_esperada: 'Soma: 3', saida_hash: 'x', entrada: '1\n2', conferencia: 'valores' as const, palavras: '' }
    expect(await saidaConfere(t, 'O resultado é 3\n')).toBe(true)
    expect(await saidaConfere(t, '4')).toBe(false)
  })

  it('oculto compara a impressão digital do que é conferido', async () => {
    const hash = await impressaoDigitalConferida(`['Ana', 'Bia']`, 'Ana\nBia', '', 'valores')
    const t = { saida_esperada: null, saida_hash: hash, entrada: 'Ana\nBia', conferencia: 'valores' as const, palavras: '' }
    expect(await saidaConfere(t, 'Nomes: "Ana", "Bia"')).toBe(true)
    expect(await saidaConfere(t, 'Bia, Ana')).toBe(false)
  })

  it('sem o modo (site antigo em cache), confere como texto exato', async () => {
    const hash = await impressaoDigital('10')
    expect(await saidaConfere({ saida_esperada: null, saida_hash: hash, entrada: '' }, '10\r\n')).toBe(true)
    expect(await saidaConfere({ saida_esperada: '3', saida_hash: 'x', entrada: '' }, '4')).toBe(false)
  })
})
