import {
  agruparPorOferta,
  lerNomeDoSlide,
  lerTopicos,
  montarEstrutura,
  planejarEnvioEmLote,
  siglaDoNome,
  soArquivosHtml,
  tipoDoArquivo,
  validarArquivoDeMaterial,
  validarTopicos,
  validarArquivoDeSlides,
  validarAnoLetivo,
  validarLink,
  validarTitulo,
  type OfertaDoPainel,
  type PedidoDoPainel,
} from './professor'

// Dados inventados; nenhum nome real de aluno.
function oferta(id: number, turma: string, disciplina: string): OfertaDoPainel {
  return {
    id,
    turma: { id, nome: turma, turno: 'manha', anoLetivo: 2026 },
    disciplina: { id: disciplina.length, sigla: 'X', nome: disciplina },
    turmaAtiva: true,
  }
}

function pedido(id: number, o: OfertaDoPainel): PedidoDoPainel {
  return {
    id,
    status: 'pendente',
    tentativa: 1,
    quemEVoce: 'Tripulante Fictício, turma, manhã',
    motivoRecusa: null,
    criadoEm: '2026-11-01T10:00:00Z',
    decididoEm: null,
    aluno: { nome: `Tripulante ${id}`, email: `t${id}@academico.ifpb.edu.br` },
    oferta: o,
  }
}

describe('agruparPorOferta', () => {
  it('junta os pedidos por turma e disciplina, em ordem de disciplina e turma', () => {
    const webM = oferta(3, '3º INFO M', 'Web')
    const algV = oferta(2, '1º INFO V', 'Algoritmos')
    const algM = oferta(1, '1º INFO M', 'Algoritmos')
    const grupos = agruparPorOferta([pedido(1, webM), pedido(2, algV), pedido(3, algM), pedido(4, algV)])
    expect(grupos.map((g) => `${g.oferta.disciplina.nome} ${g.oferta.turma.nome}`)).toEqual([
      'Algoritmos 1º INFO M',
      'Algoritmos 1º INFO V',
      'Web 3º INFO M',
    ])
    expect(grupos[1]?.pedidos.map((p) => p.id)).toEqual([2, 4])
  })
})

const unidades = montarEstrutura({
  unidades: [
    { id: 2, numero: 2, titulo: 'B', aulas: [] },
    {
      id: 1,
      numero: 1,
      titulo: 'A',
      aulas: [
        { id: 12, numero: 2, titulo: 'A2' },
        { id: 11, numero: 1, titulo: 'A1' },
      ],
    },
  ],
  liberadas: [12],
  links: [
    { id: 1, aula_id: 11, titulo: 'Material da aula', url: 'https://exemplo.org/a1', tipo: 'link', caminho_storage: null },
    { id: 2, aula_id: 12, titulo: 'Arquivo', url: null, tipo: 'pdf', caminho_storage: 'aulas/12/a.pdf' },
    { id: 3, aula_id: 12, titulo: 'Slides da aula', url: null, tipo: 'slide', caminho_storage: 'aulas/12/slides-1.html' },
  ],
})

describe('montarEstrutura', () => {
  it('ordena unidades e aulas e marca as liberadas da turma', () => {
    expect(unidades.map((u) => u.numero)).toEqual([1, 2])
    expect(unidades[0]?.aulas.map((a) => [a.titulo, a.liberada])).toEqual([
      ['A1', false],
      ['A2', true],
    ])
  })

  it('mostra só o link externo de cada aula', () => {
    expect(unidades[0]?.aulas[0]?.link?.url).toBe('https://exemplo.org/a1')
    expect(unidades[0]?.aulas[1]?.link).toBeNull()
  })

  it('marca os slides HTML enviados', () => {
    expect(unidades[0]?.aulas[1]?.slides).toEqual({ id: 3, caminho: 'aulas/12/slides-1.html' })
    expect(unidades[0]?.aulas[0]?.slides).toBeNull()
  })
})

