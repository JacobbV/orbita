// Lista de recursos de terceiros. Sempre que entrar um novo, adicione aqui
// e também no CREDITS.md da raiz do repositório.

export interface Credito {
  nome: string
  autor: string
  link: string
  licenca: string
  uso: string
}

export const FONTES: Credito[] = [
  {
    nome: 'Inter',
    autor: 'Rasmus Andersson e The Inter Project Authors',
    link: 'https://github.com/rsms/inter',
    licenca: 'SIL Open Font License 1.1',
    uso: 'Texto e títulos',
  },
  {
    nome: 'JetBrains Mono',
    autor: 'JetBrains e The JetBrains Mono Project Authors',
    link: 'https://github.com/JetBrains/JetBrainsMono',
    licenca: 'SIL Open Font License 1.1',
    uso: 'Código',
  },
  {
    nome: 'Press Start 2P',
    autor: 'Cody "CodeMan38" Boisclair',
    link: 'https://fonts.google.com/specimen/Press+Start+2P',
    licenca: 'SIL Open Font License 1.1',
    uso: 'Detalhes em pixel (logo e selos)',
  },
  {
    nome: 'Fontsource',
    autor: 'Fontsource contributors',
    link: 'https://fontsource.org',
    licenca: 'MIT (pacotes); fontes com a licença de cada uma',
    uso: 'Empacota as fontes para hospedar no próprio site',
  },
]

export const BIBLIOTECAS: Credito[] = [
  {
    nome: 'React',
    autor: 'Meta Platforms e colaboradores',
    link: 'https://react.dev',
    licenca: 'MIT',
    uso: 'Interface do site',
  },
  {
    nome: 'React Router',
    autor: 'Remix Software e colaboradores',
    link: 'https://reactrouter.com',
    licenca: 'MIT',
    uso: 'Navegação entre páginas',
  },
  {
    nome: 'supabase-js',
    autor: 'Supabase',
    link: 'https://github.com/supabase/supabase-js',
    licenca: 'MIT',
    uso: 'Login, cadastro e acesso ao banco pelo site',
  },
  {
    nome: 'Vite',
    autor: 'Evan You e colaboradores',
    link: 'https://vite.dev',
    licenca: 'MIT',
    uso: 'Compilação do site',
  },
  {
    nome: 'TypeScript',
    autor: 'Microsoft',
    link: 'https://www.typescriptlang.org',
    licenca: 'Apache 2.0',
    uso: 'Linguagem do código',
  },
  {
    nome: 'Vitest e Testing Library',
    autor: 'Vitest team; Kent C. Dodds e colaboradores',
    link: 'https://vitest.dev',
    licenca: 'MIT',
    uso: 'Testes automáticos',
  },
  {
    nome: 'jsdom',
    autor: 'Colaboradores do jsdom',
    link: 'https://github.com/jsdom/jsdom',
    licenca: 'MIT',
    uso: 'Navegador simulado nos testes',
  },
  {
    nome: 'Oxlint',
    autor: 'Boshen e colaboradores do Oxc',
    link: 'https://oxc.rs',
    licenca: 'MIT',
    uso: 'Revisão automática do código (lint)',
  },
  {
    nome: 'Playwright',
    autor: 'Microsoft',
    link: 'https://playwright.dev',
    licenca: 'Apache 2.0',
    uso: 'Testes de ponta a ponta no navegador',
  },
  {
    nome: 'Supabase CLI',
    autor: 'Supabase',
    link: 'https://github.com/supabase/cli',
    licenca: 'MIT',
    uso: 'Banco local, migrations e testes',
  },
  {
    nome: 'pgTAP',
    autor: 'David E. Wheeler e colaboradores',
    link: 'https://pgtap.org',
    licenca: 'PostgreSQL License',
    uso: 'Testes das regras do banco',
  },
]

export const ARTE: Credito[] = [
  {
    nome: 'Céu de estrelas, planeta e ícone',
    autor: 'QYUDEV.',
    link: 'https://jacobbv.github.io',
    licenca: 'Arte original do projeto',
    uso: 'Fundo, ilustração da página inicial e favicon',
  },
]
