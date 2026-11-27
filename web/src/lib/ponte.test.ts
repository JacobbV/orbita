import type { Pedido } from './api'
import { atividadesAbertas, aulaParaContinuar, montarPonte, numeroRomano, rotuloMaterial, situacaoNaPonte, type EntregaNaPonteDoBanco, type UnidadeDoBanco } from './ponte'

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
      { id: 2, aula_id: 11, tipo: 'slide', titulo: 'Slides da aula', url: null, caminho_storage: 'aulas/11/slides-1.html', ordem: 2 },
      { id: 5, aula_id: 11, tipo: 'slide', titulo: 'Sem arquivo', url: 'https://exemplo.org/s', caminho_storage: null, ordem: 3 },
      { id: 1, aula_id: 11, tipo: 'link', titulo: 'Apostila', url: 'https://exemplo.org/apostila', ordem: 1 },
      { id: 3, aula_id: 21, tipo: 'link', titulo: 'Inseguro', url: 'http://exemplo.org/x', ordem: 1 },
      { id: 6, aula_id: 21, tipo: 'apostila', titulo: 'Apostila da aula', url: null, caminho_storage: 'aulas/21/apostila-1.html', ordem: 2 },
      { id: 7, aula_id: 21, tipo: 'audio', titulo: 'Áudio da aula', url: null, caminho_storage: 'aulas/21/audio-1.mp3', ordem: 3 },
      { id: 4, aula_id: 22, tipo: 'link', titulo: 'Não deveria aparecer', url: 'https://exemplo.org/y', ordem: 1 },
    ],
    [
      { id: 8, aula_id: 11, titulo: 'Média', dificuldade: 2, ordem: 2 },
      { id: 7, aula_id: 11, titulo: 'Soma', dificuldade: 1, ordem: 1 },
      { id: 9, aula_id: 22, titulo: 'Escondido', dificuldade: 1, ordem: 1 },
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

  it('exercícios entram na ordem e só nas aulas liberadas', () => {
    expect(alg?.unidades[0]?.aulas[0]?.exercicios.map((e) => e.titulo)).toEqual(['Soma', 'Média'])
    expect(alg?.unidades[1]?.aulas[1]?.exercicios).toEqual([])
  })

  it('mantém a ordem dos materiais e descarta links sem https', () => {
    expect(alg?.unidades[0]?.aulas[0]?.materiais.map((m) => m.id)).toEqual([1, 2])
  })

  it('slides HTML viram material interno, sem link externo', () => {
    expect(alg?.unidades[0]?.aulas[0]?.materiais[1]).toEqual({ id: 2, tipo: 'slide', titulo: 'Slides da aula', url: null })
    expect(alg?.unidades[1]?.aulas[1]?.materiais).toEqual([])
  })

  it('apostila e áudio abrem na página da aula: um só botão por aula', () => {
    expect(alg?.unidades[1]?.aulas[0]?.materiais).toEqual([{ id: 6, tipo: 'slide', titulo: 'Apostila da aula', url: null }])
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
    expect(rotuloMaterial({ tipo: 'slide', titulo: ' ' })).toBe('Abrir a aula')
    expect(rotuloMaterial({ tipo: 'outro', titulo: '' })).toBe('Abrir material')
  })
})

