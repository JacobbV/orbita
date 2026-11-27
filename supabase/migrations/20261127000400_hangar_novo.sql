-- =============================================================================
-- Hangar novo (27/11/2026)
-- -----------------------------------------------------------------------------
-- * Camadas novas: base (feminina ou masculina), altura, barba, parte de baixo,
--   pés e acessórios separados em cabeça, rosto e corpo. A camada "roupa"
--   continua com esse nome e passa a ser só a parte de cima.
-- * O desenho de cada peça fica no site (web/src/arte/avatar.ts); aqui ficam
--   nome, para quem é, XP que abre e ordem. Arte original, todos os direitos
--   reservados (LICENCA-ARTE.md).
-- * Os bonecos já salvos não mudam: o acessório antigo vai para o grupo certo
--   e entram a calça azul-marinho e o tênis branco, que antes vinham
--   desenhados no próprio corpo.
-- * Cor livre do cabelo: chave "cor-livre" com uma cor #rrggbb, usada quando
--   a cor do cabelo é "cabelo-cor-livre".
-- =============================================================================

alter table public.pecas drop constraint pecas_camada_check;

-- Catálogo completo (peças antigas mudam só o grupo, o nome exibido e a ordem).
insert into public.pecas (id, camada, nome, para, xp_minimo, ordem) values
  ('base-masculina', 'base', 'Masculino', 'todos', 0, 1),
  ('base-feminina', 'base', 'Feminino', 'todos', 0, 2),
  ('altura-baixa', 'altura', 'Baixinho', 'todos', 0, 3),
  ('altura-media', 'altura', 'Médio', 'todos', 0, 4),
  ('altura-alta', 'altura', 'Alto', 'todos', 0, 5),
  ('corpo-estreito', 'corpo', 'Magro', 'todos', 0, 6),
  ('corpo-medio', 'corpo', 'Médio', 'todos', 0, 7),
  ('corpo-gordinho', 'corpo', 'Gordinho', 'todos', 0, 8),
  ('corpo-largo', 'corpo', 'Forte', 'todos', 0, 9),
  ('pele-1', 'pele', 'Tom 1', 'todos', 0, 10),
  ('pele-2', 'pele', 'Tom 2', 'todos', 0, 11),
  ('pele-3', 'pele', 'Tom 3', 'todos', 0, 12),
  ('pele-4', 'pele', 'Tom 4', 'todos', 0, 13),
  ('pele-5', 'pele', 'Tom 5', 'todos', 0, 14),
  ('pele-6', 'pele', 'Tom 6', 'todos', 0, 15),
  ('pele-7', 'pele', 'Tom 7', 'todos', 0, 16),
  ('pele-8', 'pele', 'Tom 8', 'todos', 0, 17),
  ('pele-9', 'pele', 'Tom 9', 'todos', 0, 18),
  ('pele-10', 'pele', 'Tom 10', 'todos', 0, 19),
  ('pele-11', 'pele', 'Tom 11', 'todos', 0, 20),
  ('pele-12', 'pele', 'Tom 12', 'todos', 0, 21),
  ('pele-alienigena', 'pele', 'Verde alienígena', 'todos', 250, 22),
  ('pele-estelar', 'pele', 'Azul estelar', 'todos', 500, 23),
  ('rosto-sorridente', 'rosto', 'Sorridente', 'todos', 0, 24),
  ('rosto-serio', 'rosto', 'Concentrado', 'todos', 0, 25),
  ('rosto-piscando', 'rosto', 'Piscando', 'todos', 0, 26),
  ('rosto-surpreso', 'rosto', 'Surpreso', 'todos', 100, 27),
  ('rosto-cilios', 'rosto', 'Cílios', 'todos', 0, 28),
  ('rosto-feliz', 'rosto', 'Muito feliz', 'todos', 0, 29),
  ('rosto-lingua', 'rosto', 'Língua de fora', 'todos', 0, 30),
  ('rosto-bravo', 'rosto', 'Bravo', 'todos', 0, 31),
  ('rosto-sardas', 'rosto', 'Sardas', 'todos', 0, 32),
  ('rosto-barba-e-oculos', 'rosto', 'Barba e óculos', 'professor', 0, 33),
  ('rosto-barba', 'rosto', 'Barba', 'professor', 0, 34),
  ('rosto-ninja-mascara', 'rosto', 'Máscara ninja', 'ninja', 0, 35),
  ('rosto-oculos', 'rosto', 'Óculos de nerd', 'professor', 0, 36),
  ('barba-curta', 'barba', 'Barba rala', 'todos', 0, 37),
  ('barba-bigode', 'barba', 'Bigode', 'todos', 0, 38),
  ('barba-cavanhaque', 'barba', 'Cavanhaque', 'todos', 0, 39),
  ('barba-cheia', 'barba', 'Barba cheia', 'todos', 0, 40),
  ('cabelo-curto', 'cabelo', 'Curto', 'todos', 0, 41),
  ('cabelo-franja', 'cabelo', 'Franja', 'todos', 0, 42),
  ('cabelo-longo', 'cabelo', 'Longo', 'todos', 0, 43),
  ('cabelo-cacheado', 'cabelo', 'Cacheado', 'todos', 0, 44),
  ('cabelo-raspado', 'cabelo', 'Raspado', 'todos', 0, 45),
  ('cabelo-rabo-de-cavalo', 'cabelo', 'Rabo de cavalo', 'todos', 0, 46),
  ('cabelo-coque', 'cabelo', 'Coque', 'todos', 100, 47),
  ('cabelo-arrepiado', 'cabelo', 'Arrepiado', 'todos', 250, 48),
  ('cabelo-capuz-ninja', 'cabelo', 'Capuz ninja', 'ninja', 0, 49),
  ('cabelo-moicano', 'cabelo', 'Moicano punk', 'todos', 0, 50),
  ('cabelo-black-power', 'cabelo', 'Black power', 'todos', 0, 51),
  ('cabelo-trancas', 'cabelo', 'Tranças', 'todos', 0, 52),
  ('cabelo-chanel', 'cabelo', 'Chanel', 'todos', 0, 53),
  ('cabelo-maria-chiquinha', 'cabelo', 'Maria-chiquinha', 'todos', 0, 54),
  ('cabelo-topete', 'cabelo', 'Topete', 'todos', 100, 55),
  ('cabelo-careca', 'cabelo', 'Careca', 'todos', 0, 56),
  ('cabelo-preto', 'cor-do-cabelo', 'Preto', 'todos', 0, 57),
  ('cabelo-castanho', 'cor-do-cabelo', 'Castanho', 'todos', 0, 58),
  ('cabelo-loiro', 'cor-do-cabelo', 'Loiro', 'todos', 0, 59),
  ('cabelo-ruivo', 'cor-do-cabelo', 'Ruivo', 'todos', 0, 60),
  ('cabelo-grisalho', 'cor-do-cabelo', 'Grisalho', 'todos', 0, 61),
  ('cabelo-azul', 'cor-do-cabelo', 'Azul galáctico', 'todos', 500, 62),
  ('cabelo-castanho-claro', 'cor-do-cabelo', 'Castanho claro', 'todos', 0, 63),
  ('cabelo-acaju', 'cor-do-cabelo', 'Acaju', 'todos', 0, 64),
  ('cabelo-platinado', 'cor-do-cabelo', 'Platinado', 'todos', 0, 65),
  ('cabelo-branco', 'cor-do-cabelo', 'Branco', 'todos', 0, 66),
  ('cabelo-rosa', 'cor-do-cabelo', 'Rosa', 'todos', 100, 67),
  ('cabelo-roxo', 'cor-do-cabelo', 'Roxo', 'todos', 100, 68),
  ('cabelo-verde', 'cor-do-cabelo', 'Verde', 'todos', 100, 69),
  ('cabelo-vermelho', 'cor-do-cabelo', 'Vermelho', 'todos', 100, 70),
  ('cabelo-ciano', 'cor-do-cabelo', 'Ciano', 'todos', 100, 71),
  ('cabelo-pontas-loiras', 'cor-do-cabelo', 'Pontas loiras', 'todos', 100, 72),
  ('cabelo-por-do-sol', 'cor-do-cabelo', 'Pôr do sol', 'todos', 250, 73),
  ('cabelo-galaxia', 'cor-do-cabelo', 'Galáxia', 'todos', 250, 74),
  ('cabelo-oceano', 'cor-do-cabelo', 'Oceano', 'todos', 250, 75),
  ('cabelo-algodao-doce', 'cor-do-cabelo', 'Algodão-doce', 'todos', 250, 76),
  ('cabelo-fogo', 'cor-do-cabelo', 'Fogo', 'todos', 250, 77),
  ('cabelo-cor-livre', 'cor-do-cabelo', 'Escolher minha cor', 'todos', 0, 78),
  ('roupa-uniforme', 'roupa', 'Uniforme da nave', 'aluno', 0, 79),
  ('roupa-moletom', 'roupa', 'Moletom roxo', 'aluno', 0, 80),
  ('roupa-camiseta-estrela', 'roupa', 'Camiseta estrela', 'aluno', 100, 81),
  ('roupa-jaqueta-de-piloto', 'roupa', 'Jaqueta de piloto', 'aluno', 250, 82),
  ('roupa-cardiga', 'roupa', 'Cardigã e camisa xadrez', 'professor', 0, 83),
  ('roupa-camisa-xadrez', 'roupa', 'Camisa xadrez azul', 'professor', 0, 84),
  ('roupa-traje-ninja', 'roupa', 'Traje ninja', 'ninja', 0, 85),
  ('roupa-farda-if', 'roupa', 'Farda do IF', 'todos', 0, 86),
  ('roupa-camiseta-programador', 'roupa', 'Camiseta </>', 'todos', 0, 87),
  ('roupa-regata', 'roupa', 'Regata amarela', 'todos', 0, 88),
  ('roupa-blusa-listrada', 'roupa', 'Blusa listrada', 'todos', 100, 89),
  ('baixo-calca-marinho', 'parte-de-baixo', 'Calça azul-marinho', 'todos', 0, 90),
  ('baixo-jeans-azul', 'parte-de-baixo', 'Calça jeans azul', 'todos', 0, 91),
  ('baixo-jeans-preta', 'parte-de-baixo', 'Calça jeans preta', 'todos', 0, 92),
  ('baixo-bermuda', 'parte-de-baixo', 'Bermuda', 'todos', 0, 93),
  ('baixo-saia', 'parte-de-baixo', 'Saia roxa', 'todos', 0, 94),
  ('pes-tenis-branco', 'pes', 'Tênis branco', 'todos', 0, 95),
  ('pes-tenis-preto', 'pes', 'Tênis preto', 'todos', 0, 96),
  ('pes-chinelo', 'pes', 'Chinelo', 'todos', 0, 97),
  ('pes-bota', 'pes', 'Bota', 'todos', 100, 98),
  ('pes-cano-alto', 'pes', 'Tênis cano alto', 'todos', 250, 99),
  ('acessorio-bone', 'acessorio-cabeca', 'Boné', 'aluno', 0, 100),
  ('acessorio-fone', 'acessorio-cabeca', 'Fone de ouvido', 'aluno', 0, 101),
  ('acessorio-capacete', 'acessorio-cabeca', 'Capacete espacial', 'aluno', 900, 102),
  ('acessorio-faixa-ninja', 'acessorio-cabeca', 'Faixa ninja', 'ninja', 0, 103),
  ('acessorio-tiara', 'acessorio-cabeca', 'Tiara', 'todos', 0, 104),
  ('acessorio-laco', 'acessorio-cabeca', 'Laço', 'todos', 0, 105),
  ('acessorio-gorro', 'acessorio-cabeca', 'Gorro', 'todos', 0, 106),
  ('acessorio-bandana-azul', 'acessorio-cabeca', 'Bandana azul', 'todos', 0, 107),
  ('acessorio-chifres', 'acessorio-cabeca', 'Chifres', 'todos', 250, 108),
  ('acessorio-chapeu-viking', 'acessorio-cabeca', 'Chapéu viking', 'todos', 500, 109),
  ('acessorio-oculos-redondos', 'acessorio-rosto', 'Óculos redondos', 'aluno', 0, 110),
  ('acessorio-oculos-quadrados', 'acessorio-rosto', 'Óculos quadrados', 'todos', 0, 111),
  ('acessorio-oculos-escuros', 'acessorio-rosto', 'Óculos escuros', 'todos', 0, 112),
  ('acessorio-oculos-coracao', 'acessorio-rosto', 'Óculos de coração', 'todos', 100, 113),
  ('acessorio-visor', 'acessorio-rosto', 'Visor de piloto', 'aluno', 250, 114),
  ('acessorio-bandana-rosto', 'acessorio-rosto', 'Bandana no rosto', 'todos', 100, 115),
  ('acessorio-mascara-ninja', 'acessorio-rosto', 'Máscara ninja', 'todos', 250, 116),
  ('acessorio-broche', 'acessorio-corpo', 'Broche de estrela', 'aluno', 100, 117),
  ('acessorio-cachecol', 'acessorio-corpo', 'Cachecol', 'todos', 0, 118),
  ('acessorio-mochila', 'acessorio-corpo', 'Mochila', 'todos', 0, 119),
  ('acessorio-livro', 'acessorio-corpo', 'Livro', 'todos', 0, 120),
  ('acessorio-caneca', 'acessorio-corpo', 'Caneca de café', 'professor', 0, 121),
  ('acessorio-notebook', 'acessorio-corpo', 'Notebook com adesivos', 'professor', 0, 122),
  ('acessorio-estrela-ninja', 'acessorio-corpo', 'Estrela ninja', 'ninja', 0, 123)
