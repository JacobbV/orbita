import { describe, expect, it } from 'vitest'
import * as v1 from './legado/avatar-v1'
import { ALTURA, LADO, montarPixels, peca, type Escolhas } from './avatar'

// Cópia congelada da arte de 22/11/2026 (grade 48×52). Os bonecos já salvos
// têm de sair iguais, pixel por pixel, só 4 linhas mais abaixo na grade nova.

/** Converte as escolhas antigas para as camadas novas, como a migration faz no banco. */
function converter(antigo: v1.Escolhas): Escolhas {
  const { acessorio, ...resto } = antigo
  const novo: Escolhas = { base: 'base-masculina', altura: 'altura-media', 'parte-de-baixo': 'baixo-calca-marinho', pes: 'pes-tenis-branco', ...resto }
  const p = peca(acessorio)
  if (p) novo[p.camada] = p.id
  return novo
}

function igual(antigo: v1.Escolhas) {
  const velho = v1.montarPixels(antigo)
  const novo = montarPixels(converter(antigo))
  expect(novo).toHaveLength(ALTURA)
  for (let y = 0; y < 4; y++) expect(novo[y]?.every((c) => c === null)).toBe(true)
  for (let y = 0; y < v1.ALTURA; y++) {
    for (let x = 0; x < LADO; x++) {
      if (novo[y + 4]?.[x] !== velho[y]?.[x]) throw new Error(`pixel (${x}, ${y}) mudou em ${JSON.stringify(antigo)}`)
    }
  }
}

const CORPOS = ['corpo-estreito', 'corpo-medio', 'corpo-largo']

describe('bonecos antigos continuam iguais', () => {
  it('os três padrões', () => {
    igual(v1.PADRAO_ALUNO)
    igual(v1.PADRAO_PROFESSOR)
    igual(v1.PADRAO_NINJA)
  })

  it('cada peça antiga, em cada corpo antigo', () => {
    for (const corpo of CORPOS) {
      for (const p of v1.PECAS) {
        for (const padrao of [v1.PADRAO_ALUNO, v1.PADRAO_PROFESSOR]) igual({ ...padrao, corpo, [p.camada]: p.id })
      }
    }
  })

  it('combinações de pele, cabelo e cor', () => {
    const peles = v1.PECAS.filter((p) => p.camada === 'pele')
    const cores = v1.PECAS.filter((p) => p.camada === 'cor-do-cabelo')
    const cabelos = v1.PECAS.filter((p) => p.camada === 'cabelo')
    for (const corpo of CORPOS) for (const pele of peles) for (const cor of cores) for (const cabelo of cabelos) {
      igual({ ...v1.PADRAO_PROFESSOR, corpo, pele: pele.id, 'cor-do-cabelo': cor.id, cabelo: cabelo.id })
    }
  })
})
