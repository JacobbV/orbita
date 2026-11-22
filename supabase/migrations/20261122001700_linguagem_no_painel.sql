-- Laboratório de JavaScript e de HTML e CSS: o professor escolhe a linguagem
-- do exercício no painel. salvar_exercicio ganha p_linguagem (padrão: python).

drop function public.salvar_exercicio(bigint, bigint, text, text, integer, text, jsonb);

create or replace function public.salvar_exercicio(
  p_id bigint,
  p_aula_id bigint,
  p_titulo text,
  p_enunciado text,
  p_dificuldade integer,
  p_codigo_inicial text,
  p_testes jsonb,
  p_linguagem text default 'python'
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
    if not exists (select 1 from public.aulas where id = p_aula_id) then
      raise exception 'Aula não encontrada.' using errcode = 'P0002';
    end if;
    insert into public.exercicios (aula_id, titulo, enunciado, codigo_inicial, dificuldade, linguagem, ordem)
    values (
      p_aula_id, trim(p_titulo), p_enunciado, coalesce(p_codigo_inicial, ''), p_dificuldade, p_linguagem,
      coalesce((select max(ordem) + 1 from public.exercicios where aula_id = p_aula_id), 0)
    )
    returning id into v_id;
  else
    update public.exercicios
    set titulo = trim(p_titulo), enunciado = p_enunciado, codigo_inicial = coalesce(p_codigo_inicial, ''),
        dificuldade = p_dificuldade, linguagem = p_linguagem
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

revoke all on function public.salvar_exercicio(bigint, bigint, text, text, integer, text, jsonb, text) from public, anon;
grant execute on function public.salvar_exercicio(bigint, bigint, text, text, integer, text, jsonb, text) to authenticated;
