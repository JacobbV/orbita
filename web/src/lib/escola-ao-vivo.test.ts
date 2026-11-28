import { describe, expect, it } from 'vitest'
import { MAX_COLEGAS, SUMIU_APOS_MS, lerColega, podarColegas, type Colega } from './escola-ao-vivo'

const cores = { pele: '#e8b48a', cabelo: '#222222', camisa: '#3e7bf0', calca: '#2a3160', calcado: '#2a2230', longo: false, careca: false, detalhe: null }
const msg = { id: 'a', apelido: 'Cometa Veloz', cores, andar: 'superior', x: 100, y: 80, direcao: 'baixo', quadro: 1, sentado: false }

describe('escola ao vivo', () => {
  it('lê uma posição válida', () => {
    const c = lerColega(msg, 10)
    expect(c?.apelido).toBe('Cometa Veloz')
    expect(c?.quadro).toBe(1)
    expect(c?.visto).toBe(10)
  })

  it('recusa mensagens fora do formato', () => {
    expect(lerColega(null, 0)).toBeNull()
    expect(lerColega({ ...msg, andar: 'subsolo' }, 0)).toBeNull()
    expect(lerColega({ ...msg, x: Number.NaN }, 0)).toBeNull()
    expect(lerColega({ ...msg, direcao: 'diagonal' }, 0)).toBeNull()
    expect(lerColega({ ...msg, cores: { ...cores, pele: 'red; background:url(x)' } }, 0)).toBeNull()
    expect(lerColega({ ...msg, id: 'x'.repeat(100) }, 0)).toBeNull()
  })

  it('segura a posição dentro do mapa e corta apelido comprido', () => {
    const c = lerColega({ ...msg, x: 99999, y: -5, apelido: 'a'.repeat(100) }, 0)
    expect(c?.x).toBe(2000)
    expect(c?.y).toBe(0)
    expect(c?.apelido.length).toBe(40)
  })

  it('tira quem ficou quieto e limita a quantidade', () => {
    const mapa = new Map<string, Colega>()
    const velho = lerColega({ ...msg, id: 'velho' }, 0)
    if (velho) mapa.set('velho', velho)
    for (let i = 0; i < MAX_COLEGAS + 5; i++) {
      const c = lerColega({ ...msg, id: `c${i}` }, 10_000 + i)
      if (c) mapa.set(c.id, c)
    }
    podarColegas(mapa, 10_000 + SUMIU_APOS_MS - 1)
    expect(mapa.has('velho')).toBe(false)
    expect(mapa.size).toBe(MAX_COLEGAS)
  })
})
