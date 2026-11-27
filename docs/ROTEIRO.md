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

## Fases 2 e 3: gamificação e laboratório (no ar)

PRs #8, #9 e #10 no ar em 22/11.

- [x] Banco da gamificação e do laboratório, com testes (patentes, XP, medalhas, avatares, exercícios, testes ocultos e secretos, entregas).
- [x] Licença da arte original (todos os direitos reservados).
- [x] XP e patente na ponte do aluno, com aviso de conquista ao abrir uma aula.
- [x] Hangar: aluno e professor montam o boneco, com peças trancadas por XP.
- [x] Botão "Ver como aluno" no painel (aba Turmas), com a marca-d'água de exemplo nos slides.
- [x] Painel do professor: boneco do professor na ponte dos alunos, XP da turma e XP por participação (1 a 100 por vez, com motivo).
- [x] Medalhas na tela: arte própria em pixel art, últimas ganhas na ponte e página com as ganhas e as que faltam.
- [x] 20 tipos de medalha: estudo (redondas), código (losango), especiais (escudo) e a série da cobra para Python (Cobrinha, Ninho de Cobras, Cobra Criada, Encantador de Serpentes).
- [ ] Ideia: medalhas de outras linguagens, HTML e CSS (pensar depois).
- [x] Arte original em pixel art aprovada (46 peças, aluno e professor).
- [x] Laboratório: editor de código e botões Rodar e Testar em Python, no navegador.
- [x] Laboratório: professor cria, edita e remove exercícios no painel, com testes visíveis, ocultos e secretos e saídas preenchidas pela solução.
- [x] Laboratório: Entregar (XP na hora, "a confirmar") e reconferência do professor com testes secretos.
- [x] Correção: remover aula ou exercício que já deu XP não falha mais; o XP fica com o aluno.
- [x] Laboratório de JavaScript (console.log, input() e prompt()) e de HTML e CSS (prévia ao vivo e testes por consulta: texto, propriedade CSS, atributo e contagem).
- [x] Relatório do professor: nota de cada aluno por exercício, tentativas, código de cada entrega e planilha (CSV).
- [x] Revisão final: maiúsculas acentuadas (Á, É, Ó...) inteiras nos selos em pixel, com fonte derivada da Press Start 2P (OFL).

## Modo Ninja e apelidos (PR #11, no ar)

- [x] Apelidos só por sorteio: nome + adjetivo de listas aprovadas (294 nomes, 155 adjetivos, mais de 45 mil combinações), com concordância de gênero e sem repetição entre contas. Não há campo para digitar.
- [x] Aluno sorteia na ponte (cartão aparece enquanto não tem apelido) e troca no Hangar.
- [x] Professor vê o apelido ao lado do nome (pedidos, XP da turma e relatório) e pode sortear outro ou apagar.
- [x] Apelido do professor no cartão "Comandante da nave".
- [x] Modo Ninja: botão no boneco do professor; ponte de qualquer turma com todas as aulas abertas, todas as medalhas acesas, exercícios para testar sem entregar e sem XP. Faixa no topo com "Sair do modo Ninja".
- [x] Boneco ninja separado, montado no Hangar ninja com qualquer peça e 5 peças só dele (capuz, máscara, traje, faixa e estrela).

## Fase 4: provas (branch `fase-4-provas`, em revisão)

- [x] P1 banco: provas, questões com peso, tentativas, respostas, saídas da aba e segunda chamada, com regras de acesso e horário conferidos no banco.
- [x] P2 painel: aba Provas com a lista, montar e editar prova (turma, horário de abrir e fechar, duração, regra de saída da aba), questões das aulas ou criadas só para a prova, peso e ordem; questões travadas depois que algum aluno começa.
- [x] P3 aluno: lista de provas na ponte; tela da prova com cronômetro, tela cheia, colar desligado no editor, registro de saída da aba (detecta e avisa, não impede), salvar resposta por questão, entrega com confirmação e encerramento por tempo ou por saídas.
- [x] P4 acompanhar a prova (atualiza sozinho): quem está fazendo, entregou ou não começou, saídas da aba com o tempo fora, código de cada resposta, segunda chamada por aluno, reconferência no navegador do professor com os testes secretos e publicação das notas (só depois de reconferir e sem ninguém fazendo).
- [x] P5 planilha da prova (CSV): uma linha por aluno com situação, como terminou, saídas da aba, nota de cada questão e nota final.

## Ideias

- 💡 **Avatar do professor** (pedido em 22/11): o professor também tem boneco em pixel art, montado por ele no Hangar, com visual de nerd (óculos, barba e roupas próprias), sem jaleco. Entra junto com o avatar dos alunos, na gamificação.

## Próximas fases (detalhes em PROJETO.md)

- [ ] Gamificação: XP, patentes, medalhas e avatar em pixel art no Hangar (plano junto com o laboratório em revisão, 22/11).
- [ ] Laboratório de código no navegador (Python com Pyodide; JavaScript, HTML e CSS em moldura isolada), junto com a gamificação; modo prova na Fase 4. Correção no servidor gratuito não cabe (Python gasta ~2,4 s de CPU para carregar, limite de 2 s): plano é corrigir no navegador com reconferência pelo professor.
- [ ] Java, C e C++ com servidor de execução, na Fase 5.
