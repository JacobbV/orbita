# Órbita — plataforma de estudo IFPB

Plataforma web para os alunos das disciplinas do Jacó (Rameson Jacó Gomes da Fonseca) no IFPB Catolé do Rocha. Tema galáxia, gamificação com avatar em pixel art.

## Leia antes de qualquer coisa
- docs/PROJETO.md: visão, arquitetura, fluxos, banco de dados, fases e riscos.
- docs/prototipo/: protótipo navegável das telas (arquivos .dc.html). Use como referência visual e de fluxo, não copie o código dele.

## Stack
- Front-end: Vite + React + TypeScript, deploy no GitHub Pages.
- Backend: Supabase (Auth, Postgres com RLS, Storage privado, Edge Functions).
- Python no navegador: Pyodide. JS/HTML/CSS: iframe sandbox.
- Editor: CodeMirror 6. Testes: Vitest e Playwright.
- CI: GitHub Actions para deploy do site e migrations do Supabase.

## Regras do projeto
- Cadastro só com e-mail @academico.ifpb.edu.br. O aluno entra em uma turma somente depois da aprovação do professor.
- Aulas são liberadas uma a uma pelo professor.
- Dados de alunos são de menores e ficam sob LGPD. Nunca use nomes reais, nunca coloque dados reais em seeds, fixtures ou exemplos.
- Modo prova: detecta saída da aba e avisa, mas não impede. Não prometa mais que isso na interface.
- Recursos de terceiros (fontes, ícones, sons, imagens): só licença livre (CC0, Kenney, OpenGameArt, OFL), com fonte e licença em CREDITS.md.
- Rodapé de créditos: "Desenvolvido por QYUDEV." com o logo ciano, linkando para https://jacobbv.github.io.
- Chaves: só a chave pública (anon) do Supabase vai no site. A chave de serviço fica nos segredos, nunca em arquivo.

## Git
- Cada fase tem a sua branch (Fase 1: `fase-1-login`). Push só nessa branch.
- Nunca faça push na main, nunca use force push e nunca apague branches.
- O merge na main é feito só pelo Jacó, depois de revisar.

## Commits
- O autor de todo commit é só o Jacó (Rameson Jacó), sem coautor.
- Não coloque linhas de atribuição ("Co-Authored-By", "Claude-Session", "Generated with Claude Code" ou parecidas) em commits, pull requests ou arquivos.
- Mensagens curtas, em português, no estilo `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`.

## Idioma
- Interface, comentários de negócio e documentação em português do Brasil.
- Nomes de código em inglês quando for padrão da linguagem.

## Fase atual
Fase 1: login, aprovação de alunos pelo professor e liberação de aulas. Veja a seção "Fases e cronograma" em docs/PROJETO.md.
