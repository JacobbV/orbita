-- =============================================================================
-- Funções do painel do professor
-- -----------------------------------------------------------------------------
-- * Adicionar e remover unidades e aulas mantendo a numeração sem buracos
--   (1, 2, 3...). Remover a aula 2 de 6 renumera as aulas 3 a 6 para 2 a 5.
-- * Liberar ou bloquear uma unidade inteira para uma turma de uma vez.
-- * Definir o link de uma aula (Fase 1: um link externo por aula).
-- Todas rodam com as permissões de quem chama (security invoker): as políticas
-- de RLS continuam valendo, e a checagem de professor no início só deixa a
-- mensagem de erro mais clara.
-- =============================================================================

create or replace function privado.exigir_professor()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not privado.eh_professor() then
    raise exception 'Só o professor pode fazer isso.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function privado.exigir_professor() from public;
grant execute on function privado.exigir_professor() to authenticated;

-- Nova unidade no fim da disciplina.
create or replace function public.adicionar_unidade(p_disciplina_id bigint, p_titulo text)
returns public.unidades
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_unidade public.unidades;
begin
  perform privado.exigir_professor();
  insert into public.unidades (disciplina_id, numero, titulo)
  select p_disciplina_id, coalesce(max(numero), 0) + 1, trim(p_titulo)
  from public.unidades where disciplina_id = p_disciplina_id
  returning * into v_unidade;
  return v_unidade;
end;
$$;

-- Remove a unidade (com as aulas, links e liberações dela) e renumera as seguintes.
create or replace function public.remover_unidade(p_unidade_id bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_disciplina bigint;
  v_numero smallint;
begin
  perform privado.exigir_professor();
  delete from public.unidades where id = p_unidade_id
  returning disciplina_id, numero into v_disciplina, v_numero;
  if v_disciplina is null then
    raise exception 'Unidade não encontrada.' using errcode = 'P0002';
  end if;
  set constraints all deferred;
  update public.unidades set numero = numero - 1
  where disciplina_id = v_disciplina and numero > v_numero;
end;
$$;

-- Nova aula no fim da unidade.
create or replace function public.adicionar_aula(p_unidade_id bigint, p_titulo text)
returns public.aulas
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_aula public.aulas;
begin
  perform privado.exigir_professor();
  insert into public.aulas (unidade_id, numero, titulo)
  select p_unidade_id, coalesce(max(numero), 0) + 1, trim(p_titulo)
  from public.aulas where unidade_id = p_unidade_id
  returning * into v_aula;
  return v_aula;
end;
$$;

-- Remove a aula (com links e liberações) e renumera as seguintes da unidade.
create or replace function public.remover_aula(p_aula_id bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_unidade bigint;
  v_numero smallint;
begin
  perform privado.exigir_professor();
  delete from public.aulas where id = p_aula_id
  returning unidade_id, numero into v_unidade, v_numero;
  if v_unidade is null then
    raise exception 'Aula não encontrada.' using errcode = 'P0002';
  end if;
  set constraints all deferred;
  update public.aulas set numero = numero - 1
  where unidade_id = v_unidade and numero > v_numero;
end;
$$;

-- Libera (ou bloqueia) todas as aulas de uma unidade para uma turma. Devolve quantas mudaram.
create or replace function public.liberar_unidade(p_turma_disciplina_id bigint, p_unidade_id bigint, p_liberar boolean)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total int;
begin
  perform privado.exigir_professor();
  if p_liberar then
    insert into public.liberacoes (turma_disciplina_id, aula_id)
    select p_turma_disciplina_id, a.id from public.aulas a where a.unidade_id = p_unidade_id
    on conflict do nothing;
  else
    delete from public.liberacoes l
    using public.aulas a
    where a.id = l.aula_id and a.unidade_id = p_unidade_id
      and l.turma_disciplina_id = p_turma_disciplina_id;
  end if;
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Define o link da aula. URL vazia remove o link.
create or replace function public.definir_link_da_aula(p_aula_id bigint, p_url text, p_titulo text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  delete from public.materiais where aula_id = p_aula_id and tipo = 'link';
  if nullif(trim(coalesce(p_url, '')), '') is not null then
    insert into public.materiais (aula_id, tipo, titulo, url)
    values (p_aula_id, 'link', coalesce(nullif(trim(p_titulo), ''), 'Material da aula'), trim(p_url));
  end if;
end;
$$;

revoke all on function public.adicionar_unidade(bigint, text) from public, anon;
revoke all on function public.remover_unidade(bigint) from public, anon;
revoke all on function public.adicionar_aula(bigint, text) from public, anon;
revoke all on function public.remover_aula(bigint) from public, anon;
revoke all on function public.liberar_unidade(bigint, bigint, boolean) from public, anon;
revoke all on function public.definir_link_da_aula(bigint, text, text) from public, anon;
grant execute on function public.adicionar_unidade(bigint, text) to authenticated;
grant execute on function public.remover_unidade(bigint) to authenticated;
grant execute on function public.adicionar_aula(bigint, text) to authenticated;
grant execute on function public.remover_aula(bigint) to authenticated;
grant execute on function public.liberar_unidade(bigint, bigint, boolean) to authenticated;
grant execute on function public.definir_link_da_aula(bigint, text, text) to authenticated;
