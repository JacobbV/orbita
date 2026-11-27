-- =============================================================================
-- Conferência flexível da saída dos exercícios
-- -----------------------------------------------------------------------------
-- Antes, a saída do programa tinha de ser igual à esperada, letra por letra.
-- Agora o professor escolhe, em cada exercício, como conferir:
-- * valores (padrão): contam os números e as palavras que vieram da entrada do
--   teste, mais as palavras extras que o professor marcar (ex.: "aprovado"),
--   na ordem. O texto que o aluno escreve em volta não conta;
-- * texto: contam todas as palavras e números, na ordem;
-- * exato: como era antes.
-- Nos dois primeiros, maiúsculas, acentos, espaços, aspas, colchetes, vírgulas
-- e dois-pontos não contam, e 12.0 vale o mesmo que 12.
--
-- O site faz a mesma conta (web/src/lab/correcao.ts). Os testes ocultos chegam
-- ao aluno só como impressão digital (SHA-256) do que é conferido.
--
-- Exercícios que já existem passam para "valores". As entregas e notas já
-- guardadas não mudam.
-- =============================================================================

alter table public.exercicios
  add column conferencia text not null default 'valores' check (conferencia in ('valores', 'texto', 'exato')),
  add column palavras_extras text not null default '' check (char_length(palavras_extras) <= 500);

comment on column public.exercicios.conferencia is
  'Como a saída é conferida: valores (números e palavras da entrada), texto (todas as palavras, sem maiúsculas, acentos e pontuação) ou exato.';
comment on column public.exercicios.palavras_extras is
  'No modo valores: palavras de resultado que também contam, mesmo sem estar na entrada (ex.: aprovado, par).';

-- -----------------------------------------------------------------------------
-- Funções da conferência (iguais às do site, na mesma ordem)
-- -----------------------------------------------------------------------------

