# Projeto Órbita — plataforma de estudo IFPB

21/11/2026 · Rameson Jacó

## Visão geral

Órbita (nome provisório) é uma plataforma web onde os alunos do Prof. Rameson Jacó estudam apostilas, slides, áudios e exercícios de código, com login aprovado pelo professor e gamificação em tema de galáxia com avatar em pixel art. Ela substitui o envio de arquivos pelo Google Sala de Aula: o professor divulga um link e libera o conteúdo aula por aula.

| Área | Quem acessa | O que tem |
| --- | --- | --- |
| Pública | Qualquer visitante | Página inicial, disciplinas, amostras de aulas, créditos |
| Aluno | Aluno aprovado na turma | Aulas liberadas, apostilas, áudios, laboratório, atividades, XP, avatar, ranking |
| Professor | Professor (você e, no futuro, quem assumir) | Turmas, aprovação de cadastros, liberação de conteúdo, atividades, relatórios |

Princípios:

- Nada privado no repositório público: apostilas, slides e áudios ficam no armazenamento privado.
- Funciona sem instalar nada: navegador no laboratório, no notebook ou no celular (prioridade computador, mas responsivo).
- Custo zero para começar; tudo com créditos de fonte e licença e a marca "Desenvolvido por QYUDEV.".
- Feita para durar além do contrato (jul/2027): o papel de professor é transferível.

## Arquitetura

O site é estático no GitHub Pages e conversa com o Supabase, que guarda login, banco e arquivos privados; o código dos alunos roda no próprio navegador.

_(Diagrama: arquitetura · site + Supabase. Está no documento original; não vem na exportação.)_

| Camada | Tecnologia | Por quê |
| --- | --- | --- |
| Front-end | Vite + React + TypeScript | Componentes reaproveitáveis (cards, avatar, editor); TS pega erro cedo |
| Estilo | CSS com variáveis (tema galáxia) | Sem dependência pesada; fácil de trocar tema |
| Hospedagem | GitHub Pages (repo JacobbV) | Grátis, já usado nos outros projetos |
| Login | Supabase Auth (e-mail + senha) | Cadastro, recuperação de senha, sessão |
| Banco | Supabase Postgres + RLS | Regras de acesso no banco, não só no site |
| Arquivos | Supabase Storage (bucket privado) | Slides, PDFs e áudios só com link assinado |
| Funções | Supabase Edge Functions | Aprovar aluno, corrigir prova, enviar e-mail |
| Editor de código | CodeMirror 6 | Leve, funciona no celular |
| Python no navegador | Pyodide | Roda Python sem servidor |
| JS / HTML / CSS | iframe isolado (sandbox) | Prévia ao vivo, sem risco para o site |
| Testes | Vitest + Playwright | Componentes e fluxos (login, liberar aula) |

Java, C e C++ precisam de um servidor de execução (ex.: Judge0) e ficam para a Fase 5. Plano gratuito do Supabase: conferir limites e regra de pausa por inatividade antes de lançar.

## Perfis e cadastro

Todo cadastro passa pela aprovação do professor; até lá, o aluno vê só o que é público.

_(Diagrama: cadastro · 4 passos, 1 decisão. Está no documento original; não vem na exportação.)_

O site só aceita e-mail que termina em @academico.ifpb.edu.br e manda um link de confirmação; o professor aprova em lote na tela Painel, e o aluno recusado continua com acesso público. Uma conta pode pedir mais de uma disciplina, e cada pedido é aprovado separado.

## Telas

São 16 telas em três áreas; o protótipo clicável mostra as principais do aluno e do professor.

| Área | Tela | O que mostra |
| --- | --- | --- |
| Pública | Início | Herói espacial, disciplinas, botões Entrar e Cadastrar |
| Pública | Disciplina (vitrine) | Ementa, unidades e 1 ou 2 aulas de amostra abertas |
| Pública | Cadastro | Nome, e-mail @academico.ifpb.edu.br, turma, disciplina, senha |
| Pública | Aguardando aprovação | Status do pedido; acesso só ao conteúdo público |
| Pública | Créditos | Fontes, bibliotecas, arte, licenças, QYUDEV. |
| Aluno | Ponte de comando (painel) | Avatar, XP, nível, sequência de dias, próxima aula, avisos |
| Aluno | Mapa da disciplina | Unidades como planetas, aulas como estações; bloqueadas com cadeado |
| Aluno | Aula | Slides em tela cheia, apostila da aula, áudio, exercícios |
| Aluno | Laboratório | Enunciado, editor, console, botão Testar |
| Aluno | Atividade / prova | Questões e código, cronômetro, aviso de saída de tela |
| Aluno | Hangar (avatar) | Montar o boneco, peças desbloqueadas por XP |
| Aluno | Ranking e medalhas | Ranking da turma (pode ser só apelido), conquistas |
| Professor | Painel | Pedidos pendentes, turmas, últimas entregas |
| Professor | Turma | Alunos, liberação de aulas por unidade, notas, XP |
| Professor | Conteúdo | Enviar slides HTML, PDFs, áudios; organizar por unidade e aula |
| Professor | Atividades e relatórios | Criar atividade, ver resultados por questão, alertas de saída de tela |