describe('apostila, áudio e tópicos', () => {
  const arquivo = (name: string, size = 1000) => ({ name, size }) as File

  it('o nome diz o tipo do arquivo', () => {
    expect(tipoDoArquivo('ALG_U4_A2.html')).toBe('slide')
    expect(tipoDoArquivo('ALG_U4_A2_apostila.html')).toBe('apostila')
    expect(tipoDoArquivo('ALG_U4_A2_audio.mp3')).toBe('audio')
    expect(tipoDoArquivo('ALG_U4_A2.MP3')).toBe('audio')
  })

  it('apostila é .html e áudio é .mp3, ambos até 10 MB', () => {
    expect(validarArquivoDeMaterial('apostila', arquivo('a.html'))).toBeNull()
    expect(validarArquivoDeMaterial('audio', arquivo('a.mp3'))).toBeNull()
    expect(validarArquivoDeMaterial('audio', arquivo('a.wav'))).toBe('Escolha um arquivo .mp3.')
    expect(validarArquivoDeMaterial('audio', arquivo('a.mp3', 0))).toBe('O arquivo está vazio.')
    expect(validarArquivoDeMaterial('audio', arquivo('a.mp3', 11 * 1024 * 1024))).toContain('passa de 10 MB')
  })

  it('o envio em lote separa slides, apostila e áudio da mesma aula', () => {
    const itens = planejarEnvioEmLote(
      [arquivo('DAW_U1_A1.html'), arquivo('DAW_U1_A1_apostila.html'), arquivo('DAW_U1_A1_audio.mp3'), arquivo('DAW_U1_A1_audio (1).mp3')],
      unidades,
      'WEB',
    )
    expect(itens.map((i) => [i.arquivo.name, i.tipo, i.aula?.rotulo ?? null])).toEqual([
      ['DAW_U1_A1_apostila.html', 'apostila', 'I.1'],
      ['DAW_U1_A1_audio (1).mp3', 'audio', 'I.1'],
      ['DAW_U1_A1_audio.mp3', 'audio', null],
      ['DAW_U1_A1.html', 'slide', 'I.1'],
    ])
  })

  it('a pasta escolhida deixa passar .html e .mp3', () => {
    expect(soArquivosHtml([arquivo('a.html'), arquivo('b.mp3'), arquivo('c.png')]).map((a) => a.name)).toEqual(['a.html', 'b.mp3'])
  })

  it('um tópico por linha, sem linhas vazias, até 5 de 120 letras', () => {
    expect(lerTopicos(' Variáveis \n\n  Tipos \n')).toEqual(['Variáveis', 'Tipos'])
    expect(validarTopicos(['a', 'b'])).toBeNull()
    expect(validarTopicos(['a', 'b', 'c', 'd', 'e', 'f'])).toBe('Use no máximo 5 tópicos.')
    expect(validarTopicos(['x'.repeat(121)])).toBe('Cada tópico pode ter até 120 letras.')
  })
})

