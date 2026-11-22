-- =============================================================================
-- Liberação de aulas
-- -----------------------------------------------------------------------------
-- * O professor libera aula por aula, para cada oferta (turma + disciplina).
--   Liberar = inserir uma linha; bloquear de novo = apagar a linha.
-- * O aluno aprovado na oferta vê quais aulas estão liberadas e só consegue ler
--   os materiais (links) dessas aulas. Aula não liberada não entrega conteúdo.
-- =============================================================================

create table public.liberacoes (
  turma_disciplina_id bigint not null references public.turma_disciplinas (id) on delete cascade,
  aula_id bigint not null references public.aulas (id) on delete cascade,
  liberado_em timestamptz not null default now(),
  liberado_por uuid references public.perfis (id) on delete set null default auth.uid(),
  primary key (turma_disciplina_id, aula_id)
);

create index on public.liberacoes (aula_id);

-- A aula precisa ser da mesma disciplina da oferta.
create or replace function privado.conferir_liberacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.aulas a
    join public.unidades u on u.id = a.unidade_id
    join public.turma_disciplinas td on td.disciplina_id = u.disciplina_id
    where a.id = new.aula_id and td.id = new.turma_disciplina_id
  ) then
    raise exception 'Esta aula não é da disciplina desta turma.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger conferir_liberacao
  before insert or update on public.liberacoes
  for each row execute function privado.conferir_liberacao();

-- -----------------------------------------------------------------------------
-- O aluno logado está aprovado nesta oferta?
-- -----------------------------------------------------------------------------
create or replace function privado.aprovado_na_oferta(p_turma_disciplina_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matriculas
    where aluno_id = (select auth.uid())
      and turma_disciplina_id = p_turma_disciplina_id
      and status = 'aprovado'
  );
$$;

-- O aluno logado pode abrir esta aula? (liberada para uma oferta em que está aprovado)
create or replace function privado.pode_ver_aula(p_aula_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.liberacoes l
    join public.matriculas m on m.turma_disciplina_id = l.turma_disciplina_id
    where l.aula_id = p_aula_id
      and m.aluno_id = (select auth.uid())
      and m.status = 'aprovado'
  )
  or exists (select 1 from public.aulas where id = p_aula_id and publica);
$$;

revoke all on function privado.aprovado_na_oferta(bigint) from public;
revoke all on function privado.pode_ver_aula(bigint) from public;
grant execute on function privado.aprovado_na_oferta(bigint) to authenticated;
grant execute on function privado.pode_ver_aula(bigint) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.liberacoes enable row level security;

revoke all on public.liberacoes from anon, authenticated;
grant select, insert, delete on public.liberacoes to authenticated;

create policy "liberacoes: aluno aprovado lê as da sua turma"
  on public.liberacoes for select to authenticated
  using (privado.aprovado_na_oferta(turma_disciplina_id));

create policy "liberacoes: professor lê"
  on public.liberacoes for select to authenticated
  using ((select privado.eh_professor()));

create policy "liberacoes: professor libera"
  on public.liberacoes for insert to authenticated
  with check ((select privado.eh_professor()));

create policy "liberacoes: professor bloqueia"
  on public.liberacoes for delete to authenticated
  using ((select privado.eh_professor()));

-- Materiais: além do professor (migration anterior), quem pode ver a aula.
create policy "materiais: aluno lê os das aulas liberadas"
  on public.materiais for select to authenticated
  using (privado.pode_ver_aula(aula_id));
