import { numeroRomano } from './ponte'
import { BUCKET_MATERIAIS } from './professor'
import { supabase } from './supabase'

// Abre os slides HTML de uma aula. O banco só entrega a linha do material e o
// arquivo para quem pode ver a aula (aluno aprovado com a aula liberada, ou o
// professor); aqui só se junta o que chegou.

export interface SlidesDaAula {
  id: number
  /** "ALG · Unidade IV · Aula 1" */
  onde: string
  titulo: string
  html: string
}

interface MaterialDoBanco {
  id: number
  tipo: string
  caminho_storage: string | null
  aula: {
    numero: number
    titulo: string
    unidade: { numero: number; disciplina: { sigla: string } }
  }
}

export class SlidesIndisponiveis extends Error {
  constructor() {
    super('Estes slides não existem ou ainda não foram liberados para a sua turma.')
  }
}

export async function carregarSlides(id: number): Promise<SlidesDaAula> {
  if (!Number.isInteger(id) || id <= 0) throw new SlidesIndisponiveis()
  const { data, error } = await supabase()
    .from('materiais')
    .select(
      'id, tipo, caminho_storage, aula:aulas!inner(numero, titulo, unidade:unidades!inner(numero, disciplina:disciplinas!inner(sigla)))',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  const material = data as unknown as MaterialDoBanco | null
  if (!material || material.tipo !== 'slide' || !material.caminho_storage) throw new SlidesIndisponiveis()

  const { data: arquivo, error: erroArquivo } = await supabase().storage.from(BUCKET_MATERIAIS).download(material.caminho_storage)
  if (erroArquivo || !arquivo) throw new SlidesIndisponiveis()

  const { aula } = material
  return {
    id: material.id,
    onde: `${aula.unidade.disciplina.sigla} · Unidade ${numeroRomano(aula.unidade.numero)} · Aula ${aula.numero}`,
    titulo: aula.titulo,
    html: await arquivo.text(),
  }
}