on conflict (id) do update set
  camada = excluded.camada, nome = excluded.nome, para = excluded.para,
  xp_minimo = excluded.xp_minimo, ordem = excluded.ordem;

alter table public.pecas add constraint pecas_camada_check check (camada in (
  'base', 'altura', 'corpo', 'pele', 'rosto', 'barba', 'cabelo', 'cor-do-cabelo',
  'roupa', 'parte-de-baixo', 'pes', 'acessorio-cabeca', 'acessorio-rosto', 'acessorio-corpo'
));

-- -----------------------------------------------------------------------------
-- Bonecos já salvos: acessório para o grupo novo e roupa de baixo de antes
-- -----------------------------------------------------------------------------
create or replace function privado.migrar_escolhas_hangar_novo(p jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when p is null then null
    else
      '{"base": "base-masculina", "altura": "altura-media",
        "parte-de-baixo": "baixo-calca-marinho", "pes": "pes-tenis-branco"}'::jsonb
      || (p - 'acessorio')
      || coalesce(
        (select jsonb_build_object(pc.camada, pc.id) from public.pecas pc where pc.id = p ->> 'acessorio'),
        '{}'::jsonb)
  end;
$$;

revoke all on function privado.migrar_escolhas_hangar_novo(jsonb) from public;

update public.avatares
set escolhas = privado.migrar_escolhas_hangar_novo(escolhas),
    escolhas_ninja = privado.migrar_escolhas_hangar_novo(escolhas_ninja);

