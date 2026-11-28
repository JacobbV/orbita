import type { Perfil } from './api'

export interface ItemDoMenu {
  para: string
  rotulo: string
  /** Some do topo em telas bem estreitas (o item continua no menu da conta). */
  secundario?: boolean
}

/** Rotas do sistema (depois de entrar). Nelas o topo mostra os menus do sistema. */
const PREFIXOS_DO_SISTEMA = [
  '/ponte',
  '/mapa',
  '/escola',
  '/hangar',
  '/medalhas',
  '/aguardando',
  '/aula/',
  '/exercicio/',
  '/prova/',
  '/slides/',
  '/professor',
  '/ninja',
]

export function ehRotaDoSistema(caminho: string): boolean {
  return PREFIXOS_DO_SISTEMA.some((p) => caminho === p || caminho.startsWith(p.endsWith('/') ? p : `${p}/`))
}

/** Menus do sistema de quem está logado. */
export function itensDoMenu(papel: Perfil['papel'], ninja: boolean): ItemDoMenu[] {
  if (ninja) {
    return [
      // O mesmo menu do aluno, mais a volta ao painel.
      { para: '/ninja', rotulo: 'Ponte' },
      { para: '/mapa', rotulo: 'Mapa' },
      { para: '/escola', rotulo: 'Escola', secundario: true },
      { para: '/hangar', rotulo: 'Hangar' },
      { para: '/medalhas', rotulo: 'Medalhas', secundario: true },
      { para: '/professor', rotulo: 'Painel', secundario: true },
    ]
  }
  if (papel === 'professor') {
    return [
      { para: '/professor', rotulo: 'Painel' },
      { para: '/hangar', rotulo: 'Hangar' },
      { para: '/medalhas', rotulo: 'Medalhas', secundario: true },
    ]
  }
  return [
    { para: '/ponte', rotulo: 'Ponte' },
    { para: '/mapa', rotulo: 'Mapa' },
    { para: '/escola', rotulo: 'Escola', secundario: true },
    { para: '/hangar', rotulo: 'Hangar' },
    { para: '/medalhas', rotulo: 'Medalhas', secundario: true },
  ]
}

/** Letra da bolinha de perfil: primeira letra do apelido, ou do nome. */
export function inicialDoPerfil(perfil: Pick<Perfil, 'nome' | 'apelido'> | null): string {
  const base = (perfil?.apelido ?? perfil?.nome ?? '').trim()
  return base ? base.slice(0, 1).toLocaleUpperCase('pt-BR') : '?'
}
