// Escola ao vivo: posição dos colegas pelo Realtime (Broadcast, canal privado "escola").
// Nada é gravado no banco. A mensagem leva só apelido, cores do boneco e posição.

import type { CoresMini } from '../arte/escola-boneco'
import type { Andar } from '../arte/escola'
import type { Direcao, Quadro } from '../arte/escola-boneco'
import { supabase } from './supabase'

export interface Colega {
  id: string
  /** Apelido sorteado; nunca o nome real. */
  apelido: string
  cores: CoresMini
  andar: Andar
  x: number
  y: number
  direcao: Direcao
  quadro: Quadro
  sentado: boolean
  /** performance.now() local da última mensagem. */
  visto: number
}

/** Quanto tempo sem notícia até o colega sumir do mapa. */
export const SUMIU_APOS_MS = 5000
/** Mais colegas que isso na tela não cabem: o resto some para o aparelho aguentar. */
export const MAX_COLEGAS = 60

const DIRECOES: readonly string[] = ['baixo', 'cima', 'esquerda', 'direita']

/** Lê uma mensagem do canal; devolve null se não parecer uma posição válida. */
export function lerColega(bruto: unknown, agora: number): Colega | null {
  if (!bruto || typeof bruto !== 'object') return null
  const m = bruto as Record<string, unknown>
  const cores = m.cores as Partial<CoresMini> | undefined
  if (typeof m.id !== 'string' || m.id.length > 64) return null
  if (typeof m.x !== 'number' || typeof m.y !== 'number' || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return null
  if (m.andar !== 'terreo' && m.andar !== 'superior') return null
  if (typeof m.direcao !== 'string' || !DIRECOES.includes(m.direcao)) return null
  if (!cores || typeof cores.pele !== 'string' || typeof cores.cabelo !== 'string' || typeof cores.camisa !== 'string' || typeof cores.calca !== 'string' || typeof cores.calcado !== 'string') return null
  const cor = (v: unknown) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)
  const pele = cor(cores.pele)
  const cabelo = cor(cores.cabelo)
  const camisa = cor(cores.camisa)
  const calca = cor(cores.calca)
  const calcado = cor(cores.calcado)
  if (!pele || !cabelo || !camisa || !calca || !calcado) return null
  return {
    id: m.id,
    apelido: typeof m.apelido === 'string' ? m.apelido.slice(0, 40) : 'Astronauta',
    cores: { pele, cabelo, camisa, calca, calcado, longo: cores.longo === true, careca: cores.careca === true, detalhe: cor(cores.detalhe) },
    andar: m.andar,
    x: Math.max(0, Math.min(2000, m.x)),
    y: Math.max(0, Math.min(2000, m.y)),
    direcao: m.direcao as Direcao,
    quadro: m.quadro === 1 || m.quadro === 2 ? m.quadro : 0,
    sentado: m.sentado === true,
    visto: agora,
  }
}

/** Tira quem ficou quieto por tempo demais e limita a quantidade. */
export function podarColegas(colegas: Map<string, Colega>, agora: number): void {
  for (const [id, c] of colegas) if (agora - c.visto > SUMIU_APOS_MS) colegas.delete(id)
  if (colegas.size > MAX_COLEGAS) {
    const ordem = [...colegas.values()].sort((a, b) => a.visto - b.visto)
    for (const c of ordem.slice(0, colegas.size - MAX_COLEGAS)) colegas.delete(c.id)
  }
}

/** Aula que o professor está transmitindo numa sala. Só leva o número: o título vem das aulas do próprio aluno. */
export interface AulaAoVivo {
  aulaId: number
  sala: string
  visto: number
}

/** A transmissão some se o professor ficar 15 s sem mandar o sinal. */
export const AULA_SUMIU_APOS_MS = 15000

export function lerAula(bruto: unknown, agora: number): AulaAoVivo | null {
  if (!bruto || typeof bruto !== 'object') return null
  const m = bruto as Record<string, unknown>
  if (typeof m.aulaId !== 'number' || !Number.isInteger(m.aulaId) || m.aulaId <= 0) return null
  if (typeof m.sala !== 'string' || !/^[a-z0-9-]{1,20}$/.test(m.sala)) return null
  return { aulaId: m.aulaId, sala: m.sala, visto: agora }
}

export interface MinhaPosicao {
  id: string
  apelido: string
  cores: CoresMini
  andar: Andar
  x: number
  y: number
  direcao: Direcao
  quadro: Quadro
  sentado: boolean
}

export interface CanalDaEscola {
  enviar: (p: MinhaPosicao) => void
  /** Professor: sinal da aula ao vivo (repetir a cada poucos segundos). */
  enviarAula: (aulaId: number, sala: string) => void
  fechar: () => void
}

/** Entra no canal. `falar` false: só escuta (Modo Ninja entra invisível). */
export function entrarNaEscola(
  meuId: string,
  aoReceber: (c: Colega) => void,
  falar: boolean,
  aoReceberAula: (a: AulaAoVivo) => void = () => {},
): CanalDaEscola {
  const cliente = supabase()
  const canal = cliente.channel('escola', { config: { private: true, broadcast: { self: false } } })
  canal.on('broadcast', { event: 'pos' }, ({ payload }) => {
    const c = lerColega(payload, performance.now())
    if (c && c.id !== meuId) aoReceber(c)
  })
  canal.on('broadcast', { event: 'aula' }, ({ payload }) => {
    const a = lerAula(payload, performance.now())
    if (a) aoReceberAula(a)
  })
  let pronto = false
  canal.subscribe((estado) => {
    pronto = estado === 'SUBSCRIBED'
  })
  return {
    enviar: (p) => {
      if (!falar || !pronto) return
      void canal.send({ type: 'broadcast', event: 'pos', payload: p })
    },
    enviarAula: (aulaId, sala) => {
      if (!pronto) return
      void canal.send({ type: 'broadcast', event: 'aula', payload: { aulaId, sala } })
    },
    fechar: () => {
      void cliente.removeChannel(canal)
    },
  }
}
