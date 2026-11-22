# Roteiro do Órbita

Lista viva do que já foi feito, do que falta e das ideias novas. Atualizada a cada etapa. A visão completa e as fases estão em [PROJETO.md](PROJETO.md).

Legenda: `[x]` feito · `[ ]` falta · 💡 ideia (ainda não decidida)

## Fase 1: login, aprovação e liberação de aulas (no ar)

Site: https://jacobbv.github.io/orbita/

### Feito

- [x] Base do site (Vite + React + TypeScript), tema galáxia e rodapé de créditos QYUDEV.
- [x] Banco no Supabase com regras de acesso (RLS) em todas as tabelas.
- [x] Cadastro só com e-mail `@academico.ifpb.edu.br`, confirmação por e-mail e recuperação de senha.
- [x] Campo obrigatório "Quem é você" (nome, turma, turno) no pedido de acesso.
- [x] Aprovação e recusa de alunos pelo professor, com motivo opcional e até 3 tentativas por turma.
- [x] Ponte de comando do aluno: aulas liberadas da turma, com links.
- [x] Painel do professor: pedidos, aulas (unidades, títulos, links, liberar e bloquear por turma) e turmas.
- [x] Testes do banco (pgTAP), da interface (Vitest) e de ponta a ponta (Playwright), rodando no GitHub a cada PR.
- [x] Publicação automática no GitHub Pages e migrations no Supabase da nuvem a cada merge na `main` (PRs #1 a #3).
- [x] Conta de professor criada.
- [x] Saudação "Olá, Prof. Jacó." (PR #4).
- [x] E-mails de confirmação, senha nova e troca de e-mail em português, com imagem do Órbita (PR #5).
- [x] Slides HTML das aulas no armazenamento privado (PR #6):
  - um arquivo `.html` por aula, enviado pelo painel, um por vez ou vários de uma vez pelo nome (`ALG_U1_A2.html`);
  - aluno abre só os slides das aulas liberadas para a turma dele, em tela própria com tela cheia;
  - professor abre qualquer slide a qualquer hora (modo apresentação).

### Proteção e apresentação dos slides (PR #7, no ar em 22/11)

- [x] Botões dos slides (Iniciar, Anterior, Próximo e setas) funcionando dentro do site.
- [x] Botão "▶ Apresentar" em cada aula com slides no painel, à vista mesmo com a aula bloqueada (dar aula antes de liberar).
- [x] Barreiras contra salvar os slides: sem botão direito, Ctrl+S, Ctrl+P, Ctrl+U, arrastar ou selecionar; impressão em branco.
- [x] Marca-d'água com nome completo e e-mail do aluno por cima do slide (o professor apresenta sem ela).
- [x] Envio em lote escolhendo a pasta inteira (com as subpastas das unidades).
- [x] Aviso que barra arquivo de outra disciplina no envio em lote (ex.: `DAW_...` com Algoritmos escolhido).

### Falta

- [ ] Enviar os slides de Algoritmos (24) e de Desenvolvimento Web (24) pelo painel publicado.
- [ ] Teste real com uma conta de aluno: cadastro, aprovação, aula liberada e slides.
- [ ] Slides de Fundamentos (ainda não feitos).

### Limites conhecidos

- Print de tela, foto com o celular e ferramentas de desenvolvedor do navegador não podem ser bloqueados por um site. A marca-d'água identifica de quem veio uma cópia.

## Fases 2 e 3: gamificação e laboratório (em andamento)

PR #8 (banco e XP na ponte) no ar em 22/11. O restante segue num PR novo, com um merge só no final.

- [x] Banco da gamificação e do laboratório, com testes (patentes, XP, medalhas, avatares, exercícios, testes ocultos e secretos, entregas).
- [x] Licença da arte original (todos os direitos reservados).
- [x] XP e patente na ponte do aluno, com aviso de conquista ao abrir uma aula.
- [x] Hangar: aluno e professor montam o boneco, com peças trancadas por XP.
- [x] Botão "Ver como aluno" no painel (aba Turmas), com a marca-d'água de exemplo nos slides.
- [x] Painel do professor: boneco do professor na ponte dos alunos, XP da turma e XP por participação (1 a 100 por vez, com motivo).
- [x] Medalhas na tela: arte própria em pixel art, últimas ganhas na ponte e página com as ganhas e as que faltam.
- [x] Arte original em pixel art aprovada (46 peças, aluno e professor).
- [x] Laboratório: editor de código e botões Rodar e Testar em Python, no navegador.
- [ ] Laboratório: professor cria exercícios; Entregar; reconferência.
- [ ] JavaScript, HTML e CSS; relatório do professor.

## Ideias

- 💡 **Avatar do professor** (pedido em 22/11): o professor também tem boneco em pixel art, montado por ele no Hangar, com visual de nerd (óculos, barba e roupas próprias), sem jaleco. Entra junto com o avatar dos alunos, na gamificação.

## Próximas fases (detalhes em PROJETO.md)

- [ ] Gamificação: XP, patentes, medalhas e avatar em pixel art no Hangar (plano junto com o laboratório em revisão, 22/11).
- [ ] Laboratório de código no navegador (Python com Pyodide; JavaScript, HTML e CSS em moldura isolada), junto com a gamificação; modo prova na Fase 4. Correção no servidor gratuito não cabe (Python gasta ~2,4 s de CPU para carregar, limite de 2 s): plano é corrigir no navegador com reconferência pelo professor.
- [ ] Java, C e C++ com servidor de execução, na Fase 5.
