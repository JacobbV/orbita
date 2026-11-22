import { describe, expect, it } from 'vitest'
import { ALTURA, LADO, PADRAO_ALUNO, PADRAO_NINJA, PADRAO_PROFESSOR, PECAS, montarPixels, retangulosSvg } from './avatar'
import primeiroLote from '../../../supabase/migrations/20261122001200_pecas_do_avatar.sql?raw'
import pecasNinja from '../../../supabase/migrations/20261122001900_modo_ninja.sql?raw'

const migration = primeiroLote + pecasNinja


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
})
