import { describe, expect, it } from 'vitest'
import { ESCADAS, SALAS, montarGrade, portaDa, salasDo, type Andar, type Tile } from './escola'
import { coresDoMini, miniBonecoPixels } from './escola-boneco'
import { PADRAO_ALUNO } from './avatar'

const PASSA = new Set<Tile>(['c', 'p', 'f', 'n', 's', 'w', 'r', 'd'])

/** Tiles alcançáveis a partir do corredor de cima, sem atravessar portas trancadas. */
function alcancaveis(andar: Andar): Set<string> {
  const g = montarGrade(andar)
  const trancadas = new Set(salasDo(andar).filter((s) => !s.ativa).map((s) => portaDa(s).join(',')))
  const vistos = new Set<string>(['2,9'])
  const fila: [number, number][] = [[2, 9]]
  while (fila.length) {
    const [x, y] = fila.shift() ?? [0, 0]
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx
      const ny = y + dy
      const k = `${nx},${ny}`
      const t = g[ny]?.[nx]
      if (!t || vistos.has(k) || !PASSA.has(t) || trancadas.has(k)) continue
      vistos.add(k)
      fila.push([nx, ny])
    }
  }
  return vistos
}

describe('mapa da escola', () => {
  it.each(['terreo', 'superior'] as const)('no %s, toda sala acesa é alcançável e nenhuma escura é', (andar) => {
    const ok = alcancaveis(andar)
    for (const s of salasDo(andar)) {
      const dentro = ok.has(`${s.x + 1},${s.y + 1}`)
      expect(dentro, s.id).toBe(s.ativa)
    }
  })

  it('as escadas chegam e ligam os dois andares, em pares', () => {
    for (const e of ESCADAS) {
      expect(alcancaveis(e.andar).has(`${e.x},${e.y}`), e.id).toBe(true)
      const outra = ESCADAS.find((o) => o.id === e.liga)
      expect(outra?.liga).toBe(e.id)
      expect(outra?.andar).not.toBe(e.andar)
    }
  })

  it('tem as salas pedidas acesas', () => {
    const acesas = SALAS.filter((s) => s.ativa).map((s) => s.id).sort()
    expect(acesas).toEqual([
      'biblioteca', 'coord-info', 'copa', 'coped', 'lab-1', 'lab-2', 'lab-cad', 'lavanderia', 'leitura',
      'sala-1', 'sala-2', 'sala-3', 'sala-4', 'sala-5', 'sala-6', 'sala-7', 'sala-8', 'wc-fem', 'wc-masc',
    ])
  })
})

describe('mini-boneco', () => {
  it('copia as cores do boneco do Hangar', () => {
    const cores = coresDoMini({ ...PADRAO_ALUNO, 'parte-de-baixo': 'baixo-jeans-azul' })
    expect(cores.camisa).not.toBe(cores.pele)
    expect(cores.calca).not.toBe(cores.camisa)
    expect(cores.careca).toBe(false)
    expect(coresDoMini({ ...PADRAO_ALUNO, cabelo: 'cabelo-careca' }).careca).toBe(true)
    expect(coresDoMini({ ...PADRAO_ALUNO, cabelo: 'cabelo-longo' }).longo).toBe(true)
  })

  it('tem 14×19 pixels em toda direção e passo', () => {
    const cores = coresDoMini(PADRAO_ALUNO)
    for (const d of ['baixo', 'cima', 'esquerda', 'direita'] as const) for (const q of [0, 1, 2] as const) {
      const px = miniBonecoPixels(cores, d, q)
      expect(px).toHaveLength(19)
      for (const linha of px) expect(linha).toHaveLength(14)
    }
  })
})
