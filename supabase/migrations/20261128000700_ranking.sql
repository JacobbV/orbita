-- =============================================================================
-- Ranking opcional por apelido
-- -----------------------------------------------------------------------------
-- * Ninguém entra por padrão: o aluno entra no ranking por escolha própria e
--   sai quando quiser (a saída vale na hora).
-- * Para entrar, precisa ter apelido sorteado e estar aprovado em alguma turma.
-- * Cada aluno vê só a própria turma (ex.: 1º INFO M) e só os colegas que
--   também entraram. Aparece apenas apelido, boneco, patente, XP e posição.
--   Nunca nome, e-mail ou turno.
-- * Duas medidas: "semana" (XP confirmado de segunda a domingo, no horário do
--   campus) e "geral" (todo o XP confirmado). XP "a confirmar" não conta.
-- * O aluno recebe no máximo 10 linhas (empates desempatam pelo apelido) e, se
--   estiver abaixo, a própria linha.
-- * Professor (e, portanto, o Modo Ninja) nunca aparece. O professor vê o
--   ranking completo de qualquer turma e pode tirar um aluno dele.
-- * Os colegas não leem a tabela de participantes: o ranking sai só pelas
--   funções abaixo, que conferem a turma de quem pede.
-- * Substitui a regra antiga "sem ranking" das migrations de gamificação e de
--   apelidos.
-- =============================================================================

create table public.ranking_participantes (
  aluno_id uuid primary key references public.perfis (id) on delete cascade,
  entrou_em timestamptz not null default now()
);

comment on table public.ranking_participantes is
  'Alunos que escolheram aparecer no ranking da turma (pelo apelido). Sem linha = fora do ranking.';

alter table public.ranking_participantes enable row level security;
revoke all on public.ranking_participantes from anon, authenticated;
grant select on public.ranking_participantes to authenticated;

create policy "ranking: aluno lê a própria linha, professor lê todas"
  on public.ranking_participantes for select to authenticated
  using (aluno_id = (select auth.uid()) or (select privado.eh_professor()));

-- -----------------------------------------------------------------------------
-- Primeiro dia da semana do ranking (segunda-feira, horário do campus)
-- -----------------------------------------------------------------------------
create or replace function privado.inicio_da_semana()
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('week', privado.hoje()::timestamp)::date;
$$;

revoke all on function privado.inicio_da_semana() from public;

-- O aluno está aprovado em alguma disciplina desta turma?
create or replace function privado.aluno_da_turma(p_aluno uuid, p_turma_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matriculas m
    join public.turma_disciplinas td on td.id = m.turma_disciplina_id
    where m.aluno_id = p_aluno and td.turma_id = p_turma_id and m.status = 'aprovado'
  );
$$;

revoke all on function privado.aluno_da_turma(uuid, bigint) from public;

-- -----------------------------------------------------------------------------
-- Classificação completa de uma turma (uso interno das funções públicas)
-- -----------------------------------------------------------------------------
create or replace function privado.classificacao(p_turma_id bigint, p_periodo text)
returns table (aluno_id uuid, apelido text, xp integer, posicao integer, ordem integer)
language sql
stable
security definer
set search_path = ''
as $$
  with participantes as (
    select p.id, p.apelido
    from public.ranking_participantes r
    join public.perfis p on p.id = r.aluno_id
    where p.papel = 'aluno'
      and p.apelido is not null
      and privado.aluno_da_turma(p.id, p_turma_id)
  ),
  pontos as (
    select pa.id, pa.apelido,
      coalesce((
        select sum(e.quantidade)
        from public.xp_eventos e
        where e.aluno_id = pa.id
          and e.situacao = 'confirmado'
          and (p_periodo = 'geral'
               or (e.criado_em at time zone 'America/Fortaleza')::date >= privado.inicio_da_semana())
      ), 0)::integer as xp
    from participantes pa
  )
  -- posicao: empates dividem a posição; ordem: desempata pelo apelido (limita o top 10 mesmo com empate).
  select id, apelido, xp, (rank() over (order by xp desc))::integer,
    (row_number() over (order by xp desc, apelido))::integer
  from pontos;
$$;

revoke all on function privado.classificacao(bigint, text) from public;

