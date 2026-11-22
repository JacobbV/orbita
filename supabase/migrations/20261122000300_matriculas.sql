-- =============================================================================
-- Pedidos de acesso (matrículas)
-- -----------------------------------------------------------------------------
-- * Cada pedido é para uma oferta (turma + disciplina) e é aprovado separado.
-- * O aluno escreve "Quem é você" (nome completo, turma e turno). O professor
--   lê esse texto ao decidir e pode deixar um motivo ao recusar.
-- * No máximo 3 pedidos por disciplina para cada aluno (o 1º e mais 2 tentativas).
-- * Só pode haver um pedido em aberto ou aprovado por disciplina.
-- * Ninguém altera a tabela direto: tudo passa pelas funções abaixo, que
--   conferem as regras no servidor.
-- =============================================================================

create table public.matriculas (
  id bigint generated always as identity primary key,
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  turma_disciplina_id bigint not null references public.turma_disciplinas (id) on delete cascade,
  -- Cópia da disciplina da oferta, para contar tentativas e travar duplicados.
  disciplina_id bigint not null references public.disciplinas (id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  quem_e_voce text not null check (char_length(trim(quem_e_voce)) between 10 and 500),
  motivo_recusa text check (motivo_recusa is null or char_length(motivo_recusa) <= 500),
  tentativa smallint not null check (tentativa between 1 and 3),
  criado_em timestamptz not null default now(),
  decidido_em timestamptz,
  decidido_por uuid references public.perfis (id) on delete set null,
  unique (aluno_id, disciplina_id, tentativa),
  check (motivo_recusa is null or status = 'recusado')
);

comment on table public.matriculas is 'Pedidos de acesso dos alunos a uma turma + disciplina.';

-- Um pedido pendente ou aprovado por aluno e disciplina.
create unique index matriculas_um_ativo_por_disciplina
  on public.matriculas (aluno_id, disciplina_id)
  where status in ('pendente', 'aprovado');

create index on public.matriculas (turma_disciplina_id, status);

alter table public.matriculas enable row level security;

revoke all on public.matriculas from anon, authenticated;
grant select on public.matriculas to authenticated;

create policy "matriculas: aluno lê os seus pedidos"
  on public.matriculas for select to authenticated
  using (aluno_id = (select auth.uid()));

create policy "matriculas: professor lê todos"
  on public.matriculas for select to authenticated
  using ((select privado.eh_professor()));

-- -----------------------------------------------------------------------------
-- Regra central de criação de pedido (usada no cadastro e nos novos pedidos)
-- -----------------------------------------------------------------------------
create or replace function privado.max_pedidos_por_disciplina()
returns smallint
language sql
immutable
set search_path = ''
as $$ select 3::smallint $$;

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

  -- Trava o aluno para que dois pedidos ao mesmo tempo não furem as regras.
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
  where aluno_id = p_aluno and disciplina_id = v_disciplina;

  if v_tentativas >= privado.max_pedidos_por_disciplina() then
    raise exception 'Você já fez % pedidos nesta disciplina. Fale com o professor.',
      privado.max_pedidos_por_disciplina() using errcode = 'P0001';
  end if;

  insert into public.matriculas (aluno_id, turma_disciplina_id, disciplina_id, quem_e_voce, tentativa)
  values (p_aluno, p_turma_disciplina_id, v_disciplina, trim(p_quem_e_voce), v_tentativas + 1)
  returning * into v_pedido;

  return v_pedido;
end;
$$;

revoke all on function privado.criar_pedido(uuid, bigint, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- API para o site (chamadas com supabase.rpc)
-- -----------------------------------------------------------------------------

-- Aluno logado pede acesso a mais uma disciplina ou tenta de novo após recusa.
create or replace function public.pedir_acesso(p_turma_disciplina_id bigint, p_quem_e_voce text)
returns public.matriculas
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta primeiro.' using errcode = '42501';
  end if;
  return privado.criar_pedido((select auth.uid()), p_turma_disciplina_id, p_quem_e_voce);
end;
$$;

-- Professor aprova ou recusa um pedido pendente.
create or replace function public.decidir_pedido(p_matricula_id bigint, p_aprovar boolean, p_motivo text default null)
returns public.matriculas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.matriculas;
begin
  if not privado.eh_professor() then
    raise exception 'Só o professor decide pedidos.' using errcode = '42501';
  end if;

  update public.matriculas
  set status = case when p_aprovar then 'aprovado' else 'recusado' end,
      motivo_recusa = case when p_aprovar then null else nullif(trim(p_motivo), '') end,
      decidido_em = now(),
      decidido_por = (select auth.uid())
  where id = p_matricula_id and status = 'pendente'
  returning * into v_pedido;

  if v_pedido.id is null then
    raise exception 'Pedido não encontrado ou já decidido.' using errcode = 'P0002';
  end if;

  return v_pedido;
end;
$$;

-- Professor aprova de uma vez todos os pendentes de uma oferta. Devolve quantos.
create or replace function public.aprovar_todos(p_turma_disciplina_id bigint)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total int;
begin
  if not privado.eh_professor() then
    raise exception 'Só o professor decide pedidos.' using errcode = '42501';
  end if;

  update public.matriculas
  set status = 'aprovado', decidido_em = now(), decidido_por = (select auth.uid())
  where turma_disciplina_id = p_turma_disciplina_id and status = 'pendente';

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.pedir_acesso(bigint, text) from public, anon;
revoke all on function public.decidir_pedido(bigint, boolean, text) from public, anon;
revoke all on function public.aprovar_todos(bigint) from public, anon;
grant execute on function public.pedir_acesso(bigint, text) to authenticated;
grant execute on function public.decidir_pedido(bigint, boolean, text) to authenticated;
grant execute on function public.aprovar_todos(bigint) to authenticated;

-- -----------------------------------------------------------------------------
-- Pedido feito no próprio cadastro
-- O site manda turma_disciplina_id e quem_e_voce junto com o cadastro
-- (metadados da conta). Aqui o pedido é criado e esses dados saem dos metadados,
-- para não ficarem guardados em dois lugares.
-- -----------------------------------------------------------------------------
create or replace function privado.criar_pedido_do_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_oferta text := new.raw_user_meta_data ->> 'turma_disciplina_id';
  v_quem text := new.raw_user_meta_data ->> 'quem_e_voce';
begin
  if v_oferta is null and v_quem is null then
    return new; -- conta criada pelo painel (ex.: professor), sem pedido
  end if;

  if v_oferta is null or v_oferta !~ '^\d+$' then
    raise exception 'Escolha a turma e a disciplina.' using errcode = 'P0001';
  end if;

  perform privado.criar_pedido(new.id, v_oferta::bigint, v_quem);

  update auth.users
  set raw_user_meta_data = raw_user_meta_data - 'turma_disciplina_id' - 'quem_e_voce'
  where id = new.id;

  return new;
end;
$$;

-- Roda depois de "a1_criar_perfil" (ordem alfabética), quando o perfil já existe.
create trigger a2_criar_pedido_do_cadastro
  after insert on auth.users
  for each row execute function privado.criar_pedido_do_cadastro();
