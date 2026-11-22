import { describe, expect, it } from 'vitest'
import { generateStars, MAX_STARS, MAX_STARS_CELULAR, MIN_STARS, starCount } from './starfield'

describe('starCount', () => {
  it('usa poucas estrelas no celular', () => {
    expect(starCount(360, 800)).toBeLessThanOrEqual(MAX_STARS_CELULAR)
    expect(starCount(320, 568)).toBeGreaterThanOrEqual(MIN_STARS)
  })

  it('nunca passa do teto, nem em ultrawide', () => {
    expect(starCount(2560, 1440)).toBe(MAX_STARS)
    expect(starCount(5120, 2160)).toBe(MAX_STARS)
  })

  it('cresce com a tela entre celular e monitor', () => {
    expect(starCount(1280, 800)).toBeGreaterThan(starCount(393, 852))
  })

  it('devolve zero para tela sem tamanho', () => {
    expect(starCount(0, 800)).toBe(0)
  })
})

describe('generateStars', () => {
  it('gera o mesmo céu com a mesma semente', () => {
    expect(generateStars(10, 7)).toEqual(generateStars(10, 7))
  })

  it('mantém as posições dentro da tela (0 a 1)', () => {
    for (const s of generateStars(200)) {
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.x).toBeLessThan(1)
      expect(s.y).toBeGreaterThanOrEqual(0)
      expect(s.y).toBeLessThan(1)
    }
  })
})
