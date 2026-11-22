import {
  agruparPorOferta,
  lerNomeDoSlide,
  montarEstrutura,
  planejarEnvioEmLote,
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
    expect(itens.find((i) => i.aula?.rotulo === 'I.2')?.aula?.temSlides).toBe(true)
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
