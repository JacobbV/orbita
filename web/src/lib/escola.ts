import {
  ALTURA_MAPA,
  ESCADAS,
  LARGURA_MAPA,
  TILE,
  montarGrade,
  layoutDaSala,
  salasDo,
  type Andar,
  type Assento,
  type Escada,
  type Sala,
  type Tile,
} from '../arte/escola'
import { atividadesAbertas, type AtividadeAberta, type DisciplinaDaPonte } from './ponte'
import { estadoDaProvaDoAluno, type EstadoDaProvaDoAluno, type ProvaDoAluno } from './provas'

// Regras do mapa da escola virtual: onde o boneco pode pisar, caminho ao tocar
// no chão, escadas e o que cada sala abre. Tudo roda no navegador (degrau 1,
// sem servidor); as posições são em pixels do mapa (cada tile tem 16 px).

export type Direcao = 'baixo' | 'cima' | 'esquerda' | 'direita'

export interface Jogador {
  /** Cadeira em que está sentado (some ao andar). */
  sentado?: Assento | undefined
  andar: Andar
  /** Posição dos pés, em pixels do mapa. */
  x: number
  y: number
  direcao: Direcao
}

/** Onde o boneco começa: no corredor do térreo, perto da sala 8. */
export const INICIO: Jogador = { andar: 'terreo', x: 13 * TILE + 8, y: 9 * TILE + 8, direcao: 'baixo' }

/** Velocidade, em pixels do mapa por segundo. */
export const VELOCIDADE = 72

const GRADES: Record<Andar, Tile[][]> = { terreo: montarGrade('terreo'), superior: montarGrade('superior') }
const PISAVEIS = new Set<Tile>(['c', 'p', 'f', 'n', 's', 'w', 'r', 'd'])

function tileEm(andar: Andar, tx: number, ty: number): Tile | null {
  return GRADES[andar][ty]?.[tx] ?? null
}

function salaNoTile(andar: Andar, tx: number, ty: number): Sala | undefined {
  return salasDo(andar).find((s) => tx >= s.x && tx < s.x + s.w && ty >= s.y && ty < s.y + s.h)
}

/** A porta de uma sala escura é um tile de parede para quem anda. */
function portaTrancada(andar: Andar, tx: number, ty: number): boolean {
  return salasDo(andar).some((s) => !s.ativa && portaDoTile(s, tx, ty))
}

function portaDoTile(s: Sala, tx: number, ty: number): boolean {
  const px = s.w >= 6 ? s.x + 1 : s.x + Math.floor((s.w - 1) / 2)
  const py = s.porta === 'norte' ? s.y - 1 : s.y + s.h
  return tx === px && ty === py
}

export function tilePisavel(andar: Andar, tx: number, ty: number): boolean {
  const t = tileEm(andar, tx, ty)
  if (!t || !PISAVEIS.has(t)) return false
  if (t === 'r') return salaNoTile(andar, tx, ty)?.ativa ?? false
  if (t === 'd') return !portaTrancada(andar, tx, ty)
  return true
}

const SOLIDOS: Record<Andar, [number, number, number, number][]> = { terreo: [], superior: [] }
const ASSENTOS: Record<Andar, Assento[]> = { terreo: [], superior: [] }
for (const andarDaSala of ['terreo', 'superior'] as const) {
  for (const sala of salasDo(andarDaSala)) {
    if (!sala.ativa) continue
    const l = layoutDaSala(sala)
    SOLIDOS[andarDaSala].push(...l.solidos)
    ASSENTOS[andarDaSala].push(...l.assentos)
  }
}

export function assentosDo(andarDaSala: Andar): Assento[] {
  return ASSENTOS[andarDaSala]
}

/** Assento livre mais perto do ponto, até `alcance` pixels. */
export function assentoPerto(andarDaSala: Andar, x: number, y: number, alcance = 18): Assento | undefined {
  let melhor: Assento | undefined
  let dist = alcance
  for (const a of ASSENTOS[andarDaSala]) {
    const d = Math.hypot(a.x - x, a.y - y)
    if (d <= dist) {
      melhor = a
      dist = d
    }
  }
  return melhor
}

export function sentar(j: Jogador, assento: Assento): Jogador {
  return { ...j, x: assento.x, y: assento.y, direcao: assento.direcao, sentado: assento }
}

