import { describe, expect, it } from 'vitest'
import { ESCADAS, SALAS, TILE } from '../arte/escola'
import {
  INICIO,
  acaoDaSala,
  andar,
  assentoPerto,
  assentosDo,
  aulasLiberadas,
  avisosDoQuadro,
  caminho,
  escadaNoPonto,
  exerciciosLiberados,
  podeFicarEm,
  salaDoJogador,
  sentar,
  sinaisDoQuadro,
  tileDoPonto,
  usarEscada,
  type Jogador,
} from './escola'
import type { DisciplinaDaPonte } from './ponte'
import type { ProvaDoAluno } from './provas'

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

describe('móveis e cadeiras', () => {
  it('toda cadeira é um lugar livre e dá para chegar a ela andando', () => {
    for (const a of ['terreo', 'superior'] as const) {
      const lugares = assentosDo(a)
      expect(lugares.length).toBeGreaterThan(0)
      const origem: [number, number] = a === 'terreo' ? tileDoPonto(INICIO.x, INICIO.y) : [13, 9]
      for (const l of lugares) {
        expect(podeFicarEm(a, l.x, l.y), l.id).toBe(true)
        expect(caminho(a, origem, tileDoPonto(l.x, l.y)), l.id).not.toBeNull()
      }
    }
  })

  it('a mesa da sala barra o boneco e a cadeira fica ao lado dela', () => {
    const s = sala('sala-7')
    const mesa = { x: s.x * TILE + 10 + 9, y: s.y * TILE + 30 + 3 }
    expect(podeFicarEm('terreo', mesa.x, mesa.y)).toBe(false)
  })

  it('sentar prende o boneco na cadeira, olhando para a mesa; andar levanta', () => {
    const lugar = assentosDo('terreo')[0]!
    const j = sentar({ ...INICIO }, lugar)
    expect(j.sentado).toBe(lugar)
    expect(j.direcao).toBe(lugar.direcao)
    expect(andar(j, 1, 0, 0.05).sentado).toBeUndefined()
    expect(assentoPerto('terreo', lugar.x + 3, lugar.y)?.id).toBe(lugar.id)
    expect(assentoPerto('terreo', INICIO.x, INICIO.y)).toBeUndefined()
  })
})

describe('cadeira do professor', () => {
  it('há uma atrás do birô em cada sala, laboratório e coordenação, e dá para chegar nela', () => {
    for (const a of ['terreo', 'superior'] as const) {
      const origem: [number, number] = a === 'terreo' ? tileDoPonto(INICIO.x, INICIO.y) : [13, 9]
      const deles = assentosDo(a, true).filter((l) => l.professor)
      expect(deles.length).toBeGreaterThan(0)
      for (const l of deles) {
        expect(podeFicarEm(a, l.x, l.y), l.id).toBe(true)
        expect(caminho(a, origem, tileDoPonto(l.x, l.y)), l.id).not.toBeNull()
      }
    }
    const ids = [...assentosDo('terreo', true), ...assentosDo('superior', true)].filter((l) => l.professor).map((l) => l.id)
    expect(ids).toEqual(expect.arrayContaining(['sala-7-prof', 'sala-8-prof', 'coped-prof', 'coord-info-prof', 'lab-1-prof', 'lab-2-prof']))
  })

  it('o aluno não vê nem consegue sentar nela', () => {
    expect(assentosDo('terreo').some((l) => l.professor)).toBe(false)
    expect(assentosDo('superior').some((l) => l.professor)).toBe(false)
  })
})

describe('laboratório grande', () => {
  it('o Laboratório 1 tem lugar para uma turma de 40 junto com o Laboratório 2', () => {
    const lugares = assentosDo('superior')
    const doLab1 = lugares.filter((l) => l.id.startsWith('lab-1-'))
    expect(doLab1.length).toBe(25)
    expect(lugares.length).toBeGreaterThanOrEqual(40)
  })
})

describe('quadro de avisos', () => {
  it('há um sinal em cada sala de aula acesa do térreo e nenhum em cima', () => {
    expect(sinaisDoQuadro('terreo').map((x) => x.sala.id).sort()).toEqual(['sala-7', 'sala-8'])
    expect(sinaisDoQuadro('superior')).toHaveLength(0)
  })

  const prova = (id: number, abre: string, fecha: string, extra: Partial<ProvaDoAluno> = {}): ProvaDoAluno => ({
    id, titulo: `Prova ${id}`, instrucoes: '', abreEm: abre, fechaEm: fecha, duracaoMin: 50, saidasParaEncerrar: null,
    questoes: 3, comecouEm: null, terminaEm: null, entregueEm: null, encerradaPor: null, saidas: 0, nota: null, ...extra,
  })

  it('mostra só provas que ainda não passaram, da mais próxima para a mais longe', () => {
    const agora = new Date('2026-11-28T12:00:00Z').getTime()
    const lista = [
      prova(1, '2026-12-05T12:00:00Z', '2026-12-05T14:00:00Z'),
      prova(2, '2026-11-28T11:00:00Z', '2026-11-28T15:00:00Z'),
      prova(3, '2026-11-20T11:00:00Z', '2026-11-20T15:00:00Z'),
      prova(4, '2026-11-28T11:00:00Z', '2026-11-28T15:00:00Z', { entregueEm: '2026-11-28T11:30:00Z' }),
    ]
    const r = avisosDoQuadro([], lista, agora)
    expect(r.provas.map((p) => [p.id, p.estado])).toEqual([[2, 'aberta'], [1, 'antes']])
    expect(r.atividades).toEqual([])
  })
})
