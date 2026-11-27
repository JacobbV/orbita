import {
  acrescentarPonto,
  apagarPerto,
  daTelaParaOPalco,
  doPalcoParaATela,
  enquadrar,
  lerRabiscos,
  tamanhoDosRabiscos,
  type Traco,
} from './rabiscos'

const traco = (p: number[], extra: Partial<Traco> = {}): Traco => ({ c: '#e11d48', w: 8, t: 'l', p, ...extra })

describe('rabiscos: coordenadas do palco', () => {
  it('o palco de 1920 x 1080 ocupa a área toda quando ela é 16:9', () => {
    expect(enquadrar({ largura: 960, altura: 540 })).toEqual({ escala: 0.5, x: 0, y: 0 })
    expect(daTelaParaOPalco(480, 270, { largura: 960, altura: 540 })).toEqual([960, 540])
  })

  it('numa área mais larga, o palco fica centralizado e o rabisco continua no mesmo ponto do slide', () => {
    const area = { largura: 1920, altura: 540 }
    const { escala, x } = enquadrar(area)
    expect(escala).toBe(0.5)
    expect(x).toBe(480)
    // O meio do slide é o meio da área, em qualquer formato.
    expect(daTelaParaOPalco(960, 270, area)).toEqual([960, 540])
    expect(doPalcoParaATela(960, 540, area)).toEqual([960, 270])
  })

  it('ida e volta dá o mesmo ponto', () => {
    const area = { largura: 700, altura: 520 }
    const [tx, ty] = doPalcoParaATela(1234, 321, area)
    const [qx, qy] = daTelaParaOPalco(tx, ty, area)
    expect(Math.abs(qx - 1234)).toBeLessThanOrEqual(1)
    expect(Math.abs(qy - 321)).toBeLessThanOrEqual(1)
  })
})

describe('rabiscos: traços', () => {
  it('pontos muito perto do anterior não são guardados', () => {
    let t = traco([10, 10])
    t = acrescentarPonto(t, 11, 11)
    expect(t.p).toEqual([10, 10])
    t = acrescentarPonto(t, 30, 40)
    expect(t.p).toEqual([10, 10, 30, 40])
  })

  it('a borracha tira só o traço que ela toca', () => {
    const a = traco([0, 0, 100, 0])
    const b = traco([0, 500, 100, 500])
    const c = traco([300, 300])
    const lista = [a, b, c]
    expect(apagarPerto(lista, 50, 10, 20)).toEqual([b, c])
    expect(apagarPerto(lista, 300, 305, 20)).toEqual([a, b])
    expect(apagarPerto(lista, 900, 900, 20)).toBe(lista)
  })

  it('o marca-texto, mais largo, é apagado de mais longe', () => {
    const lapis = traco([0, 0, 100, 0], { w: 4 })
    const marca = traco([0, 0, 100, 0], { w: 4, t: 'm' })
    expect(apagarPerto([lapis], 50, 24, 20)).toEqual([lapis])
    expect(apagarPerto([marca], 50, 24, 20)).toEqual([])
  })

  it('calcula o tamanho do que vai para o banco', () => {
    expect(tamanhoDosRabiscos({})).toBe(2)
    expect(tamanhoDosRabiscos({ '1': [traco([1, 2])] })).toBeGreaterThan(20)
  })
})

describe('rabiscos: lê o que veio do banco', () => {
  it('aceita traços certos e descarta o resto', () => {
    const bom = { c: '#2563eb', w: 8, t: 'm', p: [1, 2, 3, 4] }
    const lido = lerRabiscos({
      '3': [bom, { c: 'vermelho', w: 8, t: 'l', p: [1, 2] }, { c: '#111827', w: 8, t: 'x', p: [1, 2] }, { c: '#111827', w: 8, t: 'l', p: [1] }, null],
      abc: [bom],
      '4': 'nada',
    })
    expect(lido).toEqual({ '3': [bom] })
  })

  it('formas erradas viram vazio', () => {
    expect(lerRabiscos(null)).toEqual({})
    expect(lerRabiscos([])).toEqual({})
    expect(lerRabiscos('x')).toEqual({})
  })
})