function batePeloMovel(andarDaSala: Andar, x: number, y: number): boolean {
  const x0 = x - 4
  const x1 = x + 4
  const y0 = y - 3
  const y1 = y
  return SOLIDOS[andarDaSala].some(([rx, ry, rw, rh]) => x0 < rx + rw && x1 > rx && y0 < ry + rh && y1 > ry)
}

/** Os pés ocupam uma caixinha de 8×4 px; ela não pode tocar tile bloqueado. */
export function podeFicarEm(andar: Andar, x: number, y: number): boolean {
  const xs = [x - 4, x + 3]
  const ys = [y - 3, y]
  for (const px of xs) for (const py of ys) {
    if (!tilePisavel(andar, Math.floor(px / TILE), Math.floor(py / TILE))) return false
  }
  return !batePeloMovel(andar, x, y)
}

/** Anda `dt` segundos na direção (dx, dy) (cada um de -1 a 1); desliza pelas paredes. */
export function andar(j: Jogador, dx: number, dy: number, dt: number): Jogador {
  if (dx === 0 && dy === 0) return j
  const norma = Math.hypot(dx, dy)
  const passo = VELOCIDADE * Math.min(dt, 0.05)
  const mx = (dx / norma) * passo
  const my = (dy / norma) * passo
  let { x, y } = j
  if (podeFicarEm(j.andar, x + mx, y)) x += mx
  if (podeFicarEm(j.andar, x, y + my)) y += my
  const direcao: Direcao = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'direita' : 'esquerda') : dy > 0 ? 'baixo' : 'cima'
  return { andar: j.andar, x, y, direcao }
}

// -----------------------------------------------------------------------------
// Escadas
// -----------------------------------------------------------------------------
export function escadaNoPonto(j: Pick<Jogador, 'andar' | 'x' | 'y'>): Escada | undefined {
  const tx = Math.floor(j.x / TILE)
  const ty = Math.floor((j.y - 1) / TILE)
  return ESCADAS.find((e) => e.andar === j.andar && tx >= e.x && tx < e.x + e.w && ty >= e.y && ty < e.y + e.h)
}

/** Sobe ou desce: o boneco aparece no meio da escada que liga ao outro andar. */
export function usarEscada(j: Jogador, escada: Escada): Jogador {
  const destino = ESCADAS.find((e) => e.id === escada.liga)
  if (!destino) return j
  return {
    andar: destino.andar,
    x: (destino.x + destino.w / 2) * TILE,
    y: (destino.y + destino.h / 2) * TILE,
    direcao: 'baixo',
  }
}

// -----------------------------------------------------------------------------
// Toque no chão: caminho mais curto entre tiles
// -----------------------------------------------------------------------------
export function tileDoPonto(x: number, y: number): [number, number] {
  return [Math.floor(x / TILE), Math.floor((y - 1) / TILE)]
}

/** Caminho (lista de tiles) do ponto atual até o tile de destino, ou null se não houver. */
export function caminho(andarAtual: Andar, de: [number, number], para: [number, number]): [number, number][] | null {
  if (!tilePisavel(andarAtual, para[0], para[1])) return null
  const chave = (x: number, y: number) => y * LARGURA_MAPA + x
  const veio = new Map<number, number>([[chave(de[0], de[1]), -1]])
  const fila: [number, number][] = [de]
  while (fila.length) {
    const [x, y] = fila.shift() ?? de
    if (x === para[0] && y === para[1]) {
      const rota: [number, number][] = []
      let k = chave(x, y)
      while (k !== -1) {
        rota.unshift([k % LARGURA_MAPA, Math.floor(k / LARGURA_MAPA)])
        k = veio.get(k) ?? -1
      }
      return rota.slice(1)
    }
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + ox
      const ny = y + oy
      if (nx < 0 || ny < 0 || nx >= LARGURA_MAPA || ny >= ALTURA_MAPA) continue
      const k = chave(nx, ny)
      if (veio.has(k) || !tilePisavel(andarAtual, nx, ny)) continue
      veio.set(k, chave(x, y))
      fila.push([nx, ny])
    }
  }
  return null
}

// -----------------------------------------------------------------------------
// O que cada sala abre
// -----------------------------------------------------------------------------
export function salaDoJogador(j: Pick<Jogador, 'andar' | 'x' | 'y'>): Sala | undefined {
  const [tx, ty] = tileDoPonto(j.x, j.y)
  const s = salaNoTile(j.andar, tx, ty)
  return s?.ativa ? s : undefined
}

