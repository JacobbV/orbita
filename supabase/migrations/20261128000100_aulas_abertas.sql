-- Última aula aberta por cada aluno, para o botão "Continuar aula" da ponte.
-- A tabela só é escrita pela função abaixo; o aluno lê apenas as próprias linhas.

create table public.aulas_abertas (
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  aula_id bigint not null references public.aulas (id) on delete cascade,
  aberta_em timestamptz not null default now(),
  primary key (aluno_id, aula_id)
);

comment on table public.aulas_abertas is 'Quando cada aluno abriu cada aula pela última vez (alimenta "Continuar aula").';

create index aulas_abertas_recentes on public.aulas_abertas (aluno_id, aberta_em desc);

alter table public.aulas_abertas enable row level security;
revoke all on public.aulas_abertas from anon, authenticated;
grant select on public.aulas_abertas to authenticated;

create policy "aulas abertas: aluno lê as próprias, professor lê todas"
  on public.aulas_abertas for select to authenticated
  using (aluno_id = (select auth.uid()) or (select privado.eh_professor()));

create or replace function public.registrar_aula_aberta(p_aula_id bigint)
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
  -- Professor (e Modo Ninja) não deixa rastro de estudo.
  if privado.eh_professor() then
    return;
  end if;
  if not exists (
    select 1
    from public.liberacoes l
    join public.matriculas m on m.turma_disciplina_id = l.turma_disciplina_id
    where l.aula_id = p_aula_id and m.aluno_id = v_aluno and m.status = 'aprovado'
  ) then
    raise exception 'Esta aula ainda não foi liberada para a sua turma.' using errcode = '42501';
  end if;

  insert into public.aulas_abertas (aluno_id, aula_id, aberta_em)
  values (v_aluno, p_aula_id, now())
  on conflict (aluno_id, aula_id) do update set aberta_em = excluded.aberta_em;
end;
$$;

revoke all on function public.registrar_aula_aberta(bigint) from public, anon;
grant execute on function public.registrar_aula_aberta(bigint) to authenticated;
