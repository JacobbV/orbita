import { supabase } from './supabase'

// XP, patente e conquistas do aluno. O banco conta tudo; aqui só se lê e se
// avisa o que foi ganho.

export interface Progresso {
  xp: number
  nivel: number
  patente: string
  /** XP em que a patente atual começa. */
  xpDaPatente: number
  /** Próxima patente, ou null para quem já é Almirante Galáctico. */
  proxima: string | null
  xpDaProxima: number | null
}

export interface Ganho {
  quantidade: number
  descricao: string
}

export interface Conquista {
  xp: number
  ganhos: Ganho[]
  medalhas: string[]
  novaPatente: string | null
}

interface ProgressoDoBanco {
  xp: number
  nivel: number
  patente: string
  xp_da_patente: number
  proxima: string | null
  xp_da_proxima: number | null
}

interface ConquistaDoBanco {
  xp?: number
  ganhos?: Ganho[]
  medalhas?: string[]
  nova_patente?: string | null
}

export async function carregarProgresso(): Promise<Progresso> {
  const { data, error } = await supabase().rpc('meu_progresso')
  if (error) throw error
  const p = data as unknown as ProgressoDoBanco
  return {
    xp: p.xp,
    nivel: p.nivel,
    patente: p.patente,
    xpDaPatente: p.xp_da_patente,
    proxima: p.proxima,
    xpDaProxima: p.xp_da_proxima,
  }
}

/** Quanto da patente atual já foi percorrido, de 0 a 100. */
export function porcentagemDaPatente(p: Progresso): number {
  if (p.xpDaProxima === null) return 100
  const faixa = p.xpDaProxima - p.xpDaPatente
  return Math.max(0, Math.min(100, Math.round(((p.xp - p.xpDaPatente) / faixa) * 100)))
}

export function lerConquista(dados: unknown): Conquista {
  const c = (dados ?? {}) as ConquistaDoBanco
  return {
    xp: c.xp ?? 0,
    ganhos: c.ganhos ?? [],
    medalhas: c.medalhas ?? [],
    novaPatente: c.nova_patente ?? null,
  }
}

/** Avisa o banco que o aluno abriu a aula (slides ou link) e devolve o que ele ganhou. */
export async function registrarAbertura(aulaId: number): Promise<Conquista> {
  const { data, error } = await supabase().rpc('registrar_abertura_da_aula', { p_aula_id: aulaId })
  if (error) throw error
  return lerConquista(data)
}

// ---------------------------------------------------------------------------
// Aviso de conquista: qualquer tela anuncia, o aviso no canto mostra.
// ---------------------------------------------------------------------------

type Ouvinte = (c: Conquista) => void
const ouvintes = new Set<Ouvinte>()

export function anunciarConquista(c: Conquista) {
  if (c.xp === 0 && c.medalhas.length === 0 && !c.novaPatente) return
  for (const o of ouvintes) o(c)
}

export function ouvirConquistas(o: Ouvinte): () => void {
  ouvintes.add(o)
  return () => ouvintes.delete(o)
}

/** Registra a abertura sem atrapalhar o aluno se der erro (o XP é um extra). */
export function registrarAberturaEmSilencio(aulaId: number) {
  registrarAbertura(aulaId).then(anunciarConquista, () => {})
}

const NOMES_DAS_MEDALHAS: Record<string, string> = {
  'primeira-aula': 'Primeira Aula',
  maratonista: 'Maratonista',
  'unidade-completa': 'Unidade Completa',
  destaque: 'Destaque da Aula',
  explorador: 'Explorador',
  incansavel: 'Incansável',
  'disciplina-completa': 'Missão Cumprida',
  estilista: 'Estilista Espacial',
  'primeiro-codigo': 'Primeiro Código',
  'nota-dez': 'Nota Dez',
  'cacador-de-bugs': 'Caçador de Bugs',
  'mestre-dos-lacos': 'Mestre dos Laços',
  'programador-de-bordo': 'Programador de Bordo',
  cobrinha: 'Cobrinha',
  'ninho-de-cobras': 'Ninho de Cobras',
  'cobra-criada': 'Cobra Criada',
  'encantador-de-serpentes': 'Encantador de Serpentes',
  'destaque-triplo': 'Coroa de Estrelas',
  'estrela-em-ascensao': 'Estrela em Ascensão',
  colecionador: 'Colecionador',
}

/** Frases curtas do aviso, na ordem: XP, patente nova e medalhas. */
export function frasesDaConquista(c: Conquista): string[] {
  const frases: string[] = []
  if (c.xp > 0) frases.push(`+${c.xp} XP${c.ganhos.length === 1 ? ` · ${c.ganhos[0]?.descricao}` : ''}`)
  if (c.novaPatente) frases.push(`Nova patente: ${c.novaPatente}!`)
  for (const m of c.medalhas) frases.push(`Nova medalha: ${NOMES_DAS_MEDALHAS[m] ?? m}!`)
  return frases
}

// ---------------------------------------------------------------------------
// Painel do professor: XP da turma e XP manual (participação)
// ---------------------------------------------------------------------------

export interface XpDoAluno {
  alunoId: string
  nome: string
  apelido: string | null
  xp: number
  patente: string
}

/** Alunos aprovados de uma turma com XP e patente. Só o professor consegue. */
export async function carregarXpDaTurma(ofertaId: number): Promise<XpDoAluno[]> {
  const { data, error } = await supabase().rpc('xp_da_turma', { p_turma_disciplina_id: ofertaId })
  if (error) throw error
  return ((data ?? []) as { aluno_id: string; nome: string; apelido?: string | null; xp: number; patente: string }[]).map((l) => ({
    alunoId: l.aluno_id,
    nome: l.nome,
    apelido: l.apelido ?? null,
    xp: l.xp,
    patente: l.patente,
  }))
}

export const XP_MANUAL_MAXIMO = 100

export async function darXp(alunoId: string, quantidade: number, descricao: string): Promise<void> {
  const { error } = await supabase().rpc('dar_xp', {
    p_aluno_id: alunoId,
    p_quantidade: quantidade,
    p_descricao: descricao.trim(),
  })
  if (error) throw error
}
