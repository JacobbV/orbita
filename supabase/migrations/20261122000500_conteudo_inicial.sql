-- =============================================================================
-- Conteúdo inicial: disciplinas, turmas, unidades e aulas
-- -----------------------------------------------------------------------------
-- Os títulos são provisórios e o professor edita tudo pelo painel.
-- Nenhum dado de aluno aqui (LGPD).
-- =============================================================================

insert into public.disciplinas (sigla, nome, descricao, ordem) values
  ('ALG', 'Algoritmos e Lógica de Programação',
   'Python do zero: entrada e saída, decisões, laços, listas, matrizes e funções.', 1),
  ('FUND', 'Fundamentos do Computador',
   'Hardware, sistemas numéricos, redes e topologias.', 2),
  ('WEB', 'Desenvolvimento de Aplicações Web',
   'HTML, CSS moderno, JavaScript, back-end e publicação.', 3);

-- Turmas do ano letivo 2026 (o professor muda o ano pelo painel).
insert into public.turmas (nome, serie, turno, ano_letivo) values
  ('1º INFO M', 1, 'manha', 2026),
  ('1º INFO V', 1, 'tarde', 2026),
  ('3º INFO M', 3, 'manha', 2026),
  ('3º INFO V', 3, 'tarde', 2026);

-- 1º ano: Algoritmos e Fundamentos. 3º ano: Web.
insert into public.turma_disciplinas (turma_id, disciplina_id)
select t.id, d.id
from public.turmas t
join public.disciplinas d
  on (t.serie = 1 and d.sigla in ('ALG', 'FUND'))
  or (t.serie = 3 and d.sigla = 'WEB');

-- Unidades (4 por disciplina)
insert into public.unidades (disciplina_id, numero, titulo)
select d.id, u.numero, u.titulo
from public.disciplinas d
join (values
  ('ALG', 1, 'Algoritmos, Python e entrada/saída'),
  ('ALG', 2, 'Decisões: if, elif e else'),
  ('ALG', 3, 'Repetição: while e for'),
  ('ALG', 4, 'Listas, matrizes e funções'),
  ('FUND', 1, 'Hardware'),
  ('FUND', 2, 'Sistemas numéricos'),
  ('FUND', 3, 'Redes de computadores'),
  ('FUND', 4, 'Topologias de rede'),
  ('WEB', 1, 'HTML: estrutura e semântica'),
  ('WEB', 2, 'CSS moderno'),
  ('WEB', 3, 'JavaScript no navegador'),
  ('WEB', 4, 'Back-end e publicação')
) as u (sigla, numero, titulo) on u.sigla = d.sigla;

-- Aulas: Algoritmos (24, títulos do protótipo) e Web (24, provisórios).
-- Fundamentos fica sem aulas: o professor cadastra pelo painel.
insert into public.aulas (unidade_id, numero, titulo)
select un.id, a.numero, a.titulo
from (values
  ('ALG', 1, 1, 'O que é um algoritmo?'),
  ('ALG', 1, 2, 'Do algoritmo ao programa'),
  ('ALG', 1, 3, 'Variáveis, constantes e tipos'),
  ('ALG', 1, 4, 'Operadores e expressões'),
  ('ALG', 1, 5, 'Entrada com input() e conversão'),
  ('ALG', 1, 6, 'Saída formatada e projeto'),
  ('ALG', 2, 1, 'Valores lógicos e comparação'),
  ('ALG', 2, 2, 'A decisão if e else'),
  ('ALG', 2, 3, 'Várias escolhas com elif'),
  ('ALG', 2, 4, 'Operadores lógicos'),
  ('ALG', 2, 5, 'Decisões aninhadas, match e ternário'),
  ('ALG', 2, 6, 'Projeto: sistema de pedidos'),
  ('ALG', 3, 1, 'Por que repetir? O laço while'),
  ('ALG', 3, 2, 'Contadores, acumuladores e sentinelas'),
  ('ALG', 3, 3, 'Validação, menus, break e continue'),
  ('ALG', 3, 4, 'O laço for e range'),
  ('ALG', 3, 5, 'Laços aninhados e clássicos'),
  ('ALG', 3, 6, 'Projeto: jogos e caixa do restaurante'),
  ('ALG', 4, 1, 'Listas (vetores)'),
  ('ALG', 4, 2, 'Algoritmos com listas'),
  ('ALG', 4, 3, 'Ordenação e busca'),
  ('ALG', 4, 4, 'Matrizes: listas de listas'),
  ('ALG', 4, 5, 'Algoritmos com matrizes'),
  ('ALG', 4, 6, 'Funções e projeto final'),
  ('WEB', 1, 1, 'Como a web funciona'),
  ('WEB', 1, 2, 'Estrutura de um documento HTML'),
  ('WEB', 1, 3, 'Textos, listas e links'),
  ('WEB', 1, 4, 'Imagens e mídia'),
  ('WEB', 1, 5, 'Tabelas e formulários'),
  ('WEB', 1, 6, 'HTML semântico e acessível'),
  ('WEB', 2, 1, 'Seletores e cascata'),
  ('WEB', 2, 2, 'Cores, fontes e unidades'),
  ('WEB', 2, 3, 'Modelo de caixa'),
  ('WEB', 2, 4, 'Flexbox'),
  ('WEB', 2, 5, 'Grid'),
  ('WEB', 2, 6, 'Layout responsivo'),
  ('WEB', 3, 1, 'Primeiros passos em JavaScript'),
  ('WEB', 3, 2, 'Decisões e repetições'),
  ('WEB', 3, 3, 'Funções e arrays'),
  ('WEB', 3, 4, 'O DOM: mexendo na página'),
  ('WEB', 3, 5, 'Eventos e formulários'),
  ('WEB', 3, 6, 'Buscando dados com fetch'),
  ('WEB', 4, 1, 'Cliente e servidor'),
  ('WEB', 4, 2, 'APIs e JSON'),
  ('WEB', 4, 3, 'Banco de dados na web'),
  ('WEB', 4, 4, 'Autenticação básica'),
  ('WEB', 4, 5, 'Publicando o site'),
  ('WEB', 4, 6, 'Projeto final')
) as a (sigla, unidade, numero, titulo)
join public.disciplinas d on d.sigla = a.sigla
join public.unidades un on un.disciplina_id = d.id and un.numero = a.unidade;
