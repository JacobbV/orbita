import { protegerSlides } from './slides'

describe('protegerSlides', () => {
  it('coloca as barreiras dentro do <head>, depois do doctype', () => {
    const html = protegerSlides('<!doctype html><html lang="pt-BR"><head><title>A</title></head><body>x</body></html>')
    expect(html.startsWith('<!doctype html><html lang="pt-BR"><head><style data-orbita-protecao>')).toBe(true)
    expect(html).toContain('<script data-orbita-protecao>')
    expect(html).toContain('contextmenu')
    expect(html).toContain('@media print')
    expect(html.endsWith('<title>A</title></head><body>x</body></html>')).toBe(true)
  })

  it('sem <head>, entra logo depois do <html> ou do doctype', () => {
    expect(protegerSlides('<html><body>x</body></html>')).toMatch(/^<html><style data-orbita-protecao>/)
    expect(protegerSlides('<!DOCTYPE html><p>x</p>')).toMatch(/^<!DOCTYPE html><style data-orbita-protecao>/)
  })

  it('fragmento solto recebe as barreiras no começo', () => {
    expect(protegerSlides('<h1>Slide</h1>')).toMatch(/^<style data-orbita-protecao>.*<h1>Slide<\/h1>$/s)
  })

  it('não confunde <header> com <head>', () => {
    const html = protegerSlides('<!doctype html><body><header>t</header></body>')
    expect(html.indexOf('data-orbita-protecao')).toBeLessThan(html.indexOf('<header>'))
    expect(html).toContain('<header>t</header>')
  })

  it('guarda no slide a ponte com a página: avisa o slide aberto e obedece "ir" e "mover"', () => {
    const html = protegerSlides('<!doctype html><html><head></head><body>x</body></html>')
    expect(html).toContain("orbita:'slide'")
    expect(html).toContain("d.orbita==='ir'")
    expect(html).toContain("d.orbita==='mover'")
    // Só atende a página em volta, nunca outra janela.
    expect(html).toContain('e.source!==parent')
  })
})

describe('protegerSlides: botão "Editar" do slide', () => {
  const base = '<!doctype html><html><head></head><body><button class="edit-toggle">Editar</button></body></html>'

  it('some para o aluno: esconde o botão e a tecla E deixa de abrir a edição', () => {
    const html = protegerSlides(base)
    expect(html).toContain('data-orbita-sem-editar')
    expect(html).toContain('.edit-hotzone,.edit-toggle{display:none!important}')
    expect(html).toContain("e.key==='e'")
    expect(html).toContain('stopImmediatePropagation')
  })

  it('continua para o professor', () => {
    expect(protegerSlides(base, { professor: true })).not.toContain('data-orbita-sem-editar')
    expect(protegerSlides(base, { professor: true })).toContain('data-orbita-protecao')
  })
})
