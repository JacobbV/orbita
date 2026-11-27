-- =============================================================================
-- Marcador de página e rabiscos nos slides
-- -----------------------------------------------------------------------------
-- Cada pessoa (aluno ou professor) guarda, para cada slide de aula:
-- * o marcador "parei aqui" (número do slide), como a pontinha do Kindle;
-- * os rabiscos que fez em cima dos slides (lápis, marca-texto), por slide.
-- Tudo é pessoal: só a própria pessoa lê e escreve. O professor não vê os
-- rabiscos dos alunos, e um aluno não vê os dos colegas.
-- =============================================================================

create table public.slides_do_usuario (
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  material_id bigint not null references public.materiais (id) on delete cascade,
  -- Slide onde a pessoa parou (1 = primeiro). Null = sem marcador.
  marcador smallint check (marcador is null or marcador between 1 and 999),
  -- { "3": [ { "c": "#e11d48", "w": 6, "t": "l", "p": [x0, y0, x1, y1, ...] } ], ... }
  -- Coordenadas no palco de 1920 x 1080 do slide.
  rabiscos jsonb not null default '{}'::jsonb
    check (jsonb_typeof(rabiscos) = 'object' and octet_length(rabiscos::text) <= 400000),
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, material_id)
);

comment on table public.slides_do_usuario is
  'Marcador de página e rabiscos pessoais de cada pessoa em um slide. Só a própria pessoa lê e escreve.';

create or replace function privado.atualizar_slides_do_usuario()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger slides_do_usuario_atualizado
  before update on public.slides_do_usuario
  for each row execute function privado.atualizar_slides_do_usuario();

alter table public.slides_do_usuario enable row level security;
revoke all on public.slides_do_usuario from anon, authenticated;
grant select, insert, update, delete on public.slides_do_usuario to authenticated;

-- Só quem pode ver a aula do material (aluno com a aula liberada, ou professor)
-- guarda marcador e rabiscos nele.
create or replace function privado.pode_anotar_material(p_material_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.materiais m
    where m.id = p_material_id
      and m.tipo = 'slide'
      and ((select privado.eh_professor()) or privado.pode_ver_aula(m.aula_id))
  );
$$;

revoke all on function privado.pode_anotar_material(bigint) from public, anon;
grant execute on function privado.pode_anotar_material(bigint) to authenticated;

create policy "slides do usuário: cada um lê os seus"
  on public.slides_do_usuario for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "slides do usuário: cada um cria os seus"
  on public.slides_do_usuario for insert to authenticated
  with check (usuario_id = (select auth.uid()) and privado.pode_anotar_material(material_id));

create policy "slides do usuário: cada um muda os seus"
  on public.slides_do_usuario for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and privado.pode_anotar_material(material_id));

create policy "slides do usuário: cada um apaga os seus"
  on public.slides_do_usuario for delete to authenticated
  using (usuario_id = (select auth.uid()));
