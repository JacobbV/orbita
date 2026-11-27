-- Anotações pessoais da aula: um bloco de texto por pessoa e por aula.
-- Só a própria pessoa lê e escreve; ninguém (nem o professor) vê as dos outros.

create table public.anotacoes_da_aula (
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  aula_id bigint not null references public.aulas (id) on delete cascade,
  texto text not null default '' check (char_length(texto) <= 5000),
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, aula_id)
);

comment on table public.anotacoes_da_aula is
  'Anotações pessoais de cada pessoa em uma aula. Só a própria pessoa lê e escreve.';

create trigger anotacoes_da_aula_atualizada
  before update on public.anotacoes_da_aula
  for each row execute function privado.atualizar_slides_do_usuario();

alter table public.anotacoes_da_aula enable row level security;
revoke all on public.anotacoes_da_aula from anon, authenticated;
grant select, insert, update, delete on public.anotacoes_da_aula to authenticated;

create policy "anotações da aula: cada um lê as suas"
  on public.anotacoes_da_aula for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "anotações da aula: cada um cria as suas"
  on public.anotacoes_da_aula for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and ((select privado.eh_professor()) or privado.pode_ver_aula(aula_id))
  );

create policy "anotações da aula: cada um muda as suas"
  on public.anotacoes_da_aula for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (
    usuario_id = (select auth.uid())
    and ((select privado.eh_professor()) or privado.pode_ver_aula(aula_id))
  );

create policy "anotações da aula: cada um apaga as suas"
  on public.anotacoes_da_aula for delete to authenticated
  using (usuario_id = (select auth.uid()));