export type AcaoDaSala =
  | { tipo: 'aulas'; titulo: string }
  | { tipo: 'exercicios'; titulo: string }
  | { tipo: 'link'; titulo: string; para: string; rotulo: string }
  | { tipo: 'nada'; texto: string }

export function acaoDaSala(sala: Sala): AcaoDaSala {
  switch (sala.tipo) {
    case 'sala':
      return { tipo: 'aulas', titulo: 'Aulas liberadas' }
    case 'biblioteca':
      return { tipo: 'aulas', titulo: 'Apostilas e slides das aulas liberadas' }
    case 'lab':
    case 'cad':
      return { tipo: 'exercicios', titulo: 'Exercícios das aulas liberadas' }
    case 'leitura':
      return { tipo: 'link', titulo: 'Sua estante', para: '/medalhas', rotulo: 'Ver minhas medalhas' }
    case 'coordenacao':
      return sala.id === 'coped'
        ? { tipo: 'link', titulo: 'Coordenação dos alunos', para: '/ponte', rotulo: 'Ir para a ponte de comando' }
        : { tipo: 'link', titulo: 'Coordenação de informática', para: '/hangar', rotulo: 'Ir para o Hangar' }
    default:
      return { tipo: 'nada', texto: 'Aqui não tem nada por enquanto.' }
  }
}

export interface AulaDaEscola {
  id: number
  rotulo: string
  titulo: string
}

/** Aulas liberadas de uma disciplina, da mais nova para a mais antiga. */
export function aulasLiberadas(d: DisciplinaDaPonte): AulaDaEscola[] {
  return d.unidades
    .flatMap((u) => u.aulas.filter((a) => a.liberada).map((a) => ({ u, a })))
    .sort((p, q) => (q.a.liberadaEm ?? '').localeCompare(p.a.liberadaEm ?? '') || q.a.id - p.a.id)
    .map(({ u, a }) => ({ id: a.id, rotulo: `Unidade ${u.numero} · Aula ${a.numero}`, titulo: a.titulo }))
}

export interface ExercicioDaEscola {
  id: number
  titulo: string
  rotulo: string
}

export function exerciciosLiberados(d: DisciplinaDaPonte): ExercicioDaEscola[] {
  return d.unidades.flatMap((u) =>
    u.aulas
      .filter((a) => a.liberada)
      .flatMap((a) => a.exercicios.map((e) => ({ id: e.id, titulo: e.titulo, rotulo: `Unidade ${u.numero} · Aula ${a.numero}` }))),
  )
}

// -----------------------------------------------------------------------------
// Quadro de avisos das salas de aula
// -----------------------------------------------------------------------------
/** Onde flutua o sinal de aviso: na parede, à direita do quadro. Só nas salas de aula acesas. */
export function sinaisDoQuadro(andarDaSala: Andar): { sala: Sala; x: number; y: number }[] {
  return salasDo(andarDaSala)
    .filter((sl) => sl.ativa && sl.tipo === 'sala')
    .map((sl) => ({ sala: sl, x: sl.x * TILE + 104, y: sl.y * TILE - 5 }))
}

export interface ProvaNoQuadro {
  id: number
  titulo: string
  abreEm: string
  fechaEm: string
  estado: Exclude<EstadoDaProvaDoAluno, 'entregue' | 'perdida'>
}

export interface AvisosDoQuadro {
  provas: ProvaNoQuadro[]
  atividades: AtividadeAberta[]
}

/** O que o quadro mostra: provas que ainda não passaram e exercícios por fazer. */
export function avisosDoQuadro(disciplinas: DisciplinaDaPonte[], provas: ProvaDoAluno[], agora = Date.now()): AvisosDoQuadro {
  const daProva: ProvaNoQuadro[] = []
  for (const p of provas) {
    const estado = estadoDaProvaDoAluno(p, agora)
    if (estado === 'entregue' || estado === 'perdida') continue
    daProva.push({ id: p.id, titulo: p.titulo, abreEm: p.abreEm, fechaEm: p.fechaEm, estado })
  }
  daProva.sort((a, b) => a.abreEm.localeCompare(b.abreEm))
  return { provas: daProva, atividades: atividadesAbertas(disciplinas) }
}
