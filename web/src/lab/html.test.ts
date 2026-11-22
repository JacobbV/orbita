import { consultarPagina, lerConsulta, NENHUM_ELEMENTO } from './html'

function pagina(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('consultas da página HTML', () => {
  const doc = pagina(`
    <h1>  Minha   página </h1>
    <ul><li>um</li><li>dois</li></ul>
    <img src="gato.png" alt="Um gato">
  `)

  it('lê os quatro tipos de consulta', () => {
    expect(lerConsulta('h1')).toEqual({ tipo: 'texto', seletor: 'h1' })
    expect(lerConsulta('h1 | color')).toEqual({ tipo: 'css', seletor: 'h1', propriedade: 'color' })
    expect(lerConsulta('img @ alt')).toEqual({ tipo: 'atributo', seletor: 'img', atributo: 'alt' })
    expect(lerConsulta('contar li')).toEqual({ tipo: 'contar', seletor: 'li' })
  })

  it('texto sem espaços sobrando, atributo e contagem', () => {
    expect(consultarPagina(doc, 'h1')).toBe('Minha página')
    expect(consultarPagina(doc, 'img @ alt')).toBe('Um gato')
    expect(consultarPagina(doc, 'contar li')).toBe('2')
    expect(consultarPagina(doc, 'h2')).toBe(NENHUM_ELEMENTO)
  })

  it('seletor inválido vira erro claro', () => {
    expect(() => consultarPagina(doc, 'h1[')).toThrow('Seletor CSS inválido: h1[')
  })
})
