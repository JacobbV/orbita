import { describe, expect, it } from 'vitest'
import { ALTURA_MEDALHA, LARGURA_MEDALHA, pixelsDaMedalha, retangulosDaMedalha, temArteDaMedalha } from './medalhas'
import migration from '../../../supabase/migrations/20261122001000_gamificacao.sql?raw'

describe('arte das medalhas', () => {
  it('toda medalha do banco tem desenho próprio', () => {
    const bloco = migration.slice(migration.indexOf('insert into public.medalhas'))
    const codigos = [...bloco.slice(0, bloco.indexOf(';')).matchAll(/\('([a-z0-9-]+)',/g)].map((m) => m[1] ?? '')
    expect(codigos).toEqual(['primeira-aula', 'maratonista', 'unidade-completa', 'destaque'])
    for (const c of codigos) expect(temArteDaMedalha(c)).toBe(true)
  })

  it('desenha na grade de 18×22, com contorno, e a apagada fica só em cinza', () => {
    const grade = pixelsDaMedalha('destaque')
    expect(grade).toHaveLength(ALTURA_MEDALHA)
    for (const linha of grade) expect(linha).toHaveLength(LARGURA_MEDALHA)
    expect(grade.flat()).toContain('#0b0e1c')
    expect(grade.flat()).toContain('#facc15')
    const apagada = pixelsDaMedalha('destaque', true).flat()
    expect(apagada).not.toContain('#facc15')
  })

  it('medalha desconhecida usa o desenho padrão e o SVG só tem retângulos', () => {
    expect(temArteDaMedalha('nao-existe')).toBe(false)
    const svg = retangulosDaMedalha('nao-existe')
    expect(svg).toMatch(/^(<rect x="\d+" y="\d+" width="\d+" height="1" fill="#[0-9a-f]{6}"\/>)+$/)
  })
})
