import { combinaComFiltro, contarPorSituacao, lerNota, notaFinal, statusDoAluno } from './entregas'

const base = { tentativa: 1, devolvidaEm: null, corrigidaEm: null }

describe('statusDoAluno', () => {
  it('sem entrega', () => {
    expect(statusDoAluno([])).toBe('sem_entrega')
  })

  it('entregue e ainda sem correção', () => {
    expect(statusDoAluno([base])).toBe('entregue')
  })

  it('corrigida quando o professor já escreveu a correção', () => {
    expect(statusDoAluno([{ ...base, corrigidaEm: '2026-11-27T12:00:00Z' }])).toBe('corrigida')
  })

  it('devolvida vale mais que corrigida', () => {
    expect(statusDoAluno([{ ...base, corrigidaEm: 'x', devolvidaEm: 'y' }])).toBe('devolvida')
  })

  it('olha só a entrega mais nova: depois de devolver, a nova entrega volta a "entregue"', () => {
    const antiga = { tentativa: 1, devolvidaEm: 'y', corrigidaEm: 'y' }
    const nova = { tentativa: 2, devolvidaEm: null, corrigidaEm: null }
    expect(statusDoAluno([antiga, nova])).toBe('entregue')
    expect(statusDoAluno([nova, antiga])).toBe('entregue')
  })
})

describe('notaFinal', () => {
  it('a nota do professor vale no lugar da dos testes', () => {
    expect(notaFinal({ nota: 5, notaProfessor: 8.5 })).toBe(8.5)
    expect(notaFinal({ nota: 5, notaProfessor: 0 })).toBe(0)
    expect(notaFinal({ nota: 5, notaProfessor: null })).toBe(5)
  })
})

describe('lerNota', () => {
  it('aceita ponto ou vírgula e uma casa decimal', () => {
    expect(lerNota('7,5')).toEqual({ ok: true, nota: 7.5 })
    expect(lerNota(' 10 ')).toEqual({ ok: true, nota: 10 })
    expect(lerNota('0')).toEqual({ ok: true, nota: 0 })
  })

  it('vazio quer dizer "vale a nota dos testes"', () => {
    expect(lerNota('')).toEqual({ ok: true, nota: null })
    expect(lerNota('  ')).toEqual({ ok: true, nota: null })
  })

  it('recusa nota fora de 0 a 10 ou que não é número', () => {
    for (const ruim of ['10,1', '11', '-1', 'abc', '7,55', '1,2,3']) expect(lerNota(ruim)).toEqual({ ok: false })
  })
})

describe('filtro das entregas por situação', () => {
  const dados = {
    alunos: [
      { alunoId: 'a1', nome: 'Ana Fictícia' },
      { alunoId: 'a2', nome: 'Bia Fictícia' },
      { alunoId: 'a3', nome: 'Caio Fictício' },
      { alunoId: 'a4', nome: 'Duda Fictícia' },
    ],
    exercicios: [{ id: 1 }, { id: 2 }],
    entregas: [
      { exercicioId: 1, alunoId: 'a1', tentativa: 1, devolvidaEm: null, corrigidaEm: null },
      { exercicioId: 1, alunoId: 'a2', tentativa: 1, devolvidaEm: null, corrigidaEm: '2026-11-09T10:00:00Z' },
      { exercicioId: 1, alunoId: 'a3', tentativa: 1, devolvidaEm: '2026-11-10T10:00:00Z', corrigidaEm: null },
      { exercicioId: 2, alunoId: 'a1', tentativa: 1, devolvidaEm: null, corrigidaEm: null },
    ],
  } as unknown as Parameters<typeof contarPorSituacao>[0]

  it('conta cada par aluno + exercício na sua situação', () => {
    expect(contarPorSituacao(dados)).toEqual({ todas: 8, entregue: 2, corrigida: 1, devolvida: 1, sem_entrega: 4 })
  })

  it('"todas" deixa tudo passar e os outros só a própria situação', () => {
    expect(combinaComFiltro('corrigida', 'todas')).toBe(true)
    expect(combinaComFiltro('corrigida', 'corrigida')).toBe(true)
    expect(combinaComFiltro('entregue', 'corrigida')).toBe(false)
  })
})
