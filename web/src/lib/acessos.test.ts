import { situacaoDeAcesso } from './acessos'

const agora = new Date('2026-11-28T15:00:00Z')
const antes = (minutos: number) => new Date(agora.getTime() - minutos * 60_000).toISOString()

describe('situacaoDeAcesso', () => {
  it('online até 5 minutos', () => {
    expect(situacaoDeAcesso(antes(0), agora)).toEqual({ online: true, texto: 'online agora' })
    expect(situacaoDeAcesso(antes(4), agora).online).toBe(true)
    expect(situacaoDeAcesso(antes(5), agora).online).toBe(false)
  })

  it('diz há quanto tempo foi visto', () => {
    expect(situacaoDeAcesso(antes(12), agora).texto).toBe('visto há 12 min')
    expect(situacaoDeAcesso(antes(180), agora).texto).toBe('visto há 3 h')
    expect(situacaoDeAcesso(antes(60 * 24), agora).texto).toBe('visto há 1 dia')
    expect(situacaoDeAcesso(antes(60 * 24 * 3), agora).texto).toBe('visto há 3 dias')
  })

  it('sem registro', () => {
    expect(situacaoDeAcesso(null, agora)).toEqual({ online: false, texto: 'sem registro de acesso' })
  })
})
