# Órbita

Plataforma de estudo para as turmas do IFPB Catolé do Rocha: aulas liberadas pelo professor, laboratório de código no navegador, XP e avatar em pixel art.

Fase 1 em construção (branch `fase-1-login`). Veja `docs/PROJETO.md` e o protótipo em `docs/prototipo/`.

## Rodar o site no computador

Precisa do Node.js 22 ou mais novo.

```bash
cd web
npm install
cp .env.example .env.local   # depois preencha com a URL e a chave pública do Supabase
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

Com o Supabase local ligado, rode `npx supabase status` e copie `API_URL` e `ANON_KEY` para `web/.env.local`.
Os e-mails de confirmação e de nova senha do ambiente local aparecem no Mailpit: http://127.0.0.1:54324

- `supabase/migrations/`: uma migration por mudança (tabelas, regras RLS, conteúdo inicial).
- `supabase/tests/database/`: testes pgTAP das regras de acesso.
- `supabase/scripts/tornar-professor.sql`: dá o papel de professor a uma conta (rodar no painel).

## Testes de ponta a ponta (Playwright)

Rodam no navegador Chromium contra o Supabase local ligado (`npx supabase start`). O site sobe sozinho na porta 5173, e a chave pública e a chave de serviço do Supabase local são lidas na hora com `npx supabase status`, sem ir para nenhum arquivo.

```bash
cd web
npx playwright install chromium   # só na primeira vez
npm run e2e                       # todos os testes de ponta a ponta
npx playwright test e2e/fluxo-completo.spec.ts   # só o fluxo principal
```

- `web/e2e/fluxo-completo.spec.ts`: cadastro → confirmação do e-mail (pelo Mailpit) → recusa com motivo → novo pedido → aprovação → aula liberada com link → aluno abre → professor bloqueia.
- `web/e2e/larguras.spec.ts`: todas as telas em 320, 360, 393, 768, 1280, 1920 e 2560 px, sem rolagem horizontal, com o céu cobrindo a tela, alvos de toque de 44px ou mais e nenhum erro de JavaScript.

Os testes criam contas com nomes inventados e e-mails com um número da execução, então podem rodar várias vezes no mesmo banco local. `npx supabase db reset` limpa tudo.

Desenvolvido por QYUDEV. — https://jacobbv.github.io