-- Minúsculas sem acento. Mesma tabela de LETRAS_COM_ACENTO / LETRAS_SEM_ACENTO do site.
create or replace function privado.sem_acentos(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(
    normalize(coalesce(p_texto, ''), nfc),
    'áàâãäåāéèêëēíìîïīóòôõöōúùûüūçñýÿÁÀÂÃÄÅĀÉÈÊËĒÍÌÎÏĪÓÒÔÕÖŌÚÙÛÜŪÇÑÝABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'aaaaaaaeeeeeiiiiioooooouuuuucnyyaaaaaaaeeeeeiiiiioooooouuuuucnyabcdefghijklmnopqrstuvwxyz'
  );
$$;

-- Palavras e números do texto, na ordem. O resto só separa. 12.50 → 12.5; 12.0 → 12.
create or replace function privado.fichas(p_texto text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(
    case
      when r.m[1] ~ '^[a-z]' or position('.' in r.m[1]) = 0 then r.m[1]
      else regexp_replace(regexp_replace(r.m[1], '0+$', ''), '\.$', '')
    end
    order by r.n
  ), '{}')
  from regexp_matches(privado.sem_acentos(p_texto), '-?[0-9]+(?:\.[0-9]+)?|[a-z]+', 'g') with ordinality as r(m, n);
$$;

-- Modo "valores": todos os números e só as palavras da entrada ou das palavras extras.
create or replace function privado.so_os_valores(p_texto text, p_entrada text, p_palavras text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(u.ficha order by u.n), '{}')
  from unnest(privado.fichas(p_texto)) with ordinality as u(ficha, n)
  where u.ficha !~ '^[a-z]'
     or u.ficha = any (privado.fichas(p_entrada) || privado.fichas(p_palavras));
$$;

-- Modo que vale para um teste. "valores" sem nenhum valor na saída esperada
-- (ex.: só imprime "Olá, mundo!") vira "texto", senão qualquer saída passaria.
create or replace function privado.modo_do_teste(p_esperada text, p_entrada text, p_modo text, p_palavras text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_modo <> 'valores' then p_modo
    when cardinality(privado.so_os_valores(p_esperada, p_entrada, p_palavras)) > 0 then 'valores'
    else 'texto'
  end;
$$;

-- O que de fato é comparado, no modo já resolvido para o teste.
create or replace function privado.forma_conferida(p_texto text, p_entrada text, p_palavras text, p_modo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_modo
    when 'exato' then privado.normalizar_saida(p_texto)
    when 'valores' then array_to_string(privado.so_os_valores(p_texto, p_entrada, p_palavras), ' ')
    else array_to_string(privado.fichas(p_texto), ' ')
  end;
$$;

-- Impressão digital da saída esperada de um teste, com a regra do exercício.
create or replace function privado.impressao_conferida(p_esperada text, p_entrada text, p_modo text, p_palavras text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(
    privado.forma_conferida(p_esperada, p_entrada, p_palavras, privado.modo_do_teste(p_esperada, p_entrada, p_modo, p_palavras)),
    'UTF8'
  )), 'hex');
$$;

revoke all on function privado.sem_acentos(text), privado.fichas(text), privado.so_os_valores(text, text, text),
  privado.modo_do_teste(text, text, text, text), privado.forma_conferida(text, text, text, text),
  privado.impressao_conferida(text, text, text, text) from public, anon;

-- -----------------------------------------------------------------------------
-- Testes para o navegador do aluno: agora com o modo de cada teste e as
-- palavras extras, e a impressão digital calculada com a regra do exercício.
-- (O tipo de retorno muda, então a função é recriada.)
-- -----------------------------------------------------------------------------
drop function public.testes_do_exercicio(bigint);

create function public.testes_do_exercicio(p_exercicio_id bigint)
returns table (id bigint, tipo text, entrada text, saida_esperada text, saida_hash text, conferencia text, palavras text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.exercicios e
    where e.id = p_exercicio_id and (privado.eh_professor() or privado.pode_ver_aula(e.aula_id))
  ) then
    raise exception 'Este exercício ainda não foi liberado para a sua turma.' using errcode = '42501';
  end if;
  return query
    select t.id, t.tipo, t.entrada,
      case when t.tipo = 'visivel' then t.saida_esperada end,
      privado.impressao_conferida(t.saida_esperada, t.entrada, e.conferencia, e.palavras_extras),
      privado.modo_do_teste(t.saida_esperada, t.entrada, e.conferencia, e.palavras_extras),
      e.palavras_extras
    from public.testes t
    join public.exercicios e on e.id = t.exercicio_id
    where t.exercicio_id = p_exercicio_id and t.tipo in ('visivel', 'oculto')
    order by t.tipo desc, t.ordem, t.id;
end;
$$;

revoke all on function public.testes_do_exercicio(bigint) from public, anon;
grant execute on function public.testes_do_exercicio(bigint) to authenticated;

-- Questões da prova: os testes levam o modo e as palavras extras também.
create or replace function public.questoes_da_prova(p_prova_id bigint)
returns table (
  questao_id bigint,
  titulo text,
  enunciado text,
  linguagem text,
  codigo_inicial text,
  peso numeric,
  testes jsonb,
  minha_resposta text,
  respondida_em timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tentativa public.prova_tentativas%rowtype;
begin
  v_tentativa := privado.tentativa_em_andamento(p_prova_id);
  return query
    select q.id, e.titulo, e.enunciado, e.linguagem, e.codigo_inicial, q.peso,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', t.id, 'tipo', t.tipo, 'entrada', t.entrada,
          'saida_esperada', case when t.tipo = 'visivel' then t.saida_esperada end,
          'saida_hash', privado.impressao_conferida(t.saida_esperada, t.entrada, e.conferencia, e.palavras_extras),
          'conferencia', privado.modo_do_teste(t.saida_esperada, t.entrada, e.conferencia, e.palavras_extras),
          'palavras', e.palavras_extras
        ) order by t.tipo desc, t.ordem, t.id)
        from public.testes t
        where t.exercicio_id = e.id and t.tipo in ('visivel', 'oculto')
      ), '[]'::jsonb),
      r.codigo, r.respondida_em
    from public.prova_questoes q
    join public.exercicios e on e.id = q.exercicio_id
    left join public.prova_respostas r on r.tentativa_id = v_tentativa.id and r.questao_id = q.id
    where q.prova_id = p_prova_id
    order by q.ordem, q.id;
end;
$$;

revoke all on function public.questoes_da_prova(bigint) from public, anon;
grant execute on function public.questoes_da_prova(bigint) to authenticated;

-- -----------------------------------------------------------------------------
-- salvar_exercicio: recebe também o modo de conferir e as palavras extras.
-- Null mantém o que o exercício já tem (ou o padrão, num exercício novo).
-- -----------------------------------------------------------------------------
drop function public.salvar_exercicio(bigint, bigint, text, text, integer, text, jsonb, text);