-- -----------------------------------------------------------------------------
-- Situação de quem está logado
-- -----------------------------------------------------------------------------
create or replace function public.minha_situacao_no_ranking()
returns table (participando boolean, tem_apelido boolean, pode_entrar boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := (select auth.uid());
begin
  if v_id is null then
    raise exception 'Entre na sua conta para ver o ranking.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      exists (select 1 from public.ranking_participantes where aluno_id = v_id),
      p.apelido is not null,
      p.papel = 'aluno'
        and exists (select 1 from public.matriculas m where m.aluno_id = v_id and m.status = 'aprovado')
    from public.perfis p
    where p.id = v_id;
end;
$$;

revoke all on function public.minha_situacao_no_ranking() from public, anon;
grant execute on function public.minha_situacao_no_ranking() to authenticated;

-- -----------------------------------------------------------------------------
-- Entrar e sair (só a própria conta)
-- -----------------------------------------------------------------------------
create or replace function public.entrar_no_ranking()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := (select auth.uid());
  v_perfil public.perfis;
begin
  if v_id is null then
    raise exception 'Entre na sua conta para participar do ranking.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_perfil from public.perfis where id = v_id;
  if v_perfil.papel <> 'aluno' then
    raise exception 'O professor não participa do ranking.' using errcode = 'insufficient_privilege';
  end if;
  if v_perfil.apelido is null then
    raise exception 'Sorteie um apelido antes de entrar no ranking.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.matriculas where aluno_id = v_id and status = 'aprovado') then
    raise exception 'O ranking abre depois que o professor aprovar seu pedido.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.ranking_participantes (aluno_id) values (v_id) on conflict (aluno_id) do nothing;
end;
$$;

revoke all on function public.entrar_no_ranking() from public, anon;
grant execute on function public.entrar_no_ranking() to authenticated;

create or replace function public.sair_do_ranking()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para sair do ranking.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.ranking_participantes where aluno_id = (select auth.uid());
end;
$$;

revoke all on function public.sair_do_ranking() from public, anon;
grant execute on function public.sair_do_ranking() to authenticated;

-- -----------------------------------------------------------------------------
-- Ranking para os alunos da turma: top 10 + a própria linha. Só apelido,
-- boneco, patente, XP e posição.
-- -----------------------------------------------------------------------------
create or replace function public.ranking_da_turma(p_turma_id bigint, p_periodo text default 'semana')
returns table (posicao integer, apelido text, escolhas jsonb, patente text, xp integer, eh_voce boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := (select auth.uid());
begin
  if v_id is null then
    raise exception 'Entre na sua conta para ver o ranking.' using errcode = 'insufficient_privilege';
  end if;
  if p_periodo is null or p_periodo not in ('semana', 'geral') then
    raise exception 'Escolha o ranking da semana ou o geral.' using errcode = 'invalid_parameter_value';
  end if;
  if not ((select privado.eh_professor()) or privado.aluno_da_turma(v_id, p_turma_id)) then
    raise exception 'Você só vê o ranking da sua turma.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select c.posicao, c.apelido, a.escolhas, privado.patente_de(privado.xp_total(c.aluno_id)), c.xp,
      c.aluno_id = v_id
    from privado.classificacao(p_turma_id, p_periodo) c
    left join public.avatares a on a.perfil_id = c.aluno_id
    where c.ordem <= 10 or c.aluno_id = v_id
    order by c.ordem;
end;
$$;

revoke all on function public.ranking_da_turma(bigint, text) from public, anon;
grant execute on function public.ranking_da_turma(bigint, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Professor: ranking completo da turma (com o nome, que só ele vê) e
-- a opção de tirar um aluno do ranking.
-- -----------------------------------------------------------------------------
create or replace function public.ranking_da_turma_professor(p_turma_id bigint, p_periodo text default 'semana')
returns table (aluno_id uuid, nome text, apelido text, posicao integer, xp integer, patente text, entrou_em timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  if p_periodo is null or p_periodo not in ('semana', 'geral') then
    raise exception 'Escolha o ranking da semana ou o geral.' using errcode = 'invalid_parameter_value';
  end if;
  return query
    select c.aluno_id, p.nome, c.apelido, c.posicao, c.xp,
      privado.patente_de(privado.xp_total(c.aluno_id)), r.entrou_em
    from privado.classificacao(p_turma_id, p_periodo) c
    join public.perfis p on p.id = c.aluno_id
    join public.ranking_participantes r on r.aluno_id = c.aluno_id
    order by c.ordem;
end;
$$;

revoke all on function public.ranking_da_turma_professor(bigint, text) from public, anon;
grant execute on function public.ranking_da_turma_professor(bigint, text) to authenticated;

create or replace function public.tirar_do_ranking(p_aluno_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  delete from public.ranking_participantes where aluno_id = p_aluno_id;
end;
$$;

revoke all on function public.tirar_do_ranking(uuid) from public, anon;
grant execute on function public.tirar_do_ranking(uuid) to authenticated;
