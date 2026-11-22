-- =============================================================================
-- Laboratório de código: exercícios, testes e entregas
-- -----------------------------------------------------------------------------
-- O código do aluno roda no navegador (Python com Pyodide; JavaScript, HTML e
-- CSS em moldura isolada). O banco guarda o exercício, os testes e as entregas.
--
-- Três tipos de teste:
-- * visível: o aluno vê a entrada e a saída esperada;
-- * oculto: o aluno recebe a entrada e só a "impressão digital" (SHA-256) da
--   saída esperada, nunca a saída;
-- * secreto: nunca vai para o aluno; o navegador do professor usa na
--   reconferência das entregas.
--
-- Entregar dá XP na hora, "a confirmar". A reconferência do professor confirma
-- ou retira o XP.
-- =============================================================================

create table public.exercicios (
  id bigint generated always as identity primary key,
  aula_id bigint not null references public.aulas (id) on delete cascade,
  titulo text not null check (char_length(trim(titulo)) between 1 and 160),
  enunciado text not null check (char_length(enunciado) between 1 and 20000),
  linguagem text not null default 'python' check (linguagem in ('python', 'javascript', 'html')),
  codigo_inicial text not null default '' check (char_length(codigo_inicial) <= 20000),
  -- 1 = fácil (20 XP), 2 = médio (35 XP), 3 = difícil (50 XP)
  dificuldade smallint not null default 1 check (dificuldade between 1 and 3),
  ordem smallint not null default 0,
  criado_em timestamptz not null default now()
);

create index on public.exercicios (aula_id, ordem);

alter table public.xp_eventos
  add constraint xp_eventos_exercicio_fk foreign key (exercicio_id) references public.exercicios (id) on delete set null;

-- Saída normalizada: quebras de linha do Windows viram \n, sem espaços no fim
-- das linhas e sem linhas vazias no fim. O site normaliza igual antes de comparar.
create or replace function privado.normalizar_saida(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select rtrim(regexp_replace(replace(coalesce(p_texto, ''), E'\r\n', E'\n'), '[ \t]+$', '', 'gn'), E'\n');
$$;

create or replace function privado.impressao_digital(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(privado.normalizar_saida(p_texto), 'UTF8')), 'hex');
$$;

create table public.testes (
  id bigint generated always as identity primary key,
  exercicio_id bigint not null references public.exercicios (id) on delete cascade,
  tipo text not null check (tipo in ('visivel', 'oculto', 'secreto')),
  entrada text not null default '' check (char_length(entrada) <= 10000),
  saida_esperada text not null check (char_length(saida_esperada) <= 10000),
  saida_hash text generated always as (privado.impressao_digital(saida_esperada)) stored,
  ordem smallint not null default 0
);

create index on public.testes (exercicio_id, tipo, ordem);

create table public.entregas (
  id bigint generated always as identity primary key,
  exercicio_id bigint not null references public.exercicios (id) on delete cascade,
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  codigo text not null check (char_length(codigo) between 1 and 20000),
  -- Resultado medido no navegador do aluno (visíveis + ocultos).
  testes_certos smallint not null check (testes_certos >= 0),
  testes_total smallint not null check (testes_total >= 0 and testes_certos <= testes_total),
  nota numeric(4, 1) not null check (nota between 0 and 10),
  tentativa smallint not null check (tentativa >= 1),
  situacao text not null default 'a_confirmar' check (situacao in ('a_confirmar', 'confirmada', 'nao_confere')),
  criado_em timestamptz not null default now(),
  conferida_em timestamptz,
  unique (exercicio_id, aluno_id, tentativa)
);

create index on public.entregas (aluno_id, exercicio_id);
create index on public.entregas (exercicio_id, situacao);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.exercicios enable row level security;
alter table public.testes enable row level security;
alter table public.entregas enable row level security;
revoke all on public.exercicios, public.testes, public.entregas from anon, authenticated;
grant select on public.exercicios, public.testes, public.entregas to authenticated;
grant insert, update, delete on public.exercicios, public.testes to authenticated;

create policy "exercícios: aluno lê os de aulas liberadas"
  on public.exercicios for select to authenticated
  using ((select privado.eh_professor()) or privado.pode_ver_aula(aula_id));

create policy "exercícios: professor escreve"
  on public.exercicios for all to authenticated
  using ((select privado.eh_professor())) with check ((select privado.eh_professor()));

-- A tabela de testes inteira (com saídas ocultas e secretas) é só do professor.
-- O aluno recebe os testes pela função testes_do_exercicio.
create policy "testes: só o professor"
  on public.testes for all to authenticated
  using ((select privado.eh_professor())) with check ((select privado.eh_professor()));

create policy "entregas: aluno lê as próprias, professor lê todas"
  on public.entregas for select to authenticated
  using (aluno_id = (select auth.uid()) or (select privado.eh_professor()));

