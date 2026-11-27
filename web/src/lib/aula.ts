import { numeroRomano } from './ponte'
import { BUCKET_MATERIAIS } from './professor'
import { protegerSlides } from './slides'
import { supabase } from './supabase'

// A página de uma aula: slides, "Nesta aula", exercícios, apostila e áudio. O
// banco só entrega o que o aluno pode ver (aula liberada para a turma dele, ou
// o professor); aqui só se junta o que chegou.

export interface ExercicioDaAula {
  id: number
  titulo: string
  dificuldade: number
  linguagem: string
}

export interface DadosDaAula {
  id: number
  /** "ALG · Unidade IV · Aula 1" */
  onde: string
  titulo: string
  topicos: string[]
  exercicios: ExercicioDaAula[]
  /** HTML dos slides, já com as barreiras (ou null se a aula não tem). */
  slides: string | null
  slidesId: number | null
  apostila: string | null
  /** Caminho do áudio no armazenamento (baixado só quando o aluno pede). */
  audio: string | null
}

export class AulaIndisponivel extends Error {
  constructor() {
    super('Esta aula não existe ou ainda não foi liberada para a sua turma.')
  }
}

interface AulaDoBanco {
  id: number
  numero: number
  titulo: string
  topicos: string[]
  unidade: { numero: number; disciplina: { sigla: string } }
  exercicios: Array<{ id: number; titulo: string; dificuldade: number; linguagem: string; ordem: number }>
  materiais: Array<{ id: number; tipo: string; caminho_storage: string | null }>
}

async function baixarTexto(caminho: string): Promise<string | null> {
  const { data, error } = await supabase().storage.from(BUCKET_MATERIAIS).download(caminho)
  if (error || !data) return null
  return protegerSlides(await data.text())
}

export async function carregarAula(aulaId: number, ehProfessor: boolean): Promise<DadosDaAula> {
  if (!Number.isInteger(aulaId) || aulaId <= 0) throw new AulaIndisponivel()
  const [aulaRes, liberacaoRes] = await Promise.all([
    supabase()
      .from('aulas')
      .select(
        'id, numero, titulo, topicos, unidade:unidades!inner(numero, disciplina:disciplinas!inner(sigla)), exercicios(id, titulo, dificuldade, linguagem, ordem), materiais(id, tipo, caminho_storage)',
      )
      .eq('id', aulaId)
      .maybeSingle(),
    supabase().from('liberacoes').select('aula_id').eq('aula_id', aulaId).limit(1),
  ])
  if (aulaRes.error) throw aulaRes.error
  if (liberacaoRes.error) throw liberacaoRes.error
  const aula = aulaRes.data as unknown as AulaDoBanco | null
  // Aula bloqueada nunca mostra conteúdo ao aluno.
  if (!aula || (!ehProfessor && liberacaoRes.data.length === 0)) throw new AulaIndisponivel()

  const material = (tipo: string) => aula.materiais.find((m) => m.tipo === tipo && m.caminho_storage)
  const slides = material('slide')
  const apostila = material('apostila')
  const [htmlSlides, htmlApostila] = await Promise.all([
    slides?.caminho_storage ? baixarTexto(slides.caminho_storage) : null,
    apostila?.caminho_storage ? baixarTexto(apostila.caminho_storage) : null,
  ])

  return {
    id: aula.id,
    onde: `${aula.unidade.disciplina.sigla} · Unidade ${numeroRomano(aula.unidade.numero)} · Aula ${aula.numero}`,
    titulo: aula.titulo,
    topicos: aula.topicos,
    exercicios: [...aula.exercicios]
      .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
      .map(({ id, titulo, dificuldade, linguagem }) => ({ id, titulo, dificuldade, linguagem })),
    slides: htmlSlides,
    slidesId: slides?.id ?? null,
    apostila: htmlApostila,
    audio: material('audio')?.caminho_storage ?? null,
  }
}

/** Baixa o áudio e devolve um endereço temporário para o player (não fica salvo em lugar nenhum). */
export async function carregarAudio(caminho: string): Promise<string> {
  const { data, error } = await supabase().storage.from(BUCKET_MATERIAIS).download(caminho)
  if (error || !data) throw new Error('Não foi possível carregar o áudio.')
  return URL.createObjectURL(new Blob([data], { type: 'audio/mpeg' }))
}
