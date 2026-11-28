import { describe, expect, it } from 'vitest'
import { ehRotaDoSistema, inicialDoPerfil, itensDoMenu } from './menu'

describe('menu do sistema', () => {
  it('reconhece as rotas do sistema e as públicas', () => {
    for (const r of ['/ponte', '/hangar', '/professor', '/professor/xp/3', '/aula/9', '/exercicio/2', '/ninja', '/mapa']) {
      expect(ehRotaDoSistema(r), r).toBe(true)
    }
    for (const r of ['/', '/creditos', '/entrar', '/cadastro', '/ponteira', '/aulas']) {
      expect(ehRotaDoSistema(r), r).toBe(false)
    }
  })

  it('aluno vê Ponte, Mapa, Escola, Hangar e Medalhas', () => {
    expect(itensDoMenu('aluno', false).map((i) => i.rotulo)).toEqual(['Ponte', 'Mapa', 'Escola', 'Hangar', 'Medalhas'])
  })

  it('professor vê o Painel e, no Modo Ninja, a ponte ninja', () => {
    expect(itensDoMenu('professor', false)[0]).toEqual({ para: '/professor', rotulo: 'Painel' })
    expect(itensDoMenu('professor', true)[0]).toEqual({ para: '/ninja', rotulo: 'Ponte' })
  })

  it('no Modo Ninja o menu tem tudo do aluno, mais o Painel', () => {
    expect(itensDoMenu('professor', true).map((i) => i.para)).toEqual(['/ninja', '/mapa', '/escola', '/hangar', '/medalhas', '/professor'])
  })

  it('a bolinha usa a inicial do apelido, ou do nome', () => {
    expect(inicialDoPerfil({ nome: 'ana lima', apelido: 'Cometa Veloz' })).toBe('C')
    expect(inicialDoPerfil({ nome: 'ana lima', apelido: null })).toBe('A')
    expect(inicialDoPerfil(null)).toBe('?')
  })
})
