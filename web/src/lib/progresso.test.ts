import { anunciarConquista, frasesDaConquista, lerConquista, ouvirConquistas, porcentagemDaPatente, type Progresso } from './progresso'

const base: Progresso = { xp: 175, nivel: 2, patente: 'Piloto', xpDaPatente: 100, proxima: 'Navegador', xpDaProxima: 250 }

describe('progresso do aluno', () => {
  it('calcula quanto da patente já foi percorrido', () => {
    expect(porcentagemDaPatente(base)).toBe(50)
    expect(porcentagemDaPatente({ ...base, xp: 100 })).toBe(0)
    expect(porcentagemDaPatente({ ...base, xp: 1500, proxima: null, xpDaProxima: null })).toBe(100)
  })

  it('lê a resposta do banco com valores padrão', () => {
    expect(lerConquista(null)).toEqual({ xp: 0, ganhos: [], medalhas: [], novaPatente: null })
    expect(
      lerConquista({ xp: 10, ganhos: [{ quantidade: 10, descricao: 'Primeira vez nesta aula' }], medalhas: ['primeira-aula'], nova_patente: 'Piloto' }),
    ).toEqual({ xp: 10, ganhos: [{ quantidade: 10, descricao: 'Primeira vez nesta aula' }], medalhas: ['primeira-aula'], novaPatente: 'Piloto' })
  })

  it('monta as frases do aviso: XP, patente e medalhas', () => {
    expect(
      frasesDaConquista({
        xp: 10,
        ganhos: [{ quantidade: 10, descricao: 'Primeira vez nesta aula' }],
        medalhas: ['primeira-aula'],
        novaPatente: 'Piloto',
      }),
    ).toEqual(['+10 XP · Primeira vez nesta aula', 'Nova patente: Piloto!', 'Nova medalha: Primeira Aula!'])
    expect(
      frasesDaConquista({
        xp: 40,
        ganhos: [
          { quantidade: 10, descricao: 'a' },
          { quantidade: 30, descricao: 'b' },
        ],
        medalhas: [],
        novaPatente: null,
      }),
    ).toEqual(['+40 XP'])
  })

  it('só anuncia quando há algo ganho', () => {
    const ouvinte = vi.fn()
    const parar = ouvirConquistas(ouvinte)
    anunciarConquista({ xp: 0, ganhos: [], medalhas: [], novaPatente: null })
    expect(ouvinte).not.toHaveBeenCalled()
    anunciarConquista({ xp: 10, ganhos: [], medalhas: [], novaPatente: null })
    expect(ouvinte).toHaveBeenCalledTimes(1)
    parar()
  })
})