-- -----------------------------------------------------------------------------
-- Conferência de cada escolha (aluno, professor e ninja)
-- -----------------------------------------------------------------------------
-- Erro se alguma chave não for peça válida da camada (ou cor livre inválida).
-- p_papel null = Modo Ninja (qualquer peça vale).
create or replace function privado.conferir_escolhas(p_escolhas jsonb, p_papel text, p_xp integer)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_camada text;
  v_peca text;
begin
  if p_escolhas is null or jsonb_typeof(p_escolhas) <> 'object' then
    raise exception 'Avatar inválido.' using errcode = '22023';
  end if;
  for v_camada, v_peca in select key, value #>> '{}' from jsonb_each(p_escolhas) loop
    if v_camada = 'cor-livre' then
      if v_peca is null or v_peca !~ '^#[0-9a-f]{6}$' then
        raise exception 'Cor inválida.' using errcode = '22023';
      end if;
      continue;
    end if;
    if not exists (
      select 1 from public.pecas
      where id = v_peca and camada = v_camada
        and (p_papel is null or para = 'todos' or para = p_papel)
        and (p_papel is null or xp_minimo <= p_xp)
    ) then
      raise exception 'Peça indisponível: %.', coalesce(v_peca, v_camada) using errcode = '22023';
    end if;
  end loop;