describe('situacaoNaPonte', () => {
  const e = (extra: Partial<EntregaNaPonteDoBanco>) => ({
    exercicio_id: 1,
    tentativa: 1,
    nota: 5,
    nota_professor: null,
    comentario: null,
    corrigida_em: null,
    devolvida_em: null,
    ...extra,
  })

  it('sem entrega, nada aparece', () => {
    expect(situacaoNaPonte([])).toBeUndefined()
  })

  it('entregue, corrigida (com a nota do professor) e devolvida', () => {
    expect(situacaoNaPonte([e({})])).toEqual({ estado: 'entregue', nota: 5, comentario: null })
    expect(situacaoNaPonte([e({ corrigida_em: 'x', nota_professor: 8, comentario: 'Bom' })])).toEqual({
      estado: 'corrigida',
      nota: 8,
      comentario: 'Bom',
    })
    expect(situacaoNaPonte([e({ corrigida_em: 'x', devolvida_em: 'y' })])?.estado).toBe('devolvida')
  })

  it('vale a entrega mais nova: depois de refazer, volta a "entregue"', () => {
    const velha = e({ tentativa: 1, devolvida_em: 'y', corrigida_em: 'y' })
    const nova = e({ tentativa: 2 })
    expect(situacaoNaPonte([velha, nova])?.estado).toBe('entregue')
  })

  it('a ponte mostra a situação de cada exercício, só nos que o aluno entregou', () => {
    const [alg] = montarPonte(
      [pedidoAprovado(11, 1, 'Algoritmos')],
      unidades,
      [{ aula_id: 11, turma_disciplina_id: 11, liberado_em: '2026-11-02T10:00:00Z' }],
      [],
      [
        { id: 7, aula_id: 11, titulo: 'Soma', dificuldade: 1, ordem: 1 },
        { id: 8, aula_id: 11, titulo: 'Média', dificuldade: 2, ordem: 2 },
      ],
      [e({ exercicio_id: 7, corrigida_em: 'x', nota_professor: 9 })],
    )
    const [soma, media] = alg?.unidades[0]?.aulas[0]?.exercicios ?? []
    expect(soma?.entrega).toEqual({ estado: 'corrigida', nota: 9, comentario: null })
    expect(media?.entrega).toBeUndefined()
  })
})

describe('atividades abertas e continuar aula', () => {
  const exercicios = [
    { id: 1, aula_id: 11, titulo: 'Olá, nave', dificuldade: 1, ordem: 1 },
    { id: 2, aula_id: 11, titulo: 'Soma dupla', dificuldade: 2, ordem: 2 },
    { id: 3, aula_id: 21, titulo: 'Verdadeiro ou falso', dificuldade: 1, ordem: 1 },
    { id: 4, aula_id: 22, titulo: 'Aula ainda trancada', dificuldade: 1, ordem: 1 },
  ]
  const entrega = (exercicio_id: number, extra: Partial<EntregaNaPonteDoBanco> = {}): EntregaNaPonteDoBanco => ({
    exercicio_id,
    tentativa: 1,
    nota: 10,
    nota_professor: null,
    comentario: null,
    corrigida_em: null,
    devolvida_em: null,
    ...extra,
  })
  const disciplinas = montarPonte(
    [pedidoAprovado(11, 1, 'Algoritmos')],
    unidades,
    [
      { aula_id: 11, turma_disciplina_id: 11, liberado_em: '2026-11-02T10:00:00Z' },
      { aula_id: 21, turma_disciplina_id: 11, liberado_em: '2026-11-05T10:00:00Z' },
    ],
    [],
    exercicios,
    [entrega(1), entrega(2, { devolvida_em: '2026-11-08T10:00:00Z' })],
  )

  it('lista só o que falta fazer, com as devolvidas primeiro', () => {
    const abertas = atividadesAbertas(disciplinas)
    expect(abertas.map((a) => a.exercicio.id)).toEqual([2, 3])
    expect(abertas[0]).toMatchObject({ devolvida: true, rotuloDaAula: 'I.1', disciplina: 'Algoritmos' })
    expect(abertas[1]).toMatchObject({ devolvida: false, rotuloDaAula: 'II.1' })
  })

  it('exercício de aula bloqueada não aparece, e corrigido sai da lista', () => {
    const corrigidas = montarPonte(
      [pedidoAprovado(11, 1, 'Algoritmos')],
      unidades,
      [{ aula_id: 11, turma_disciplina_id: 11, liberado_em: '2026-11-02T10:00:00Z' }],
      [],
      exercicios,
      [entrega(1, { corrigida_em: '2026-11-09T10:00:00Z' })],
    )
    expect(atividadesAbertas(corrigidas).map((a) => a.exercicio.id)).toEqual([2])
  })

  it('continua da última aula aberta; sem ela, da última liberada', () => {
    expect(aulaParaContinuar(disciplinas, 11)).toMatchObject({ jaAberta: true, aula: { id: 11 } })
    expect(aulaParaContinuar(disciplinas, null)).toMatchObject({ jaAberta: false, aula: { id: 21 } })
    // Aula aberta que não está mais liberada: cai na última liberada.
    expect(aulaParaContinuar(disciplinas, 22)).toMatchObject({ jaAberta: false, aula: { id: 21 } })
    expect(aulaParaContinuar([], 11)).toBeNull()
  })
})
