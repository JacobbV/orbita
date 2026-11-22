-- =============================================================================
-- Gamificação: XP, patentes, medalhas e avatares
-- -----------------------------------------------------------------------------
-- * O XP é uma lista de eventos (xp_eventos). O total é a soma dos eventos que
--   não foram retirados. Só o banco cria eventos, pelas funções abaixo.
-- * O aluno ganha XP só com aulas liberadas para a turma em que está aprovado,
--   e cada aula dá XP uma vez só.
-- * Sem ranking: o aluno lê só o próprio XP; o professor lê o de todos.
-- * Avatar: peças escolhidas por camada, conferidas pelo banco (camada certa,
--   peça permitida para o papel e XP suficiente).
-- =============================================================================

-- Dia de hoje no horário do campus (Catolé do Rocha, UTC-3).
create or replace function privado.hoje()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Fortaleza')::date;
$$;

-- -----------------------------------------------------------------------------
-- Patentes
-- -----------------------------------------------------------------------------
create table public.patentes (
  nivel smallint primary key check (nivel between 1 and 20),
  nome text not null unique,
  xp_minimo integer not null unique check (xp_minimo >= 0)
);

comment on table public.patentes is 'Patentes da nave, da menor para a maior, pelo XP mínimo.';

insert into public.patentes (nivel, nome, xp_minimo) values
  (1, 'Cadete', 0),
  (2, 'Piloto', 100),
  (3, 'Navegador', 250),
  (4, 'Engenheiro de Bordo', 500),
  (5, 'Comandante', 900),
  (6, 'Almirante Galáctico', 1500);

alter table public.patentes enable row level security;
revoke all on public.patentes from anon, authenticated;
grant select on public.patentes to anon, authenticated;
create policy "patentes: todos leem" on public.patentes for select to anon, authenticated using (true);

-- -----------------------------------------------------------------------------
-- Eventos de XP
-- -----------------------------------------------------------------------------
create table public.xp_eventos (
  id bigint generated always as identity primary key,
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  quantidade integer not null check (quantidade between 1 and 500),
  motivo text not null check (motivo in ('aula', 'sequencia', 'professor', 'exercicio')),
  descricao text not null check (char_length(trim(descricao)) between 1 and 200),
  aula_id bigint references public.aulas (id) on delete set null,
  -- Dia da sequência de estudo premiada (motivo 'sequencia').
  referencia_dia date,
  -- Exercício que deu o XP (motivo 'exercicio'); a chave estrangeira vem na migration do laboratório.
  exercicio_id bigint,
  dado_por uuid references public.perfis (id) on delete set null,
  situacao text not null default 'confirmado' check (situacao in ('confirmado', 'a_confirmar', 'retirado')),
  criado_em timestamptz not null default now(),
  check (motivo <> 'aula' or aula_id is not null),
  check (motivo <> 'sequencia' or referencia_dia is not null),
  check (motivo <> 'exercicio' or exercicio_id is not null),
  check (motivo <> 'professor' or dado_por is not null)
);

comment on table public.xp_eventos is 'Cada ganho de XP de um aluno. O total é a soma dos que não foram retirados.';

-- Cada aula dá XP uma vez; cada sequência premiada, uma vez por dia.
create unique index xp_uma_vez_por_aula on public.xp_eventos (aluno_id, aula_id) where motivo = 'aula';
create unique index xp_uma_vez_por_sequencia on public.xp_eventos (aluno_id, referencia_dia) where motivo = 'sequencia';
create unique index xp_uma_vez_por_exercicio on public.xp_eventos (aluno_id, exercicio_id)
  where motivo = 'exercicio' and situacao <> 'retirado';
create index on public.xp_eventos (aluno_id);

alter table public.xp_eventos enable row level security;
revoke all on public.xp_eventos from anon, authenticated;
grant select on public.xp_eventos to authenticated;

create policy "xp: aluno lê o próprio, professor lê todos"
  on public.xp_eventos for select to authenticated
  using (aluno_id = (select auth.uid()) or (select privado.eh_professor()));

-- Dias em que o aluno abriu alguma aula (para a sequência de estudo).
create table public.dias_de_estudo (
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  dia date not null,
  primary key (aluno_id, dia)
);

alter table public.dias_de_estudo enable row level security;
revoke all on public.dias_de_estudo from anon, authenticated;
grant select on public.dias_de_estudo to authenticated;