end;
$$;

revoke all on function privado.conferir_escolhas(jsonb, text, integer) from public;

create or replace function public.salvar_avatar(p_escolhas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil uuid := (select auth.uid());
  v_papel text;
  v_xp integer;
begin
  select papel into v_papel from public.perfis where id = v_perfil;
  if v_papel is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '42501';
  end if;
  v_xp := case when v_papel = 'professor' then 2147483647 else privado.xp_total(v_perfil) end;
  perform privado.conferir_escolhas(p_escolhas, v_papel, v_xp);

  insert into public.avatares (perfil_id, escolhas) values (v_perfil, p_escolhas)
  on conflict (perfil_id) do update set escolhas = excluded.escolhas, atualizado_em = now();
  -- Montar o boneco dá a medalha Estilista Espacial (só para aluno).
  if v_papel = 'aluno' then
    perform privado.conferir_medalhas(v_perfil);
  end if;
end;
$$;

revoke all on function public.salvar_avatar(jsonb) from public, anon;
grant execute on function public.salvar_avatar(jsonb) to authenticated;

create or replace function public.salvar_avatar_ninja(p_escolhas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil uuid := (select auth.uid());
begin
  if not (select privado.eh_professor()) then
    raise exception 'O Modo Ninja é só do professor.' using errcode = '42501';
  end if;
  perform privado.conferir_escolhas(p_escolhas, null, 0);

  -- O boneco normal continua como está (ou o padrão do professor, se nunca salvou).
  insert into public.avatares (perfil_id, escolhas, escolhas_ninja) values (v_perfil, '{}', p_escolhas)
  on conflict (perfil_id) do update set escolhas_ninja = excluded.escolhas_ninja, atualizado_em = now();
end;
$$;

revoke all on function public.salvar_avatar_ninja(jsonb) from public, anon;
grant execute on function public.salvar_avatar_ninja(jsonb) to authenticated;
