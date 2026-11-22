import {
  agruparPorOferta,
  montarEstrutura,
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

describe('montarEstrutura', () => {
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
      { aula_id: 11, titulo: 'Material da aula', url: 'https://exemplo.org/a1', tipo: 'link' },
      { aula_id: 12, titulo: 'Arquivo', url: null, tipo: 'pdf' },
    ],
  })

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