-- -----------------------------------------------------------------------------
-- Testes para o navegador do aluno: visíveis completos e ocultos só com a
-- impressão digital. Secretos não saem daqui.
-- -----------------------------------------------------------------------------
create or replace function public.testes_do_exercicio(p_exercicio_id bigint)
returns table (id bigint, tipo text, entrada text, saida_esperada text, saida_hash text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.exercicios e
    where e.id = p_exercicio_id and (privado.eh_professor() or privado.pode_ver_aula(e.aula_id))
  ) then
    raise exception 'Este exercício ainda não foi liberado para a sua turma.' using errcode = '42501';
  end if;
  return query
    select t.id, t.tipo, t.entrada,
      case when t.tipo = 'visivel' then t.saida_esperada end,
      t.saida_hash
    from public.testes t
    where t.exercicio_id = p_exercicio_id and t.tipo in ('visivel', 'oculto')
    order by t.tipo desc, t.ordem, t.id;
end;
$$;

revoke all on function public.testes_do_exercicio(bigint) from public, anon;
grant execute on function public.testes_do_exercicio(bigint) to authenticated;

-- -----------------------------------------------------------------------------
-- Entregar: guarda o código e o resultado medido no navegador. Acertou tudo
-- pela primeira vez → XP na hora, "a confirmar".
-- -----------------------------------------------------------------------------
create or replace function public.entregar(p_exercicio_id bigint, p_codigo text, p_testes_certos integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aluno uuid := (select auth.uid());
  v_exercicio public.exercicios%rowtype;
  v_total integer;
  v_tentativa integer;
  v_entrega bigint;
  v_xp integer := 0;
  v_ganhos jsonb := '[]';
  v_id bigint;
begin
  if v_aluno is null or privado.eh_professor() then
    raise exception 'Só o aluno entrega exercícios.' using errcode = '42501';
  end if;
  select * into v_exercicio from public.exercicios where id = p_exercicio_id;
  if v_exercicio.id is null or not exists (
    select 1
    from public.liberacoes l
    join public.matriculas m on m.turma_disciplina_id = l.turma_disciplina_id
    where l.aula_id = v_exercicio.aula_id and m.aluno_id = v_aluno and m.status = 'aprovado'
  ) then
    raise exception 'Este exercício ainda não foi liberado para a sua turma.' using errcode = '42501';
  end if;
  if char_length(coalesce(p_codigo, '')) not between 1 and 20000 then
    raise exception 'Escreva o código antes de entregar (até 20 mil caracteres).' using errcode = '22023';
  end if;

  select count(*) into v_total from public.testes where exercicio_id = p_exercicio_id and tipo in ('visivel', 'oculto');
  if p_testes_certos is null or p_testes_certos < 0 or p_testes_certos > v_total then
    raise exception 'Resultado dos testes inválido.' using errcode = '22023';
  end if;

  select coalesce(max(tentativa), 0) + 1 into v_tentativa
  from public.entregas where exercicio_id = p_exercicio_id and aluno_id = v_aluno;

  insert into public.entregas (exercicio_id, aluno_id, codigo, testes_certos, testes_total, nota, tentativa)
  values (
    p_exercicio_id, v_aluno, p_codigo, p_testes_certos, v_total,
    case when v_total = 0 then 0 else round(10.0 * p_testes_certos / v_total, 1) end,
    v_tentativa
  )
  returning id into v_entrega;

  if v_total > 0 and p_testes_certos = v_total then
    v_xp := case v_exercicio.dificuldade when 1 then 20 when 2 then 35 else 50 end;
    insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, exercicio_id, aula_id, situacao)
    values (v_aluno, v_xp, 'exercicio', 'Resolveu ' || v_exercicio.titulo, p_exercicio_id, v_exercicio.aula_id, 'a_confirmar')
    on conflict do nothing
    returning id into v_id;
    if v_id is not null then
      v_ganhos := v_ganhos || jsonb_build_object('quantidade', v_xp, 'descricao', 'Exercício resolvido (a confirmar)');
    else
      v_xp := 0;
    end if;
  end if;

  return jsonb_build_object(
    'entrega_id', v_entrega,
    'tentativa', v_tentativa,
    'xp', v_xp,
    'ganhos', v_ganhos,
    'medalhas', to_jsonb(privado.conferir_medalhas(v_aluno))
  );
end;
$$;

revoke all on function public.entregar(bigint, text, integer) from public, anon;
grant execute on function public.entregar(bigint, text, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Reconferência pelo professor (o navegador dele roda todos os testes de novo)
-- -----------------------------------------------------------------------------
create or replace function public.conferir_entrega(p_entrega_id bigint, p_confere boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entrega public.entregas%rowtype;
begin
  perform privado.exigir_professor();
  select * into v_entrega from public.entregas where id = p_entrega_id;
  if v_entrega.id is null then
    raise exception 'Entrega não encontrada.' using errcode = 'P0002';
  end if;

  update public.entregas
  set situacao = case when p_confere then 'confirmada' else 'nao_confere' end, conferida_em = now()
  where id = p_entrega_id;

  -- O XP do exercício acompanha a entrega que acertou tudo.
  if v_entrega.testes_total > 0 and v_entrega.testes_certos = v_entrega.testes_total then
    update public.xp_eventos
    set situacao = case when p_confere then 'confirmado' else 'retirado' end
    where aluno_id = v_entrega.aluno_id
      and exercicio_id = v_entrega.exercicio_id
      and motivo = 'exercicio'
      and situacao = 'a_confirmar';
  end if;
end;
$$;

revoke all on function public.conferir_entrega(bigint, boolean) from public, anon;
grant execute on function public.conferir_entrega(bigint, boolean) to authenticated;