create function public.salvar_exercicio(
  p_id bigint,
  p_aula_id bigint,
  p_titulo text,
  p_enunciado text,
  p_dificuldade integer,
  p_codigo_inicial text,
  p_testes jsonb,
  p_linguagem text default 'python',
  p_conferencia text default null,
  p_palavras_extras text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_teste jsonb;
  v_ordem integer := 0;
  v_abertos integer;
begin
  perform privado.exigir_professor();

  if char_length(trim(coalesce(p_titulo, ''))) not between 1 and 160 then
    raise exception 'Escreva o título do exercício (até 160 letras).' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_enunciado, ''))) = 0 or char_length(p_enunciado) > 20000 then
    raise exception 'Escreva o enunciado do exercício.' using errcode = '22023';
  end if;
  if coalesce(p_linguagem, '') not in ('python', 'javascript', 'html') then
    raise exception 'Escolha a linguagem: Python, JavaScript ou HTML e CSS.' using errcode = '22023';
  end if;
  if p_dificuldade is null or p_dificuldade not between 1 and 3 then
    raise exception 'Escolha a dificuldade.' using errcode = '22023';
  end if;
  if p_conferencia is not null and p_conferencia not in ('valores', 'texto', 'exato') then
    raise exception 'Escolha como conferir a saída: só os valores, texto flexível ou texto exato.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_palavras_extras, '')) > 500 then
    raise exception 'Use até 500 letras nas palavras que também contam.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_codigo_inicial, '')) > 20000 then
    raise exception 'O código inicial passou do limite de 20 mil letras.' using errcode = '22023';
  end if;
  if p_testes is null or jsonb_typeof(p_testes) <> 'array' or jsonb_array_length(p_testes) not between 1 and 30 then
    raise exception 'Coloque de 1 a 30 testes.' using errcode = '22023';
  end if;
  for v_teste in select value from jsonb_array_elements(p_testes) loop
    if jsonb_typeof(v_teste) <> 'object'
      or coalesce(v_teste ->> 'tipo', '') not in ('visivel', 'oculto', 'secreto')
      or v_teste ->> 'saida_esperada' is null
      or char_length(v_teste ->> 'saida_esperada') > 10000
      or char_length(coalesce(v_teste ->> 'entrada', '')) > 10000
    then
      raise exception 'Confira os testes: cada um precisa do tipo e da saída esperada.' using errcode = '22023';
    end if;
  end loop;
  select count(*) into v_abertos from jsonb_array_elements(p_testes) t where t.value ->> 'tipo' in ('visivel', 'oculto');
  if v_abertos = 0 then
    raise exception 'Coloque pelo menos um teste visível ou oculto: é com eles que o aluno confere o código.' using errcode = '22023';
  end if;

  if p_id is null then
    -- Sem aula = questão só de prova.
    if p_aula_id is not null and not exists (select 1 from public.aulas where id = p_aula_id) then
      raise exception 'Aula não encontrada.' using errcode = 'P0002';
    end if;
    insert into public.exercicios (aula_id, titulo, enunciado, codigo_inicial, dificuldade, linguagem, conferencia, palavras_extras, ordem)
    values (
      p_aula_id, trim(p_titulo), p_enunciado, coalesce(p_codigo_inicial, ''), p_dificuldade, p_linguagem,
      coalesce(p_conferencia, 'valores'), trim(coalesce(p_palavras_extras, '')),
      coalesce((select max(ordem) + 1 from public.exercicios where aula_id is not distinct from p_aula_id), 0)
    )
    returning id into v_id;
  else
    update public.exercicios
    set titulo = trim(p_titulo), enunciado = p_enunciado, codigo_inicial = coalesce(p_codigo_inicial, ''),
        dificuldade = p_dificuldade, linguagem = p_linguagem,
        conferencia = coalesce(p_conferencia, conferencia),
        palavras_extras = coalesce(trim(p_palavras_extras), palavras_extras)
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Exercício não encontrado.' using errcode = 'P0002';
    end if;
    delete from public.testes where exercicio_id = v_id;
  end if;

  for v_teste in select value from jsonb_array_elements(p_testes) loop
    insert into public.testes (exercicio_id, tipo, entrada, saida_esperada, ordem)
    values (v_id, v_teste ->> 'tipo', coalesce(v_teste ->> 'entrada', ''), v_teste ->> 'saida_esperada', v_ordem);
    v_ordem := v_ordem + 1;
  end loop;
  return v_id;
end;
$$;


revoke all on function public.salvar_exercicio(bigint, bigint, text, text, integer, text, jsonb, text, text, text) from public, anon;
grant execute on function public.salvar_exercicio(bigint, bigint, text, text, integer, text, jsonb, text, text, text) to authenticated;
