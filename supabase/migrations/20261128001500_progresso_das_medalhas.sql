-- =============================================================================
-- Progresso das medalhas de contagem
-- -----------------------------------------------------------------------------
-- Devolve, para o aluno logado, quanto falta nas medalhas que dependem de uma
-- contagem (ex.: 10 de 15 exercícios em Python). As contas repetem as de
-- privado.conferir_medalhas (migration 20261122001500); se uma regra mudar lá,
-- muda aqui também. Só lê dados do próprio aluno e não ganha nada.
-- =============================================================================

create or replace function public.progresso_das_medalhas()
returns table (medalha text, atual integer, meta integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := (select auth.uid());
begin
  if v_id is null then
    return;
  end if;

  return query
  with certas as (
    select en.exercicio_id, en.tentativa, en.codigo, ex.linguagem, ex.dificuldade,
      (en.criado_em at time zone 'America/Fortaleza')::date as dia
    from public.entregas en
    join public.exercicios ex on ex.id = en.exercicio_id
    where en.aluno_id = v_id and en.testes_total > 0 and en.testes_certos = en.testes_total
      and en.situacao <> 'nao_confere'
  ),
  contas (medalha, atual, meta) as (
    select 'explorador', (select count(distinct aula_id) from public.xp_eventos where aluno_id = v_id and motivo = 'aula')::integer, 10
    union all
    select 'nota-dez', (select count(distinct exercicio_id) from certas where tentativa = 1)::integer, 5
    union all
    select 'mestre-dos-lacos', (select count(distinct exercicio_id) from certas where codigo ~ '\m(for|while)\M')::integer, 5
    union all
    select 'programador-de-bordo', (select count(distinct exercicio_id) from certas)::integer, 10
    union all
    select 'cobrinha', (select count(distinct exercicio_id) from certas where linguagem = 'python')::integer, 3
    union all
    select 'ninho-de-cobras', (select count(distinct dia) from certas where linguagem = 'python')::integer, 5
    union all
    select 'cobra-criada', (select count(distinct exercicio_id) from certas where linguagem = 'python')::integer, 15
    union all
    select 'encantador-de-serpentes',
      (select count(distinct exercicio_id) from certas where linguagem = 'python' and dificuldade = 3 and tentativa = 1)::integer, 3
    union all
    select 'destaque-triplo',
      (select count(distinct (criado_em at time zone 'America/Fortaleza')::date)
       from public.xp_eventos where aluno_id = v_id and motivo = 'professor')::integer, 3
    union all
    select 'estrela-em-ascensao', least(privado.xp_total(v_id), 500)::integer, 500
    union all
    select 'colecionador',
      (select count(*) from public.medalhas_ganhas mg where mg.aluno_id = v_id and mg.medalha <> 'colecionador')::integer, 8
  )
  select c.medalha, least(c.atual, c.meta), c.meta from contas c;
end;
$$;

revoke all on function public.progresso_das_medalhas() from public, anon;
grant execute on function public.progresso_das_medalhas() to authenticated;
