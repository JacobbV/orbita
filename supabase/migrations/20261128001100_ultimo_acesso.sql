-- =============================================================================
-- Último acesso dos alunos (só o professor vê)
-- -----------------------------------------------------------------------------
-- O navegador do aluno avisa que está aberto (no máximo uma vez por minuto) e o
-- banco guarda só a hora do último aviso. O professor usa isso para ver quem
-- está online agora e quando cada aluno entrou pela última vez. Nenhum outro
-- aluno enxerga essa informação, nem a própria linha.
-- =============================================================================

create table public.acessos (
  perfil_id uuid primary key references public.perfis (id) on delete cascade,
  ultimo_acesso timestamptz not null default now()
);

comment on table public.acessos is
  'Hora do último aviso de "estou aqui" de cada aluno. Só o professor lê. Sem histórico, só o último.';

alter table public.acessos enable row level security;
revoke all on public.acessos from anon, authenticated;
grant select on public.acessos to authenticated;

create policy "acessos: só o professor lê"
  on public.acessos for select to authenticated
  using ((select privado.eh_professor()));

-- Registra que o aluno logado está com o site aberto. Só vale para aluno (o
-- professor e o Modo Ninja não entram na lista) e só grava se passou mais de
-- um minuto do último registro.
create or replace function public.registrar_acesso()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := (select auth.uid());
begin
  if v_id is null then
    return;
  end if;
  if not exists (select 1 from public.perfis where id = v_id and papel = 'aluno') then
    return;
  end if;
  insert into public.acessos (perfil_id, ultimo_acesso)
  values (v_id, now())
  on conflict (perfil_id) do update
    set ultimo_acesso = now()
    where public.acessos.ultimo_acesso < now() - interval '1 minute';
end;
$$;

revoke all on function public.registrar_acesso() from public, anon;
grant execute on function public.registrar_acesso() to authenticated;
