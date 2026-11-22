import { montarRelatorio, relatorioEmCsv, type EntregaDoRelatorio, type ExercicioDoRelatorio } from './relatorio'

const exercicios: ExercicioDoRelatorio[] = [
  { id: 1, titulo: 'Soma', linguagem: 'python', unidade: 1, aula: 2 },
  { id: 2, titulo: 'Média; notas', linguagem: 'python', unidade: 1, aula: 3 },
]
const alunos = [
  { alunoId: 'b', nome: 'Vega Fictícia' },
  { alunoId: 'a', nome: 'Atlas Inventado' },
]

function entrega(parte: Partial<EntregaDoRelatorio>): EntregaDoRelatorio {
  return {
    id: 1,
    exercicioId: 1,
    alunoId: 'a',
    tentativa: 1,
    testesCertos: 2,
    testesTotal: 2,
    nota: 10,
    situacao: 'confirmada',
    criadoEm: '2026-11-22T13:00:00Z',
    ...parte,
  }
}

describe('relatório do professor', () => {
  const r = montarRelatorio(alunos, exercicios, [
    entrega({ id: 1, tentativa: 1, testesCertos: 1, nota: 5, situacao: 'confirmada' }),
    entrega({ id: 2, tentativa: 2, nota: 10, situacao: 'a_confirmar' }),
    entrega({ id: 3, alunoId: 'b', exercicioId: 2, nota: 10, situacao: 'nao_confere' }),
  ])

  it('ordena por nome e usa a maior nota que conferiu', () => {
    expect(r.linhas.map((l) => l.nome)).toEqual(['Atlas Inventado', 'Vega Fictícia'])
    const [atlas, vega] = r.linhas
    expect(atlas?.celulas[0]).toMatchObject({ nota: 10, situacao: 'a_confirmar' })
    expect(atlas?.celulas[0]?.entregas.map((e) => e.tentativa)).toEqual([2, 1])
    expect(atlas?.celulas[1]).toMatchObject({ nota: null, situacao: 'sem_entrega' })
    expect(atlas).toMatchObject({ feitos: 1, media: 5 })
    expect(vega?.celulas[1]).toMatchObject({ nota: 0, situacao: 'nao_confere' })
    expect(vega).toMatchObject({ feitos: 1, media: 0 })
  })

  it('gera a planilha com ponto e vírgula e vírgula decimal', () => {
    const csv = relatorioEmCsv(r)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('Aluno;U1 A2: Soma;"U1 A3: Média; notas";Exercícios feitos;Média\r\n')
    expect(csv).toContain('Atlas Inventado;10,0;;1;5,0\r\n')
    expect(csv).toContain('Vega Fictícia;;0,0;1;0,0\r\n')
  })
})