create policy "dias de estudo: aluno lê os próprios, professor lê todos"
  on public.dias_de_estudo for select to authenticated
  using (aluno_id = (select auth.uid()) or (select privado.eh_professor()));

-- -----------------------------------------------------------------------------
-- Medalhas
-- -----------------------------------------------------------------------------
create table public.medalhas (
  codigo text primary key check (codigo ~ '^[a-z0-9-]{2,40}$'),
  nome text not null,
  descricao text not null,
  ordem smallint not null default 0
);

insert into public.medalhas (codigo, nome, descricao, ordem) values
  ('primeira-aula', 'Primeira Aula', 'Abriu a primeira aula liberada.', 1),
  ('maratonista', 'Maratonista', 'Estudou em 5 dias seguidos.', 2),
  ('unidade-completa', 'Unidade Completa', 'Abriu todas as aulas de uma unidade.', 3),
  ('destaque', 'Destaque da Aula', 'Recebeu XP do professor por participação.', 4);

create table public.medalhas_ganhas (
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  medalha text not null references public.medalhas (codigo) on delete cascade,
  ganha_em timestamptz not null default now(),
  primary key (aluno_id, medalha)
);

alter table public.medalhas enable row level security;
alter table public.medalhas_ganhas enable row level security;
revoke all on public.medalhas, public.medalhas_ganhas from anon, authenticated;
grant select on public.medalhas to anon, authenticated;
grant select on public.medalhas_ganhas to authenticated;

create policy "medalhas: todos leem" on public.medalhas for select to anon, authenticated using (true);
create policy "medalhas ganhas: aluno lê as próprias, professor lê todas"
  on public.medalhas_ganhas for select to authenticated
  using (aluno_id = (select auth.uid()) or (select privado.eh_professor()));

-- -----------------------------------------------------------------------------
-- Totais
-- -----------------------------------------------------------------------------
create or replace function privado.xp_total(p_aluno_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(quantidade), 0)::integer
  from public.xp_eventos
  where aluno_id = p_aluno_id and situacao <> 'retirado';
$$;

revoke all on function privado.xp_total(uuid) from public;

-- Progresso do aluno logado: XP, patente atual e quanto falta para a próxima.
create or replace function public.meu_progresso()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with total as (select privado.xp_total((select auth.uid())) as xp)
  select jsonb_build_object(
    'xp', t.xp,
    'nivel', atual.nivel,
    'patente', atual.nome,
    'xp_da_patente', atual.xp_minimo,
    'proxima', proxima.nome,
    'xp_da_proxima', proxima.xp_minimo
  )
  from total t
  cross join lateral (
    select nivel, nome, xp_minimo from public.patentes where xp_minimo <= t.xp order by xp_minimo desc limit 1
  ) atual
  left join lateral (
    select nome, xp_minimo from public.patentes where xp_minimo > t.xp order by xp_minimo limit 1
  ) proxima on true;
$$;

revoke all on function public.meu_progresso() from public, anon;
grant execute on function public.meu_progresso() to authenticated;

