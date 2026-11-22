import type { Pedido } from './api'
import { montarPonte, numeroRomano, rotuloMaterial, type UnidadeDoBanco } from './ponte'

// Dados inventados; nenhum nome ou turma real de aluno.
function pedidoAprovado(ofertaId: number, disciplinaId: number, nome: string): Pedido {
  return {
    id: ofertaId * 10,
    status: 'aprovado',
    tentativa: 1,
    motivoRecusa: null,
    quemEVoce: 'Tripulante Fictício, 1º INFO M, manhã',
    criadoEm: '2026-11-01T10:00:00Z',
    oferta: {
      id: ofertaId,
      turma: { id: 1, nome: '1º INFO M', turno: 'manha', anoLetivo: 2026 },
      disciplina: { id: disciplinaId, sigla: nome.slice(0, 3).toUpperCase(), nome },
    },
  }
}

const unidades: UnidadeDoBanco[] = [
  {
    id: 2,
    numero: 2,
    titulo: 'Decisões',
    disciplina_id: 1,
    aulas: [
      { id: 22, numero: 2, titulo: 'A decisão if e else' },
      { id: 21, numero: 1, titulo: 'Valores lógicos' },
    ],
  },
  {
    id: 1,
    numero: 1,
    titulo: 'Primeiros passos',
    disciplina_id: 1,
    aulas: [{ id: 11, numero: 1, titulo: 'O que é um algoritmo?' }],
  },
  { id: 9, numero: 1, titulo: 'Hardware', disciplina_id: 2, aulas: [] },
]

describe('montarPonte', () => {
  const [alg] = montarPonte(
    [pedidoAprovado(11, 1, 'Algoritmos')],
    unidades,
    [
      { aula_id: 11, turma_disciplina_id: 11, liberado_em: '2026-11-02T10:00:00Z' },
      { aula_id: 21, turma_disciplina_id: 11, liberado_em: '2026-11-05T10:00:00Z' },
      // Liberação de outra turma não vale para esta.
      { aula_id: 22, turma_disciplina_id: 12, liberado_em: '2026-11-06T10:00:00Z' },
    ],
    [
      { id: 2, aula_id: 11, tipo: 'slide', titulo: '', url: 'https://exemplo.org/slides', ordem: 2 },
      { id: 1, aula_id: 11, tipo: 'link', titulo: 'Apostila', url: 'https://exemplo.org/apostila', ordem: 1 },
      { id: 3, aula_id: 21, tipo: 'link', titulo: 'Inseguro', url: 'http://exemplo.org/x', ordem: 1 },
      { id: 4, aula_id: 22, tipo: 'link', titulo: 'Não deveria aparecer', url: 'https://exemplo.org/y', ordem: 1 },
    ],
  )

  it('ordena unidades e aulas pelo número', () => {
    expect(alg?.unidades.map((u) => u.numero)).toEqual([1, 2])
    expect(alg?.unidades[1]?.aulas.map((a) => a.numero)).toEqual([1, 2])
  })

  it('marca como liberadas só as aulas da turma do aluno', () => {
    expect(alg?.totalAulas).toBe(3)
    expect(alg?.totalLiberadas).toBe(2)
    const aula22 = alg?.unidades[1]?.aulas[1]
    expect(aula22?.liberada).toBe(false)
  })

  it('aula bloqueada não leva material nenhum', () => {
    expect(alg?.unidades[1]?.aulas[1]?.materiais).toEqual([])
  })

  it('mantém a ordem dos materiais e descarta links sem https', () => {
    expect(alg?.unidades[0]?.aulas[0]?.materiais.map((m) => m.id)).toEqual([1, 2])
    expect(alg?.unidades[1]?.aulas[0]?.materiais).toEqual([])
  })

  it('aponta a aula liberada mais recentemente', () => {
    expect(alg?.ultimaLiberada?.aula.id).toBe(21)
    expect(alg?.ultimaLiberada?.unidade.numero).toBe(2)
  })

  it('disciplina sem aulas fica vazia e sem destaque', () => {
    const [fund] = montarPonte([pedidoAprovado(21, 2, 'Fundamentos')], unidades, [], [])
    expect(fund?.unidades).toHaveLength(1)
    expect(fund?.totalAulas).toBe(0)
    expect(fund?.ultimaLiberada).toBeNull()
  })

  it('ordena as disciplinas pelo nome', () => {
    const lista = montarPonte(
      [pedidoAprovado(21, 2, 'Fundamentos'), pedidoAprovado(11, 1, 'Algoritmos')],
      unidades,
      [],
      [],
    )
    expect(lista.map((d) => d.oferta.disciplina.nome)).toEqual(['Algoritmos', 'Fundamentos'])
  })
})

describe('numeroRomano e rotuloMaterial', () => {
  it('converte o número da unidade', () => {
    expect([1, 2, 3, 4].map(numeroRomano)).toEqual(['I', 'II', 'III', 'IV'])
    expect(numeroRomano(13)).toBe('13')
  })

  it('usa o título do material ou um rótulo pelo tipo', () => {
    expect(rotuloMaterial({ tipo: 'link', titulo: 'Apostila' })).toBe('Apostila')
    expect(rotuloMaterial({ tipo: 'slide', titulo: ' ' })).toBe('Abrir slides')
    expect(rotuloMaterial({ tipo: 'outro', titulo: '' })).toBe('Abrir material')
  })
})
