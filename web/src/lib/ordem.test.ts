import { ordenarAlunos } from './ordem'

const alunos = [
  { nome: 'Zeca Lunar', xp: 10 },
  { nome: 'Átila Boreal', xp: 30 },
  { nome: 'bia Cometa', xp: 30 },
]

describe('ordenarAlunos', () => {
  it('por nome, sem ligar para acento e maiúscula', () => {
    expect(ordenarAlunos(alunos, 'nome').map((a) => a.nome)).toEqual(['Átila Boreal', 'bia Cometa', 'Zeca Lunar'])
  })

  it('por XP, do maior para o menor, desempatando pelo nome', () => {
    expect(ordenarAlunos(alunos, 'xp').map((a) => a.nome)).toEqual(['Átila Boreal', 'bia Cometa', 'Zeca Lunar'])
  })

  it('não muda a lista original', () => {
    const copia = [...alunos]
    ordenarAlunos(alunos, 'xp')
    expect(alunos).toEqual(copia)
  })
})
