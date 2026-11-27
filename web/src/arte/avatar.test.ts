import { describe, expect, it } from 'vitest'
import { ALTURA, LADO, PADRAO_ALUNO, PADRAO_NINJA, PADRAO_PROFESSOR, PECAS, geometria, montarPixels, recorteDaCamada, retangulosSvg } from './avatar'
import hangarNovo from '../../../supabase/migrations/20261127000400_hangar_novo.sql?raw'

// O catálogo completo está na migration do Hangar novo.
const migration = hangarNovo


describe('arte do avatar', () => {
  it('cada peça tem id único e está no catálogo do banco com o mesmo XP', () => {
    const ids = PECAS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of PECAS) {
      expect(migration).toContain(`('${p.id}', '${p.camada}', `)
      expect(migration).toMatch(new RegExp(`\\('${p.id}', [^\\n]*'${p.para}', ${p.xpMinimo}, `))
    }
  })

  it('o boneco padrão do aluno só usa peças abertas para aluno com 0 XP', () => {
    for (const id of Object.values(PADRAO_ALUNO)) {
      const peca = PECAS.find((p) => p.id === id)
      expect(peca?.para).not.toBe('professor')
      expect(peca?.xpMinimo).toBe(0)
    }
  })

  it('o boneco padrão do aluno não usa peças do ninja', () => {
    for (const id of Object.values(PADRAO_ALUNO)) expect(PECAS.find((p) => p.id === id)?.para).not.toBe('ninja')
  })

  it('o ninja padrão usa capuz, máscara, traje e faixa', () => {
    const ninja = Object.values(PADRAO_NINJA).filter((id) => PECAS.find((p) => p.id === id)?.para === 'ninja')
    expect(ninja.sort()).toEqual(['acessorio-faixa-ninja', 'cabelo-capuz-ninja', 'rosto-ninja-mascara', 'roupa-traje-ninja'])
  })

  it('monta a grade 48×52 com contorno e cores da pele e do cabelo escolhidos', () => {
    const grade = montarPixels({ ...PADRAO_PROFESSOR, pele: 'pele-8', 'cor-do-cabelo': 'cabelo-ruivo' })
    expect(grade).toHaveLength(ALTURA)
    expect(grade[0]).toHaveLength(LADO)
    const cores = new Set(grade.flat())
    expect(cores).toContain('#5a3620') // pele 8
    expect(cores).toContain('#c4502a') // barba ruiva
    expect(cores).toContain('#0b0e1c') // contorno
  })

  it('peça de outra camada é ignorada', () => {
    const { roupa: _roupa, ...semRoupa } = PADRAO_ALUNO
    expect(retangulosSvg({ ...PADRAO_ALUNO, roupa: 'cabelo-longo' })).toBe(retangulosSvg(semRoupa))
  })

  it('cor livre pinta o cabelo e ignora cor fora do formato', () => {
    const cores = new Set(montarPixels({ ...PADRAO_ALUNO, 'cor-do-cabelo': 'cabelo-cor-livre', 'cor-livre': '#22aa88' }).flat())
    expect(cores).toContain('#22aa88')
    const invalida = new Set(montarPixels({ ...PADRAO_ALUNO, 'cor-do-cabelo': 'cabelo-cor-livre', 'cor-livre': 'red' }).flat())
    expect(invalida).not.toContain('red')
  })

  it('degradê usa as duas cores no cabelo longo', () => {
    const cores = new Set(montarPixels({ ...PADRAO_ALUNO, cabelo: 'cabelo-longo', 'cor-do-cabelo': 'cabelo-galaxia' }).flat())
    expect(cores).toContain('#6a3fd0')
    expect(cores).toContain('#22d3ee')
  })

  it('todas as combinações de corpo cabem na grade e têm os pés na mesma linha', () => {
    for (const base of ['base-masculina', 'base-feminina']) for (const altura of ['altura-baixa', 'altura-media', 'altura-alta'])
      for (const corpo of ['corpo-estreito', 'corpo-medio', 'corpo-gordinho', 'corpo-largo']) {
        const g = geometria({ base, altura, corpo })
        expect(g.be).toBeGreaterThan(0)
        expect(g.bd + g.braco).toBeLessThan(LADO)
        const grade = montarPixels({ ...PADRAO_ALUNO, base, altura, corpo, cabelo: 'cabelo-moicano', 'acessorio-cabeca': 'acessorio-capacete' })
        expect(grade[52]?.some((c) => c === '#f4f6fb')).toBe(true) // tênis branco
        expect(grade[0]?.every((c) => c === null || c === '#0b0e1c')).toBe(true) // nada cortado em cima
      }
  })

  it('cada peça tem um quadradinho de prévia recortado dentro da grade', () => {
    for (const p of PECAS) {
      const r = recorteDaCamada(p.camada, PADRAO_ALUNO)
      if (!r) continue
      expect(r[0]).toBeGreaterThanOrEqual(0)
      expect(r[0] + r[2]).toBeLessThanOrEqual(LADO)
    }
  })
})
