-- =============================================================================
-- Cadeira marcada no laboratório da escola virtual
-- -----------------------------------------------------------------------------
-- * Cada aluno pode ter uma cadeira marcada nos laboratórios; uma cadeira só
--   tem um dono (índice único). O aluno vê só quais cadeiras têm dono e qual é
--   a sua, sem nome de ninguém. O professor lê quem é o dono de cada uma.
-- =============================================================================

create table public.cadeiras_escola (
  aluno_id uuid primary key references public.perfis (id) on delete cascade,
  sala text not null check (sala in ('lab-1', 'lab-2', 'lab-cad')),
  assento text not null check (assento ~ '^lab-(1|2|cad)-[0-9]{1,3}$' and assento like sala || '-%'),
  marcada_em timestamptz not null default now(),
  unique (sala, assento)
);

comment on table public.cadeiras_escola is 'Cadeira marcada de cada aluno nos laboratórios da escola virtual.';

alter table public.cadeiras_escola enable row level security;
revoke all on public.cadeiras_escola from anon, authenticated;
grant select on public.cadeiras_escola to authenticated;
create policy "cadeira: aluno lê a sua, professor lê todas" on public.cadeiras_escola
  for select to authenticated
  using (aluno_id = (select auth.uid()) or (select privado.eh_professor()));

create or replace function public.escolher_cadeira(p_sala text, p_assento text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aluno uuid := (select auth.uid());
begin
  if v_aluno is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '42501';
  end if;
  if privado.eh_professor() then
    raise exception 'Cadeira marcada é só para alunos.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.matriculas where aluno_id = v_aluno and status = 'aprovado') then
    raise exception 'Você ainda não foi aprovado em uma turma.' using errcode = '42501';
  end if;
  if p_sala is null or p_sala not in ('lab-1', 'lab-2', 'lab-cad')
     or p_assento is null or p_assento !~ '^lab-(1|2|cad)-[0-9]{1,3}$' or p_assento not like p_sala || '-%' then
    raise exception 'Cadeira inválida.' using errcode = '22023';
  end if;
  if exists (select 1 from public.cadeiras_escola where sala = p_sala and assento = p_assento and aluno_id <> v_aluno) then
    raise exception 'Esta cadeira já tem dono.' using errcode = '23505';
  end if;
  insert into public.cadeiras_escola (aluno_id, sala, assento) values (v_aluno, p_sala, p_assento)
  on conflict (aluno_id) do update set sala = excluded.sala, assento = excluded.assento, marcada_em = now();
end;
$$;

create or replace function public.soltar_cadeira()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.cadeiras_escola where aluno_id = (select auth.uid());
$$;

-- Cadeiras com dono (sem nome) e qual delas é a de quem pergunta.
create or replace function public.cadeiras_ocupadas()
returns table (assento text, minha boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.assento, c.aluno_id = (select auth.uid())
  from public.cadeiras_escola c
  where (select auth.uid()) is not null;
$$;

revoke all on function public.escolher_cadeira(text, text), public.soltar_cadeira(), public.cadeiras_ocupadas() from public, anon;
grant execute on function public.escolher_cadeira(text, text), public.soltar_cadeira(), public.cadeiras_ocupadas() to authenticated;