-- XP e patente dos alunos aprovados de uma turma (só o professor).
create or replace function public.xp_da_turma(p_turma_disciplina_id bigint)
returns table (aluno_id uuid, nome text, xp integer, patente text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  return query
    select p.id, p.nome, privado.xp_total(p.id),
      (select pt.nome from public.patentes pt where pt.xp_minimo <= privado.xp_total(p.id) order by pt.xp_minimo desc limit 1)
    from public.matriculas m
    join public.perfis p on p.id = m.aluno_id
    where m.turma_disciplina_id = p_turma_disciplina_id and m.status = 'aprovado'
    order by p.nome;
end;
$$;

revoke all on function public.xp_da_turma(bigint) from public, anon;
grant execute on function public.xp_da_turma(bigint) to authenticated;

-- -----------------------------------------------------------------------------
-- Medalhas: confere e entrega as que o aluno acabou de conquistar
-- -----------------------------------------------------------------------------
create or replace function privado.conferir_medalhas(p_aluno_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novas text[];
begin
  with merecidas as (
    select 'primeira-aula' as codigo
    where exists (select 1 from public.xp_eventos where aluno_id = p_aluno_id and motivo = 'aula')
    union all
    select 'maratonista'
    where exists (select 1 from public.xp_eventos where aluno_id = p_aluno_id and motivo = 'sequencia')
    union all
    select 'destaque'
    where exists (select 1 from public.xp_eventos where aluno_id = p_aluno_id and motivo = 'professor')
    union all
    select 'unidade-completa'
    where exists (
      select 1
      from public.unidades u
      where exists (select 1 from public.aulas a where a.unidade_id = u.id)
        and not exists (
          select 1 from public.aulas a
          where a.unidade_id = u.id
            and not exists (
              select 1 from public.xp_eventos e
              where e.aluno_id = p_aluno_id and e.motivo = 'aula' and e.aula_id = a.id
            )
        )
    )
  ),
  inseridas as (
    insert into public.medalhas_ganhas (aluno_id, medalha)
    select p_aluno_id, codigo from merecidas
    on conflict do nothing
    returning medalha
  )
  select coalesce(array_agg(medalha), '{}') into v_novas from inseridas;
  return v_novas;
end;
$$;

revoke all on function privado.conferir_medalhas(uuid) from public;

-- -----------------------------------------------------------------------------
-- O aluno abriu uma aula (slides ou link): XP da aula e da sequência de estudo
-- -----------------------------------------------------------------------------
-- Devolve o que o aluno ganhou agora, para o site mostrar o aviso de conquista:
-- {"xp": 10, "ganhos": [{"quantidade": 10, "descricao": "..."}], "medalhas": [...]}
create or replace function public.registrar_abertura_da_aula(p_aula_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aluno uuid := (select auth.uid());
  v_hoje date := privado.hoje();
  v_ganhos jsonb := '[]';
  v_seguidos integer := 0;
  v_dia date;
  v_titulo text;
  v_id bigint;
begin
  if v_aluno is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '42501';
  end if;
  -- Professor não ganha XP.
  if privado.eh_professor() then
    return jsonb_build_object('xp', 0, 'ganhos', v_ganhos, 'medalhas', '[]'::jsonb);
  end if;
  if not exists (
    select 1
    from public.liberacoes l
    join public.matriculas m on m.turma_disciplina_id = l.turma_disciplina_id
    where l.aula_id = p_aula_id and m.aluno_id = v_aluno and m.status = 'aprovado'
  ) then
    raise exception 'Esta aula ainda não foi liberada para a sua turma.' using errcode = '42501';
  end if;

  select titulo into v_titulo from public.aulas where id = p_aula_id;

  insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, aula_id)
  values (v_aluno, 10, 'aula', 'Abriu a aula ' || v_titulo, p_aula_id)
  on conflict do nothing
  returning id into v_id;
  if v_id is not null then
    v_ganhos := v_ganhos || jsonb_build_object('quantidade', 10, 'descricao', 'Primeira vez nesta aula');
  end if;

  insert into public.dias_de_estudo (aluno_id, dia) values (v_aluno, v_hoje) on conflict do nothing;

  -- Dias seguidos até hoje; a cada 5, um prêmio de sequência.
  v_dia := v_hoje;
  while exists (select 1 from public.dias_de_estudo where aluno_id = v_aluno and dia = v_dia) loop
    v_seguidos := v_seguidos + 1;
    v_dia := v_dia - 1;
  end loop;
  if v_seguidos > 0 and v_seguidos % 5 = 0 then
    v_id := null;
    insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, referencia_dia)
    values (v_aluno, 30, 'sequencia', v_seguidos || ' dias seguidos estudando', v_hoje)
    on conflict do nothing
    returning id into v_id;
    if v_id is not null then
      v_ganhos := v_ganhos || jsonb_build_object('quantidade', 30, 'descricao', v_seguidos || ' dias seguidos estudando');
    end if;
  end if;

  return jsonb_build_object(
    'xp', (select coalesce(sum((g ->> 'quantidade')::integer), 0) from jsonb_array_elements(v_ganhos) g),
    'ganhos', v_ganhos,
    'medalhas', to_jsonb(privado.conferir_medalhas(v_aluno))
  );
end;
$$;

revoke all on function public.registrar_abertura_da_aula(bigint) from public, anon;
grant execute on function public.registrar_abertura_da_aula(bigint) to authenticated;

-- -----------------------------------------------------------------------------
-- XP dado pelo professor (participação, desafio em sala)
-- -----------------------------------------------------------------------------
create or replace function public.dar_xp(p_aluno_id uuid, p_quantidade integer, p_descricao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  if p_quantidade is null or p_quantidade not between 1 and 100 then
    raise exception 'Escolha de 1 a 100 XP.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_descricao, ''))) not between 1 and 200 then
    raise exception 'Escreva o motivo do XP.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.matriculas where aluno_id = p_aluno_id and status = 'aprovado') then
    raise exception 'Aluno não encontrado entre os aprovados.' using errcode = 'P0002';
  end if;
  insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, dado_por)
  values (p_aluno_id, p_quantidade, 'professor', trim(p_descricao), (select auth.uid()));
  perform privado.conferir_medalhas(p_aluno_id);
end;
$$;

revoke all on function public.dar_xp(uuid, integer, text) from public, anon;
grant execute on function public.dar_xp(uuid, integer, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Avatares
-- -----------------------------------------------------------------------------
create table public.pecas (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  camada text not null check (camada in ('corpo', 'pele', 'rosto', 'cabelo', 'cor-do-cabelo', 'roupa', 'acessorio')),
  nome text not null,
  -- Quem pode usar: aluno, professor ou todos.
  para text not null default 'todos' check (para in ('aluno', 'professor', 'todos')),
  xp_minimo integer not null default 0 check (xp_minimo >= 0),
  ordem smallint not null default 0
);

comment on table public.pecas is 'Catálogo das peças do avatar (arte original do Órbita, todos os direitos reservados).';

create table public.avatares (
  perfil_id uuid primary key references public.perfis (id) on delete cascade,
  -- Uma peça por camada: {"corpo": "...", "pele": "...", ...}
  escolhas jsonb not null check (jsonb_typeof(escolhas) = 'object'),
  atualizado_em timestamptz not null default now()
);

alter table public.pecas enable row level security;
alter table public.avatares enable row level security;
revoke all on public.pecas, public.avatares from anon, authenticated;
grant select on public.pecas to anon, authenticated;
grant insert, update, delete on public.pecas to authenticated;
grant select on public.avatares to authenticated;

create policy "peças: todos leem" on public.pecas for select to anon, authenticated using (true);
create policy "peças: professor escreve"
  on public.pecas for all to authenticated
  using ((select privado.eh_professor())) with check ((select privado.eh_professor()));

-- Este perfil é de professor? (security definer: o aluno não lê os perfis dos outros)
create or replace function privado.perfil_eh_professor(p_perfil_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfis where id = p_perfil_id and papel = 'professor');
$$;

revoke all on function privado.perfil_eh_professor(uuid) from public;
grant execute on function privado.perfil_eh_professor(uuid) to authenticated;

-- O avatar do professor aparece para os alunos; o de cada aluno, só para ele e o professor.
create policy "avatares: o próprio, o do professor e, para o professor, todos"
  on public.avatares for select to authenticated
  using (
    perfil_id = (select auth.uid())
    or (select privado.eh_professor())
    or privado.perfil_eh_professor(perfil_id)
  );

-- Salva o avatar de quem está logado, conferindo cada peça.
create or replace function public.salvar_avatar(p_escolhas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil uuid := (select auth.uid());
  v_papel text;
  v_xp integer;
  v_camada text;
  v_peca text;
  v_ok boolean;
begin
  select papel into v_papel from public.perfis where id = v_perfil;
  if v_papel is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '42501';
  end if;
  if p_escolhas is null or jsonb_typeof(p_escolhas) <> 'object' then
    raise exception 'Avatar inválido.' using errcode = '22023';
  end if;
  v_xp := case when v_papel = 'professor' then 2147483647 else privado.xp_total(v_perfil) end;

  for v_camada, v_peca in select key, value #>> '{}' from jsonb_each(p_escolhas) loop
    select exists (
      select 1 from public.pecas
      where id = v_peca and camada = v_camada
        and (para = 'todos' or para = v_papel)
        and xp_minimo <= v_xp
    ) into v_ok;
    if not v_ok then
      raise exception 'Peça indisponível: %.', coalesce(v_peca, v_camada) using errcode = '22023';
    end if;
  end loop;

  insert into public.avatares (perfil_id, escolhas) values (v_perfil, p_escolhas)
  on conflict (perfil_id) do update set escolhas = excluded.escolhas, atualizado_em = now();
end;
$$;

revoke all on function public.salvar_avatar(jsonb) from public, anon;
grant execute on function public.salvar_avatar(jsonb) to authenticated;
