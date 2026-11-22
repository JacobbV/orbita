import type { Linguagem } from '../lab/linguagens'
import type { SituacaoDaEntrega } from './laboratorio'
import { carregarXpDaTurma } from './progresso'
import { supabase } from './supabase'

// Relatório do professor: entregas, notas e tentativas dos alunos de uma turma
// nos exercícios das aulas liberadas para ela.

export interface ExercicioDoRelatorio {
  id: number
  titulo: string
  linguagem: Linguagem
  unidade: number
  aula: number
}

export interface EntregaDoRelatorio {
  id: number
  exercicioId: number
  alunoId: string
  tentativa: number
  testesCertos: number
  testesTotal: number
  nota: number
  situacao: SituacaoDaEntrega
  criadoEm: string
}

export interface CelulaDoRelatorio {
  /** Entregas do aluno no exercício, da mais nova para a mais antiga. */
  entregas: EntregaDoRelatorio[]
  /** Maior nota entre as entregas que não foram marcadas como "não confere". */
  nota: number | null
  situacao: 'sem_entrega' | 'acertou' | 'parcial' | 'a_confirmar' | 'nao_confere'
}

export interface LinhaDoRelatorio {
  alunoId: string
  nome: string
  celulas: CelulaDoRelatorio[]
  feitos: number
  /** Média das notas, contando zero nos exercícios sem entrega. */
  media: number
}

export interface Relatorio {
  exercicios: ExercicioDoRelatorio[]
  linhas: LinhaDoRelatorio[]
}

function celula(entregas: EntregaDoRelatorio[]): CelulaDoRelatorio {
  if (entregas.length === 0) return { entregas, nota: null, situacao: 'sem_entrega' }
  const validas = entregas.filter((e) => e.situacao !== 'nao_confere')
  if (validas.length === 0) return { entregas, nota: 0, situacao: 'nao_confere' }
  const melhor = validas.reduce((a, b) => (b.nota > a.nota ? b : a))
  const acertou = melhor.testesTotal > 0 && melhor.testesCertos === melhor.testesTotal
  const situacao = melhor.situacao === 'a_confirmar' ? 'a_confirmar' : acertou ? 'acertou' : 'parcial'
  return { entregas, nota: melhor.nota, situacao }
}

/** Junta alunos, exercícios e entregas numa tabela, um aluno por linha. */
export function montarRelatorio(
  alunos: { alunoId: string; nome: string }[],
  exercicios: ExercicioDoRelatorio[],
  entregas: EntregaDoRelatorio[],
): Relatorio {
  const porChave = new Map<string, EntregaDoRelatorio[]>()
  for (const e of [...entregas].sort((a, b) => b.tentativa - a.tentativa)) {
    const chave = `${e.alunoId}:${e.exercicioId}`
    porChave.set(chave, [...(porChave.get(chave) ?? []), e])
  }
  const linhas = [...alunos]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((a) => {
      const celulas = exercicios.map((ex) => celula(porChave.get(`${a.alunoId}:${ex.id}`) ?? []))
      const soma = celulas.reduce((s, c) => s + (c.nota ?? 0), 0)
      return {
        alunoId: a.alunoId,
        nome: a.nome,
        celulas,
        feitos: celulas.filter((c) => c.situacao !== 'sem_entrega').length,
        media: exercicios.length > 0 ? Math.round((soma / exercicios.length) * 10) / 10 : 0,
      }
    })
  return { exercicios, linhas }
}

export async function carregarRelatorio(ofertaId: number): Promise<Relatorio> {
  const [alunos, liberadas] = await Promise.all([
    carregarXpDaTurma(ofertaId),
    supabase()
      .from('liberacoes')
      .select('aula:aulas!inner(id, numero, unidade:unidades!inner(numero), exercicios(id, titulo, linguagem, ordem))')
      .eq('turma_disciplina_id', ofertaId),
  ])
  if (liberadas.error) throw liberadas.error
  const exercicios = liberadas.data
    .flatMap(({ aula }) =>
      [...aula.exercicios]
        .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
        .map((e) => ({
          id: e.id,
          titulo: e.titulo,
          linguagem: e.linguagem as Linguagem,
          unidade: aula.unidade.numero,
          aula: aula.numero,
        })),
    )
    .sort((a, b) => a.unidade - b.unidade || a.aula - b.aula)

  let entregas: EntregaDoRelatorio[] = []
  if (exercicios.length > 0 && alunos.length > 0) {
    const { data, error } = await supabase()
      .from('entregas')
      .select('id, exercicio_id, aluno_id, tentativa, testes_certos, testes_total, nota, situacao, criado_em')
      .in(
        'exercicio_id',
        exercicios.map((e) => e.id),
      )
      .in(
        'aluno_id',
        alunos.map((a) => a.alunoId),
      )
    if (error) throw error
    entregas = data.map((e) => ({
      id: e.id,
      exercicioId: e.exercicio_id,
      alunoId: e.aluno_id,
      tentativa: e.tentativa,
      testesCertos: e.testes_certos,
      testesTotal: e.testes_total,
      nota: Number(e.nota),
      situacao: e.situacao as SituacaoDaEntrega,
      criadoEm: e.criado_em,
    }))
  }
  return montarRelatorio(alunos, exercicios, entregas)
}

export async function codigoDaEntrega(id: number): Promise<string> {
  const { data, error } = await supabase().from('entregas').select('codigo').eq('id', id).single()
  if (error) throw error
  return data.codigo
}

const numero = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Planilha para abrir no Excel ou no Google Planilhas (ponto e vírgula, vírgula decimal). */
export function relatorioEmCsv(r: Relatorio): string {
  const campo = (t: string) => (/[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t)
  const cabecalho = [
    'Aluno',
    ...r.exercicios.map((e) => `U${e.unidade} A${e.aula}: ${e.titulo}`),
    'Exercícios feitos',
    'Média',
  ]
  const linhas = r.linhas.map((l) => [
    l.nome,
    ...l.celulas.map((c) => (c.nota === null ? '' : numero(c.nota))),
    String(l.feitos),
    numero(l.media),
  ])
  return `﻿${[cabecalho, ...linhas].map((l) => l.map(campo).join(';')).join('\r\n')}\r\n`
}