Modo apresentação: o professor abre qualquer slide em tela cheia direto da tela Turma, sem precisar liberar para os alunos antes.

## Banco de dados

São 13 tabelas no Postgres do Supabase; cada uma tem regras de acesso (RLS) que valem mesmo se alguém tentar burlar o site.

| Tabela | Campos principais | Quem lê / escreve |
| --- | --- | --- |
| profiles | id, nome, email, papel (aluno/professor), apelido, status (pendente/aprovado/recusado) | Próprio usuário; professor lê todos |
| disciplinas | id, nome, sigla, ano, publica | Todos leem; professor escreve |
| turmas | id, nome (ex.: 1º INFO M), ano\_letivo (2026, 2027), disciplina\_id | Professor |
| matriculas | aluno\_id, turma\_id, status | Aluno pede; professor aprova |
| unidades | id, disciplina\_id, numero, titulo | Todos leem |
| aulas | id, unidade\_id, numero, titulo, publica (amostra) | Todos leem o título |
| materiais | id, aula\_id, tipo (slide/pdf/audio/video/link), caminho no Storage | Só aluno com aula liberada ou pública |
| liberacoes | turma\_id, aula\_id, liberado\_em | Professor escreve; aluno lê a da sua turma |
| atividades | id, turma\_id, titulo, tipo, abre\_em, fecha\_em, modo\_prova | Professor |
| questoes | id, atividade\_id, enunciado, linguagem, testes (ocultos) | Professor; aluno vê só o enunciado |
| entregas | aluno\_id, questao\_id, codigo, nota, tentativas | Aluno escreve a sua; professor lê todas |
| eventos\_prova | aluno\_id, atividade\_id, tipo (saiu da tela, voltou), quando | Site grava; professor lê |
| xp\_eventos / avatar | aluno\_id, pontos, motivo / peças escolhidas | Aluno lê; função do servidor grava o XP |

O ano letivo fica na turma, então 1º INFO M 2026 e 1º INFO M 2027 convivem sem misturar alunos. O XP é gravado por função do servidor, para o aluno não se dar pontos pelo console do navegador.

## Gamificação e avatar

Cada aluno é um tripulante de uma nave: ganha XP estudando, sobe de patente e desbloqueia peças para o seu avatar em pixel art.

| Ação | XP |
| --- | --- |
| Abrir uma aula liberada pela primeira vez | 10 |
| Ouvir o áudio da aula até o fim | 10 |
| Acertar um exercício do laboratório | 20 a 50 (pela dificuldade) |
| Entregar atividade no prazo | 50 |
| Sequência de 5 dias estudando | 30 |
| Desafio da unidade (projeto) | 100 |

Valores iniciais, para ajustar depois de usar com uma turma.

Patentes por XP: Cadete, Piloto, Navegador, Engenheiro de Bordo, Comandante, Almirante Galáctico.

Medalhas (exemplos): Primeiro Hello World, Caçador de Bugs (10 erros corrigidos), Mestre dos Laços, Senhor das Matrizes, Pontual (5 entregas no prazo).

Avatar em camadas, montado no Hangar:

- Corpo: 3 formas (magro, médio, gordinho) e 2 alturas
- Pele: 8 tons
- Rosto: 4 formatos, 6 olhos, 4 bocas, sobrancelhas
- Cabelo: 12 estilos (liso, cacheado, crespo, tranças, black, raspado, coque, rabo…) em 10 cores
- Roupa: uniforme da nave, moletom, jaqueta, camiseta da turma; calças e tênis
- Acessórios: óculos, fone, boné, capacete espacial, mascote alienígena no ombro

Estilo: pixel art de traço limpo, sprite de 48×48 exibido em escala inteira (2×, 3×, 4×) com `image-rendering: pixelated`, para ficar nítido e nunca borrado. Nada de foto: o avatar é montado só com peças prontas.

Monstros da galáxia: chefes originais por unidade (ex.: o Bugzilla na Unidade I, a Hidra do If na II, o Verme do Loop Infinito na III, o Colosso de Matrizes na IV). Vencer o desafio da unidade “derrota” o chefe e dá uma peça rara.

## Laboratório de código e provas

O aluno programa dentro do site: enunciado em cima, editor no meio, console embaixo, e o botão Testar roda os casos de teste na hora.

1. O professor cria a questão com enunciado, código inicial e casos de teste (entrada → saída esperada), alguns visíveis e outros ocultos.
2. O aluno escreve e clica Testar: o Python roda no navegador (Pyodide) e mostra quais testes passaram.
3. Ao Entregar, o código vai para o banco e uma função do servidor confere os testes ocultos e dá a nota e o XP.
4. O professor vê no relatório o código de cada aluno, a nota e as tentativas.

Modo prova:

- Tela cheia ao começar e cronômetro visível.
- Se o aluno trocar de aba ou sair da janela, o site registra (horário e duração), avisa o aluno e alerta o professor no painel; o professor escolhe se encerra a prova na 1ª, 2ª ou 3ª saída.
- Colar texto de fora pode ser bloqueado no editor.
- Limite: o navegador detecta a saída, mas não a impede, e não enxerga celular ou outro computador. É alerta, não garantia.

