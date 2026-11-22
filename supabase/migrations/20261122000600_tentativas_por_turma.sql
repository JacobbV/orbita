-- =============================================================================
-- Limite de tentativas por turma + disciplina
-- -----------------------------------------------------------------------------
-- Decisão do professor (22/11/2026): o aluno tem 3 tentativas para entrar em
-- cada turma. Como o pedido é sempre para uma turma + disciplina (a "oferta"),
-- a contagem passa a ser por oferta, e não mais por disciplina.
-- Exemplo: recusado 3 vezes no 1º INFO M em Algoritmos, ele ainda pode pedir
-- Algoritmos no 1º INFO V (se tiver escolhido a turma errada).
-- Continua valendo: só um pedido pendente ou aprovado por disciplina.
-- =============================================================================

alter table public.matriculas
  drop constraint matriculas_aluno_id_disciplina_id_tentativa_key,
  add constraint matriculas_aluno_oferta_tentativa_key unique (aluno_id, turma_disciplina_id, tentativa);

comment on column public.matriculas.tentativa is 'Número do pedido do aluno nesta turma + disciplina (1 a 3).';

create or replace function privado.criar_pedido(
  p_aluno uuid,
  p_turma_disciplina_id bigint,
  p_quem_e_voce text
)
returns public.matriculas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_disciplina bigint;
  v_tentativas int;
  v_pedido public.matriculas;
begin
  if (select papel from public.perfis where id = p_aluno) is distinct from 'aluno' then
    raise exception 'Só alunos fazem pedido de acesso.' using errcode = 'P0001';
  end if;

  select td.disciplina_id into v_disciplina
  from public.turma_disciplinas td
  join public.turmas t on t.id = td.turma_id
  join public.disciplinas d on d.id = td.disciplina_id
  where td.id = p_turma_disciplina_id and t.ativa and d.publica;

  if v_disciplina is null then
    raise exception 'Turma ou disciplina não encontrada.' using errcode = 'P0002';
  end if;

  if char_length(trim(coalesce(p_quem_e_voce, ''))) < 10 then
    raise exception 'Conte quem você é: nome completo, turma e turno.' using errcode = 'P0001';
  end if;

  -- Trava o aluno nesta disciplina para que dois pedidos ao mesmo tempo não furem as regras.
  perform pg_advisory_xact_lock(hashtextextended(p_aluno::text || ':' || v_disciplina, 0));

  if exists (
    select 1 from public.matriculas
    where aluno_id = p_aluno and disciplina_id = v_disciplina
      and status in ('pendente', 'aprovado')
  ) then
    raise exception 'Você já tem um pedido em aberto ou aprovado nesta disciplina.' using errcode = 'P0001';
  end if;

  select count(*) into v_tentativas
  from public.matriculas
  where aluno_id = p_aluno and turma_disciplina_id = p_turma_disciplina_id;

  if v_tentativas >= privado.max_pedidos_por_disciplina() then
    raise exception 'Você já fez % pedidos para esta turma. Fale com o professor.',
      privado.max_pedidos_por_disciplina() using errcode = 'P0001';
  end if;

  insert into public.matriculas (aluno_id, turma_disciplina_id, disciplina_id, quem_e_voce, tentativa)
  values (p_aluno, p_turma_disciplina_id, v_disciplina, trim(p_quem_e_voce), v_tentativas + 1)
  returning * into v_pedido;

  return v_pedido;
end;
$$;

revoke all on function privado.criar_pedido(uuid, bigint, text) from public, anon, authenticated;

-- Nome mais claro para o limite (o valor continua 3).
comment on function privado.max_pedidos_por_disciplina() is
  'Máximo de pedidos de um aluno para a mesma turma + disciplina.';
