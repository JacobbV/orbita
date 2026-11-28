-- =============================================================================
-- Dicas dos exercícios
-- -----------------------------------------------------------------------------
-- O professor escreve até 3 dicas por exercício. O aluno abre uma de cada vez,
-- na ordem, depois de algumas tentativas erradas no Rodar (a contagem fica no
-- navegador do aluno, como o rodar do código). As dicas ficam na própria linha
-- do exercício, então valem as mesmas regras de acesso: só quem vê o exercício
-- vê as dicas. Questão só de prova (sem aula) não tem dicas.
-- =============================================================================

create or replace function privado.dicas_validas(p_dicas text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(cardinality(p_dicas), 0) <= 3
    and coalesce((select bool_and(char_length(trim(d)) between 1 and 1000) from unnest(p_dicas) d), true);
$$;

alter table public.exercicios
  add column dicas text[] not null default '{}'
  constraint exercicios_dicas_validas check (privado.dicas_validas(dicas));

comment on column public.exercicios.dicas is 'Até 3 dicas, abertas pelo aluno uma por vez, na ordem.';

-- -----------------------------------------------------------------------------
-- salvar_exercicio: recebe também as dicas. Null mantém as que o exercício já
-- tem (ou nenhuma, num exercício novo). Dicas vazias são descartadas.
-- -----------------------------------------------------------------------------
drop function public.salvar_exercicio(bigint, bigint, text, text, integer, text, jsonb, text, text, text);

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
  p_palavras_extras text default null,
  p_dicas text[] default null
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
  v_dicas text[];
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
  if p_dicas is not null then
    select coalesce(array_agg(trim(d) order by n), '{}') into v_dicas
    from unnest(p_dicas) with ordinality as x(d, n)
    where char_length(trim(coalesce(d, ''))) > 0;
    if cardinality(v_dicas) > 3 then
      raise exception 'Use até 3 dicas.' using errcode = '22023';
    end if;
    if not privado.dicas_validas(v_dicas) then
      raise exception 'Cada dica pode ter até 1000 letras.' using errcode = '22023';
    end if;
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
    insert into public.exercicios (aula_id, titulo, enunciado, codigo_inicial, dificuldade, linguagem, conferencia, palavras_extras, dicas, ordem)
    values (
      p_aula_id, trim(p_titulo), p_enunciado, coalesce(p_codigo_inicial, ''), p_dificuldade, p_linguagem,
      coalesce(p_conferencia, 'valores'), trim(coalesce(p_palavras_extras, '')),
      case when p_aula_id is null then '{}' else coalesce(v_dicas, '{}') end,
      coalesce((select max(ordem) + 1 from public.exercicios where aula_id is not distinct from p_aula_id), 0)
    )
    returning id into v_id;
  else
    update public.exercicios
    set titulo = trim(p_titulo), enunciado = p_enunciado, codigo_inicial = coalesce(p_codigo_inicial, ''),
        dificuldade = p_dificuldade, linguagem = p_linguagem,
        conferencia = coalesce(p_conferencia, conferencia),
        palavras_extras = coalesce(trim(p_palavras_extras), palavras_extras),
        dicas = case when aula_id is null then '{}' else coalesce(v_dicas, dicas) end
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

revoke all on function public.salvar_exercicio(bigint, bigint, text, text, integer, text, jsonb, text, text, text, text[]) from public, anon;
grant execute on function public.salvar_exercicio(bigint, bigint, text, text, integer, text, jsonb, text, text, text, text[]) to authenticated;
