-- =============================================================================
-- Catálogo das peças do avatar (primeiro lote, aprovado em 22/11/2026)
-- -----------------------------------------------------------------------------
-- O desenho de cada peça fica no site (web/src/arte/avatar.ts); aqui ficam o
-- nome, para quem é e o XP que abre. Arte original, todos os direitos
-- reservados (LICENCA-ARTE.md).
-- =============================================================================

insert into public.pecas (id, camada, nome, para, xp_minimo, ordem) values
  ('corpo-estreito', 'corpo', 'Estreito', 'todos', 0, 1),
  ('corpo-medio', 'corpo', 'Médio', 'todos', 0, 2),
  ('corpo-largo', 'corpo', 'Largo', 'todos', 0, 3),
  ('pele-1', 'pele', 'Tom 1', 'todos', 0, 4),
  ('pele-2', 'pele', 'Tom 2', 'todos', 0, 5),
  ('pele-3', 'pele', 'Tom 3', 'todos', 0, 6),
  ('pele-4', 'pele', 'Tom 4', 'todos', 0, 7),
  ('pele-5', 'pele', 'Tom 5', 'todos', 0, 8),
  ('pele-6', 'pele', 'Tom 6', 'todos', 0, 9),
  ('pele-7', 'pele', 'Tom 7', 'todos', 0, 10),
  ('pele-8', 'pele', 'Tom 8', 'todos', 0, 11),
  ('rosto-sorridente', 'rosto', 'Sorridente', 'todos', 0, 12),
  ('rosto-serio', 'rosto', 'Concentrado', 'todos', 0, 13),
  ('rosto-piscando', 'rosto', 'Piscando', 'todos', 0, 14),
  ('rosto-surpreso', 'rosto', 'Surpreso', 'todos', 100, 15),
  ('rosto-barba-e-oculos', 'rosto', 'Barba e óculos', 'professor', 0, 16),
  ('rosto-barba', 'rosto', 'Barba', 'professor', 0, 17),
  ('rosto-oculos', 'rosto', 'Óculos de nerd', 'professor', 0, 18),
  ('cabelo-curto', 'cabelo', 'Curto', 'todos', 0, 19),
  ('cabelo-franja', 'cabelo', 'Franja', 'todos', 0, 20),
  ('cabelo-longo', 'cabelo', 'Longo', 'todos', 0, 21),
  ('cabelo-cacheado', 'cabelo', 'Cacheado', 'todos', 0, 22),
  ('cabelo-raspado', 'cabelo', 'Raspado', 'todos', 0, 23),
  ('cabelo-rabo-de-cavalo', 'cabelo', 'Rabo de cavalo', 'todos', 0, 24),
  ('cabelo-coque', 'cabelo', 'Coque', 'todos', 100, 25),
  ('cabelo-arrepiado', 'cabelo', 'Arrepiado', 'todos', 250, 26),
  ('cabelo-preto', 'cor-do-cabelo', 'Preto', 'todos', 0, 27),
  ('cabelo-castanho', 'cor-do-cabelo', 'Castanho', 'todos', 0, 28),
  ('cabelo-loiro', 'cor-do-cabelo', 'Loiro', 'todos', 0, 29),
  ('cabelo-ruivo', 'cor-do-cabelo', 'Ruivo', 'todos', 0, 30),
  ('cabelo-grisalho', 'cor-do-cabelo', 'Grisalho', 'todos', 0, 31),
  ('cabelo-azul', 'cor-do-cabelo', 'Azul galáctico', 'todos', 500, 32),
  ('roupa-uniforme', 'roupa', 'Uniforme da nave', 'aluno', 0, 33),
  ('roupa-moletom', 'roupa', 'Moletom roxo', 'aluno', 0, 34),
  ('roupa-camiseta-estrela', 'roupa', 'Camiseta estrela', 'aluno', 100, 35),
  ('roupa-jaqueta-de-piloto', 'roupa', 'Jaqueta de piloto', 'aluno', 250, 36),
  ('roupa-cardiga', 'roupa', 'Cardigã e camisa xadrez', 'professor', 0, 37),
  ('roupa-camisa-xadrez', 'roupa', 'Camisa xadrez azul', 'professor', 0, 38),
  ('acessorio-oculos-redondos', 'acessorio', 'Óculos redondos', 'aluno', 0, 39),
  ('acessorio-fone', 'acessorio', 'Fone de ouvido', 'aluno', 0, 40),
  ('acessorio-bone', 'acessorio', 'Boné', 'aluno', 0, 41),
  ('acessorio-broche', 'acessorio', 'Broche de estrela', 'aluno', 100, 42),
  ('acessorio-visor', 'acessorio', 'Visor de piloto', 'aluno', 250, 43),
  ('acessorio-capacete', 'acessorio', 'Capacete espacial', 'aluno', 900, 44),
  ('acessorio-caneca', 'acessorio', 'Caneca de café', 'professor', 0, 45),
  ('acessorio-notebook', 'acessorio', 'Notebook com adesivos', 'professor', 0, 46)
on conflict (id) do update
  set camada = excluded.camada, nome = excluded.nome, para = excluded.para,
      xp_minimo = excluded.xp_minimo, ordem = excluded.ordem;
