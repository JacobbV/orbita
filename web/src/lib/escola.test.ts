import { describe, expect, it } from 'vitest'
import { ESCADAS, SALAS, TILE } from '../arte/escola'
import {
  INICIO,
  acaoDaSala,
  andar,
  aulasLiberadas,
  caminho,
  escadaNoPonto,
  exerciciosLiberados,
  podeFicarEm,
  salaDoJogador,
  tileDoPonto,
  usarEscada,
  type Jogador,
} from './escola'
import type { DisciplinaDaPonte } from './ponte'

const sala = (id: string) => SALAS.find((s) => s.id === id)!
const centro = (id: string, andarDaSala: 'terreo' | 'superior' = 'terreo'): Jogador => {
  const s = sala(id)
  return { andar: andarDaSala, x: (s.x + s.w / 2) * TILE, y: (s.y + s.h / 2) * TILE, direcao: 'baixo' }
}

describe('andar pelo mapa', () => {
  it('o início fica num lugar livre do corredor', () => {
    expect(podeFicarEm(INICIO.andar, INICIO.x, INICIO.y)).toBe(true)
    expect(salaDoJogador(INICIO)).toBeUndefined()
  })

  it('a parede para o boneco', () => {
    let j: Jogador = { ...INICIO }
    for (let i = 0; i < 200; i++) j = andar(j, 0, -1, 0.05) // para cima: bate na parede das salas
    expect(j.y).toBeGreaterThan(6 * TILE + 8)
  })

  it('porta de sala escura é parede e de sala acesa deixa entrar', () => {
    const porta = (id: string) => {
      const s = sala(id)
      const x = (s.w >= 6 ? s.x + 1 : s.x + Math.floor((s.w - 1) / 2)) * TILE + 8
      return { x, y: (s.porta === 'norte' ? s.y - 1 : s.y + s.h) * TILE + 8 }
    }
    const aberta = porta('sala-8')
    const fechada = porta('sala-6')
    expect(podeFicarEm('terreo', aberta.x, aberta.y)).toBe(true)
    expect(podeFicarEm('terreo', fechada.x, fechada.y)).toBe(false)
  })

  it('reconhece a sala em que o boneco está, só se estiver acesa', () => {
    expect(salaDoJogador(centro('sala-7'))?.id).toBe('sala-7')
    expect(salaDoJogador(centro('sala-6'))).toBeUndefined()
  })
})

describe('escadas', () => {
  it('sobe e desce pela escada ligada', () => {
    const e = ESCADAS.find((x) => x.id === 'meio-t')!
    const na = { andar: 'terreo' as const, x: (e.x + 1) * TILE, y: (e.y + 1) * TILE, direcao: 'cima' as const }
    expect(escadaNoPonto(na)?.id).toBe('meio-t')
    const em = usarEscada(na, e)
    expect(em.andar).toBe('superior')
    expect(escadaNoPonto(em)?.id).toBe('meio-s')
    expect(usarEscada(em, ESCADAS.find((x) => x.id === 'meio-s')!).andar).toBe('terreo')
  })
})

describe('toque no chão', () => {
  it('acha o caminho até a sala 7 e não acha até uma sala escura', () => {
    const s7 = sala('sala-7')
    const rota = caminho('terreo', tileDoPonto(INICIO.x, INICIO.y), [s7.x + 1, s7.y + 1])
    expect(rota?.length).toBeGreaterThan(3)
    const s6 = sala('sala-6')
    expect(caminho('terreo', tileDoPonto(INICIO.x, INICIO.y), [s6.x + 1, s6.y + 1])).toBeNull()
  })

  it('no andar de cima chega ao laboratório de desenho CAD', () => {
    const cad = sala('lab-cad')
    expect(caminho('superior', [13, 9], [cad.x + 1, cad.y + 1])?.length).toBeGreaterThan(3)
  })
})

describe('o que cada sala abre', () => {
  it('sala de aula e biblioteca abrem aulas, laboratórios abrem exercícios', () => {
    expect(acaoDaSala(sala('sala-8')).tipo).toBe('aulas')
    expect(acaoDaSala(sala('biblioteca')).tipo).toBe('aulas')
    expect(acaoDaSala(sala('lab-1')).tipo).toBe('exercicios')
    expect(acaoDaSala(sala('lab-cad')).tipo).toBe('exercicios')
    expect(acaoDaSala(sala('copa')).tipo).toBe('nada')
  })

  const disciplina = {
    oferta: { id: 1 },
    unidades: [
      {
        id: 1, numero: 1, titulo: 'U1', liberadas: 2,
        aulas: [
          { id: 1, numero: 1, titulo: 'Primeira', liberada: true, liberadaEm: '2026-11-01T10:00:00Z', materiais: [], exercicios: [{ id: 9, titulo: 'Soma', dificuldade: 1 }] },
          { id: 2, numero: 2, titulo: 'Segunda', liberada: true, liberadaEm: '2026-11-02T10:00:00Z', materiais: [], exercicios: [] },
          { id: 3, numero: 3, titulo: 'Terceira', liberada: false, liberadaEm: null, materiais: [], exercicios: [{ id: 10, titulo: 'Oculto', dificuldade: 1 }] },
        ],
      },
    ],
  } as unknown as DisciplinaDaPonte

  it('lista só aulas e exercícios liberados, das aulas mais novas para as antigas', () => {
    expect(aulasLiberadas(disciplina).map((a) => a.id)).toEqual([2, 1])
    expect(exerciciosLiberados(disciplina).map((e) => e.id)).toEqual([9])
  })
})
