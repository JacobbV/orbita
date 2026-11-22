-- =============================================================================
-- Disciplinas, turmas, unidades, aulas e materiais
-- -----------------------------------------------------------------------------
-- * Uma turma (ex.: 1º INFO M, ano letivo 2026) cursa uma ou mais disciplinas.
--   Cada par turma + disciplina é uma "oferta" (tabela turma_disciplinas).
-- * Disciplina -> unidades -> aulas. A quantidade de unidades e de aulas por
--   unidade é livre e o professor edita pelo painel.
-- * Títulos de disciplinas, turmas, unidades e aulas são públicos (não são
--   dados pessoais). O conteúdo das aulas fica em "materiais", que só quem tem
--   a aula liberada consegue ler (políticas na migration de liberações).
-- =============================================================================

create table public.disciplinas (
  id bigint generated always as identity primary key,
  sigla text not null unique check (sigla ~ '^[A-Z0-9]{2,10}$'),
  nome text not null check (char_length(trim(nome)) between 3 and 120),
  descricao text not null default '' check (char_length(descricao) <= 400),
  ordem int not null default 0,
  publica boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.turmas (
  id bigint generated always as identity primary key,
  nome text not null check (char_length(trim(nome)) between 2 and 40),
  serie smallint not null check (serie between 1 and 4),
  turno text not null check (turno in ('manha', 'tarde', 'noite')),
  ano_letivo smallint not null check (ano_letivo between 2020 and 2100),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  -- 1º INFO M 2026 e 1º INFO M 2027 convivem sem misturar alunos.
  unique (nome, ano_letivo)
);

comment on column public.turmas.ano_letivo is 'Editável pelo professor no painel.';

create table public.turma_disciplinas (
  id bigint generated always as identity primary key,
  turma_id bigint not null references public.turmas (id) on delete cascade,
  disciplina_id bigint not null references public.disciplinas (id) on delete cascade,
  unique (turma_id, disciplina_id)
);

comment on table public.turma_disciplinas is
  'Oferta: a disciplina X para a turma Y. Pedidos de acesso e liberações de aula são por oferta.';

create table public.unidades (
  id bigint generated always as identity primary key,
  disciplina_id bigint not null references public.disciplinas (id) on delete cascade,
  numero smallint not null check (numero between 1 and 20),
  titulo text not null check (char_length(trim(titulo)) between 1 and 120),
  unique (disciplina_id, numero) deferrable initially immediate
);

create table public.aulas (
  id bigint generated always as identity primary key,
  unidade_id bigint not null references public.unidades (id) on delete cascade,
  numero smallint not null check (numero between 1 and 60),
  titulo text not null check (char_length(trim(titulo)) between 1 and 160),
  -- Aula de amostra, aberta a qualquer visitante (para fases futuras).
  publica boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (unidade_id, numero) deferrable initially immediate
);

-- Conteúdo de cada aula. Na Fase 1 só existe o tipo 'link' (Drive, slides).
-- Os outros tipos já ficam previstos para o armazenamento privado das próximas fases.
create table public.materiais (
  id bigint generated always as identity primary key,
  aula_id bigint not null references public.aulas (id) on delete cascade,
  tipo text not null default 'link' check (tipo in ('link', 'slide', 'pdf', 'audio', 'video')),
  titulo text not null default 'Material da aula' check (char_length(trim(titulo)) between 1 and 120),
  url text check (url is null or url ~* '^https://[^\s]+$'),
  caminho_storage text check (caminho_storage is null or char_length(caminho_storage) <= 400),
  ordem smallint not null default 1,
  criado_em timestamptz not null default now(),
  -- Link precisa de URL; arquivo precisa de caminho no Storage.
  check (
    (tipo = 'link' and url is not null and caminho_storage is null)
    or (tipo <> 'link' and caminho_storage is not null)
  )
);

create index on public.turma_disciplinas (disciplina_id);
create index on public.unidades (disciplina_id);
create index on public.aulas (unidade_id);
create index on public.materiais (aula_id);

-- -----------------------------------------------------------------------------
-- RLS: todos leem a estrutura; só o professor escreve
-- -----------------------------------------------------------------------------
alter table public.disciplinas enable row level security;
alter table public.turmas enable row level security;
alter table public.turma_disciplinas enable row level security;
alter table public.unidades enable row level security;
alter table public.aulas enable row level security;
alter table public.materiais enable row level security;

revoke all on public.disciplinas, public.turmas, public.turma_disciplinas,
  public.unidades, public.aulas, public.materiais from anon, authenticated;

grant select on public.disciplinas, public.turmas, public.turma_disciplinas,
  public.unidades, public.aulas to anon, authenticated;
grant select on public.materiais to authenticated;
grant insert, update, delete on public.disciplinas, public.turmas, public.turma_disciplinas,
  public.unidades, public.aulas, public.materiais to authenticated;

-- Leitura pública (o cadastro precisa listar turmas e disciplinas antes do login)
create policy "disciplinas: todos leem as públicas"
  on public.disciplinas for select to anon, authenticated
  using (publica or (select privado.eh_professor()));

create policy "turmas: todos leem as ativas"
  on public.turmas for select to anon, authenticated
  using (ativa or (select privado.eh_professor()));

create policy "ofertas: todos leem"
  on public.turma_disciplinas for select to anon, authenticated
  using (true);

create policy "unidades: todos leem"
  on public.unidades for select to anon, authenticated
  using (true);

create policy "aulas: todos leem os títulos"
  on public.aulas for select to anon, authenticated
  using (true);

-- Escrita: só o professor (uma política por tabela, para insert/update/delete)
create policy "disciplinas: professor escreve"
  on public.disciplinas for all to authenticated
  using ((select privado.eh_professor())) with check ((select privado.eh_professor()));

create policy "turmas: professor escreve"
  on public.turmas for all to authenticated
  using ((select privado.eh_professor())) with check ((select privado.eh_professor()));

create policy "ofertas: professor escreve"
  on public.turma_disciplinas for all to authenticated
  using ((select privado.eh_professor())) with check ((select privado.eh_professor()));

create policy "unidades: professor escreve"
  on public.unidades for all to authenticated
  using ((select privado.eh_professor())) with check ((select privado.eh_professor()));

create policy "aulas: professor escreve"
  on public.aulas for all to authenticated
  using ((select privado.eh_professor())) with check ((select privado.eh_professor()));

create policy "materiais: professor faz tudo"
  on public.materiais for all to authenticated
  using ((select privado.eh_professor())) with check ((select privado.eh_professor()));
