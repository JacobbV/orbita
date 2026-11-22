# Órbita

Plataforma de estudo para as turmas do IFPB Catolé do Rocha: aulas liberadas pelo professor, laboratório de código no navegador, XP e avatar em pixel art.

Fase 1 em construção (branch `fase-1-login`). Veja `docs/PROJETO.md` e o protótipo em `docs/prototipo/`.

## Rodar o site no computador

Precisa do Node.js 22 ou mais novo.

```bash
cd web
npm install
npm run dev      # abre em http://localhost:5173/orbita/
npm run lint     # revisão do código e checagem de tipos
npm test         # testes automáticos
npm run build    # gera a versão de publicação em web/dist
```

## Banco de dados (Supabase local)

Precisa do Docker rodando. Os comandos ficam na raiz do repositório.

```bash
npx supabase start      # sobe o Supabase local e aplica as migrations
npx supabase test db    # roda os testes das regras de acesso (RLS) em supabase/tests
npx supabase db reset   # apaga o banco local e aplica tudo de novo
npx supabase stop       # desliga
```

- `supabase/migrations/`: uma migration por mudança (tabelas, regras RLS, conteúdo inicial).
- `supabase/tests/database/`: testes pgTAP das regras de acesso.
- `supabase/scripts/tornar-professor.sql`: dá o papel de professor a uma conta (rodar no painel).

Desenvolvido por QYUDEV. — https://jacobbv.github.io
