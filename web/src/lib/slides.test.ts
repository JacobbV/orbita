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
})