Linguagens: Python, JavaScript, HTML e CSS desde a Fase 3 (no navegador); Java, C e C++ na Fase 5, com servidor de execução.

## Identidade visual

Galáxia escura com detalhes em neon suave e pixel art nítida; o texto continua liso e legível, com pixel só nos detalhes.

| Token | Cor | Uso |
| --- | --- | --- |
| Espaço | #0B0E1F | Fundo principal |
| Casco | #161B33 | Cartões e painéis |
| Borda | #2A3160 | Linhas e divisórias |
| Ciano QYUDEV | #22D3EE | Cor de destaque, links, botões |
| Nebulosa | #A78BFA | XP, níveis, conquistas |
| Estrela | #FBBF24 | Moedas, medalhas, avisos |
| Plasma | #F472B6 | Monstros, alertas de prova |
| Texto | #E5E7F5 | Texto principal |
| Texto suave | #9CA3C7 | Legendas |

Fontes (hospedadas no próprio site, sem depender de internet externa):

- Texto e títulos: Inter (SIL Open Font License).
- Código: JetBrains Mono (SIL Open Font License).
- Pixel só em detalhes pequenos (logo, selos de XP, placares): Press Start 2P (SIL Open Font License), nunca em parágrafos.

Arte: personagens, peças do avatar e monstros originais, desenhados para o projeto. Pacotes gratuitos só com licença que permita uso (CC0 do Kenney ou OpenGameArt, conferindo item por item), sempre listados na página Créditos com fonte, autor e licença, ao lado de “Desenvolvido por QYUDEV.” com o logo ciano linkando para jacobbv.github.io. Nada de personagens de jogos ou filmes conhecidos.

## Repositório, Git e deploy

Um repositório só no GitHub (JacobbV/orbita), com o site em `web/` e o banco em `supabase/`; o conteúdo das aulas nunca entra no repositório.

```text
orbita/
├─ web/                 site (Vite + React + TS)
│  ├─ src/pages/        Inicio, Cadastro, Painel, Mapa, Aula, Laboratorio, Hangar, Professor…
│  ├─ src/components/   Card, Avatar, Editor, Console, XpBar, Medalha…
│  ├─ src/lib/          supabase.ts, pyodide.ts, xp.ts
│  └─ public/sprites/   peças do avatar e monstros (originais)
├─ supabase/
│  ├─ migrations/       tabelas e regras RLS, uma migração por mudança
│  └─ functions/        aprovar-aluno, corrigir-entrega, dar-xp
├─ docs/                este plano, diagramas, decisões
├─ CREDITS.md           fontes, bibliotecas, arte, licenças
└─ CLAUDE.md            regras do projeto para o Claude Code
```

Fluxo de trabalho:

1. O Claude Code edita os arquivos numa branch (ex.: `fase-1-login`).
2. Você revisa, roda `git add`, `git commit` e `git push`.
3. Uma GitHub Action compila o site e publica no GitHub Pages; outra aplica as migrações no Supabase.
4. Commits pequenos e com mensagem clara: `feat: cadastro com e-mail acadêmico`, `fix: liberação por turma`.

Chaves: só a chave pública (anon) do Supabase vai no site; a chave de serviço fica nos segredos do GitHub e do Supabase, nunca em arquivo.

## Fases e cronograma

A Fase 1 já resolve o principal (acabar com o envio de arquivos) e pode estar em uso no começo do ano letivo de 2027.

_(Diagrama: fases · 5 etapas, 3 portões. Está no documento original; não vem na exportação.)_

Datas são uma proposta para ajustar ao calendário do campus e ao seu tempo livre; cada portão é um teste com alunos antes de seguir.

## Riscos, LGPD e continuidade

O maior risco não é técnico: são dados de alunos menores de idade e a plataforma precisar de alguém depois de jul/2027.

| Risco | O que fazer |
| --- | --- |
| Dados de menores (LGPD) | Guardar o mínimo (nome, e-mail acadêmico, turma); sem foto; termo de uso simples; conversar com a coordenação do IFPB antes de lançar |
| Ranking expõe alunos | Ranking por apelido, opção de sair do ranking |
| Contrato acaba em jul/2027 | Papel de professor transferível; manual curto em `docs/`; exportar notas em planilha |
| Plano gratuito pausado ou limitado | Conferir limites do Supabase; backup mensal do banco; plano pago se o uso crescer |
| Cola em prova | Alerta de saída de tela + testes ocultos corrigidos no servidor; prova valendo nota também presencial |
| Projeto grande demais | Fases curtas; cada fase já é usável em sala |
| Direitos autorais | Arte original ou licença conferida; página Créditos atualizada a cada peça nova |

Perguntas em aberto:

- O nome fica “Órbita” ou outro?
- A coordenação aceita uma plataforma pessoal com dados de alunos, ou prefere algo no domínio do IFPB?
- Importar alunos por planilha basta, ou vale tentar a integração com o Google Sala de Aula (exige autorização do Google)?