describe('slides HTML', () => {
  const arquivo = (name: string, size = 1000) => ({ name, size }) as File

  it('lê unidade e aula do nome do arquivo', () => {
    expect(lerNomeDoSlide('DAW_U1_A3.html')).toEqual({ unidade: 1, aula: 3 })
    expect(lerNomeDoSlide('ALG_U4_A1.htm')).toEqual({ unidade: 4, aula: 1 })
    expect(lerNomeDoSlide('alg-u02-a06.html')).toEqual({ unidade: 2, aula: 6 })
    expect(lerNomeDoSlide('U3A2.html')).toEqual({ unidade: 3, aula: 2 })
    expect(lerNomeDoSlide('slides.html')).toBeNull()
    expect(lerNomeDoSlide('MENU_A1.html')).toBeNull()
  })

  it('aceita só .html de até 10 MB', () => {
    expect(validarArquivoDeSlides(arquivo('a.html'))).toBeNull()
    expect(validarArquivoDeSlides(arquivo('a.pdf'))).toBe('Escolha um arquivo .html.')
    expect(validarArquivoDeSlides(arquivo('a.html', 0))).toBe('O arquivo está vazio.')
    expect(validarArquivoDeSlides(arquivo('a.html', 11 * 1024 * 1024))).toBe('O arquivo passa de 10 MB.')
  })

  it('casa cada arquivo com a aula certa e aponta os problemas', () => {
    const itens = planejarEnvioEmLote(
      [
        arquivo('DAW_U2_A1.html'),
        arquivo('DAW_U1_A1.html'),
        arquivo('DAW_U1_A2.html'),
        arquivo('dau_u1_a2 (1).html'),
        arquivo('capa.html'),
        arquivo('DAW_U1_A1.pdf'),
      ],
      unidades,
    )
    const resumo = itens.map((i) => [i.arquivo.name, i.aula?.rotulo ?? null, i.problema])
    expect(resumo).toEqual([
      ['capa.html', null, 'O nome não diz a unidade e a aula (ex.: ALG_U1_A2).'],
      ['dau_u1_a2 (1).html', 'I.2', null],
      ['DAW_U1_A1.html', 'I.1', null],
      ['DAW_U1_A1.pdf', null, 'Escolha um arquivo .html.'],
      ['DAW_U1_A2.html', null, 'Outro arquivo já vai para essa aula.'],
      ['DAW_U2_A1.html', null, 'Esta disciplina não tem essa aula.'],
    ])
    expect(itens.find((i) => i.aula?.rotulo === 'I.2')?.aula?.substitui).toBe(true)
  })

  it('lê a disciplina do começo do nome (DAW é Web)', () => {
    expect(siglaDoNome('DAW_U1_A1.html')).toEqual({ escrita: 'DAW', sigla: 'WEB' })
    expect(siglaDoNome('alg-u4-a1.html')).toEqual({ escrita: 'ALG', sigla: 'ALG' })
    expect(siglaDoNome('U1_A1.html')).toBeNull()
    expect(siglaDoNome('capa.html')).toBeNull()
    expect(siglaDoNome('XYZ_U1_A1.html')).toBeNull()
  })

  it('barra arquivo de outra disciplina', () => {
    const naWeb = planejarEnvioEmLote([arquivo('DAW_U1_A1.html'), arquivo('U1_A2.html')], unidades, 'WEB')
    expect(naWeb.map((i) => i.aula?.rotulo ?? null)).toEqual(['I.1', 'I.2'])
    const [errado] = planejarEnvioEmLote([arquivo('DAW_U1_A1.html')], unidades, 'ALG')
    expect(errado?.aula).toBeNull()
    expect(errado?.problema).toBe('Arquivo de outra disciplina (DAW). Troque a disciplina no topo.')
  })

  it('da pasta escolhida, fica só com os .html', () => {
    const nomes = soArquivosHtml([arquivo('ALG_U1_A1.html'), arquivo('logo.png'), arquivo('desktop.ini'), arquivo('b.HTM')])
    expect(nomes.map((a) => a.name)).toEqual(['ALG_U1_A1.html', 'b.HTM'])
  })
})

describe('validações do painel', () => {
  it('título é obrigatório e tem limite', () => {
    expect(validarTitulo('  ')).toBe('Escreva um título.')
    expect(validarTitulo('x'.repeat(121), 120)).toMatch(/no máximo 120/)
    expect(validarTitulo('Listas')).toBeNull()
  })

  it('link vazio é aceito (tira o link) e só https passa', () => {
    expect(validarLink('')).toBeNull()
    expect(validarLink('https://drive.google.com/abc')).toBeNull()
    expect(validarLink('http://exemplo.org')).toMatch(/https/)
    expect(validarLink('javascript:alert(1)')).toMatch(/https/)
    expect(validarLink('drive.google.com/abc')).toMatch(/link completo/)
  })

  it('ano letivo entre 2020 e 2100', () => {
    expect(validarAnoLetivo('2027')).toBeNull()
    expect(validarAnoLetivo('1999')).not.toBeNull()
    expect(validarAnoLetivo('20a7')).not.toBeNull()
  })
})
