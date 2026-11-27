-- =============================================================================
-- Fase 4: provas e modo prova
-- -----------------------------------------------------------------------------
-- * O professor monta a prova de uma turma (oferta): horário de abrir e de
--   fechar, duração e questões de código com peso. As questões são exercícios
--   do laboratório: das aulas ou só da prova (sem aula, nunca aparecem na ponte).
-- * O aluno começa dentro do horário e tem a duração (sem passar do horário de
--   fechar). Pode responder cada questão quantas vezes quiser: vale a última.
-- * A saída da aba é registrada. O professor escolhe, por prova, se só avisa
--   (padrão) ou se encerra a prova na 1ª, 2ª ou 3ª saída. O site detecta a
--   saída, mas não a impede.
-- * A nota só aparece para o aluno depois que o professor publicar, e o
--   professor reconfere as respostas antes, com os testes secretos.
-- * Prova não dá XP.
-- * Segunda chamada: o professor libera a prova de novo para um aluno, com
--   horário só dele (a tentativa anterior, se houver, é apagada).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Questões só da prova: exercício sem aula
-- -----------------------------------------------------------------------------
alter table public.exercicios alter column aula_id drop not null;

comment on column public.exercicios.aula_id is
  'Aula do exercício. Null = questão só de prova (não aparece na ponte e o aluno só a vê durante a prova).';

-- salvar_exercicio aceita aula nula (questão só de prova).
create or replace function public.salvar_exercicio(
  p_id bigint,
  p_aula_id bigint,
  p_titulo text,
  p_enunciado text,
  p_dificuldade integer,
  p_codigo_inicial text,
  p_testes jsonb,
  p_linguagem text default 'python'
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_teste jsonb;
  v_ordem integer := 0;
  v_abertos integer;
begin
  perform privado.exigir_professor();

  if char_length(trim(coalesce(p_titulo, ''))) not between 1 and 160 then
    raise exception 'Escreva o título do exercício (até 160 letras).' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_enunciado, ''))) = 0 or char_length(p_enunciado) > 20000 then
    raise exception 'Escreva o enunciado do exercício.' using errcode = '22023';
  end if;
  if coalesce(p_linguagem, '') not in ('python', 'javascript', 'html') then
    raise exception 'Escolha a linguagem: Python, JavaScript ou HTML e CSS.' using errcode = '22023';
  end if;
  if p_dificuldade is null or p_dificuldade not between 1 and 3 then
    raise exception 'Escolha a dificuldade.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_codigo_inicial, '')) > 20000 then
    raise exception 'O código inicial passou do limite de 20 mil letras.' using errcode = '22023';
  end if;
  if p_testes is null or jsonb_typeof(p_testes) <> 'array' or jsonb_array_length(p_testes) not between 1 and 30 then
    raise exception 'Coloque de 1 a 30 testes.' using errcode = '22023';
  end if;
  for v_teste in select value from jsonb_array_elements(p_testes) loop
    if jsonb_typeof(v_teste) <> 'object'
      or coalesce(v_teste ->> 'tipo', '') not in ('visivel', 'oculto', 'secreto')
      or v_teste ->> 'saida_esperada' is null
      or char_length(v_teste ->> 'saida_esperada') > 10000
      or char_length(coalesce(v_teste ->> 'entrada', '')) > 10000
    then
      raise exception 'Confira os testes: cada um precisa do tipo e da saída esperada.' using errcode = '22023';
    end if;
  end loop;
  select count(*) into v_abertos from jsonb_array_elements(p_testes) t where t.value ->> 'tipo' in ('visivel', 'oculto');
  if v_abertos = 0 then
    raise exception 'Coloque pelo menos um teste visível ou oculto: é com eles que o aluno confere o código.' using errcode = '22023';
  end if;

  if p_id is null then
    -- Sem aula = questão só de prova.
    if p_aula_id is not null and not exists (select 1 from public.aulas where id = p_aula_id) then
      raise exception 'Aula não encontrada.' using errcode = 'P0002';
    end if;
    insert into public.exercicios (aula_id, titulo, enunciado, codigo_inicial, dificuldade, linguagem, ordem)
    values (
      p_aula_id, trim(p_titulo), p_enunciado, coalesce(p_codigo_inicial, ''), p_dificuldade, p_linguagem,
      coalesce((select max(ordem) + 1 from public.exercicios where aula_id is not distinct from p_aula_id), 0)
    )
    returning id into v_id;
  else
    update public.exercicios
    set titulo = trim(p_titulo), enunciado = p_enunciado, codigo_inicial = coalesce(p_codigo_inicial, ''),
        dificuldade = p_dificuldade, linguagem = p_linguagem
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Exercício não encontrado.' using errcode = 'P0002';
    end if;
    delete from public.testes where exercicio_id = v_id;
  end if;

  for v_teste in select value from jsonb_array_elements(p_testes) loop
    insert into public.testes (exercicio_id, tipo, entrada, saida_esperada, ordem)
    values (v_id, v_teste ->> 'tipo', coalesce(v_teste ->> 'entrada', ''), v_teste ->> 'saida_esperada', v_ordem);
    v_ordem := v_ordem + 1;
  end loop;
  return v_id;
end;
$$;

revoke all on function public.salvar_exercicio(bigint, bigint, text, text, integer, text, jsonb, text) from public, anon;
grant execute on function public.salvar_exercicio(bigint, bigint, text, text, integer, text, jsonb, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------
create table public.provas (
  id bigint generated always as identity primary key,
  turma_disciplina_id bigint not null references public.turma_disciplinas (id) on delete cascade,
  titulo text not null check (char_length(trim(titulo)) between 1 and 160),
  instrucoes text not null default '' check (char_length(instrucoes) <= 5000),
  abre_em timestamptz not null,
  fecha_em timestamptz not null,
  duracao_min smallint not null check (duracao_min between 5 and 600),
  -- null = só avisar; 1, 2 ou 3 = encerra a prova nessa saída da aba
  saidas_para_encerrar smallint check (saidas_para_encerrar between 1 and 3),
  notas_publicadas_em timestamptz,
  criado_em timestamptz not null default now(),
  check (fecha_em > abre_em)
);

create index on public.provas (turma_disciplina_id, abre_em);

create table public.prova_questoes (
  id bigint generated always as identity primary key,
  prova_id bigint not null references public.provas (id) on delete cascade,
  exercicio_id bigint not null references public.exercicios (id) on delete restrict,
  peso numeric(4, 1) not null default 1 check (peso > 0 and peso <= 100),
  ordem smallint not null default 0,
  unique (prova_id, exercicio_id)
);

create table public.prova_segunda_chamada (
  prova_id bigint not null references public.provas (id) on delete cascade,
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  abre_em timestamptz not null,
  fecha_em timestamptz not null,
  criado_em timestamptz not null default now(),
  primary key (prova_id, aluno_id),
  check (fecha_em > abre_em)
);

create table public.prova_tentativas (
  id bigint generated always as identity primary key,
  prova_id bigint not null references public.provas (id) on delete cascade,
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  comecou_em timestamptz not null default now(),
  -- Fim do tempo: começo + duração, sem passar do horário de fechar.
  termina_em timestamptz not null,
  entregue_em timestamptz,
  encerrada_por text check (encerrada_por in ('aluno', 'tempo', 'saidas')),
  saidas smallint not null default 0,
  unique (prova_id, aluno_id)
);

create table public.prova_respostas (
  id bigint generated always as identity primary key,
  tentativa_id bigint not null references public.prova_tentativas (id) on delete cascade,
  questao_id bigint not null references public.prova_questoes (id) on delete cascade,
  codigo text not null check (char_length(codigo) between 1 and 20000),
  testes_certos smallint not null check (testes_certos >= 0),
  testes_total smallint not null check (testes_total >= 0 and testes_certos <= testes_total),
  nota numeric(4, 1) not null check (nota between 0 and 10),
  respostas smallint not null default 1 check (respostas >= 1),
  situacao text not null default 'a_confirmar' check (situacao in ('a_confirmar', 'confirmada', 'nao_confere')),
  respondida_em timestamptz not null default now(),
  conferida_em timestamptz,
  unique (tentativa_id, questao_id)
);

create table public.prova_saidas (
  id bigint generated always as identity primary key,
  tentativa_id bigint not null references public.prova_tentativas (id) on delete cascade,
  saiu_em timestamptz not null default now(),
  voltou_em timestamptz
);

create index on public.prova_saidas (tentativa_id, saiu_em);

-- -----------------------------------------------------------------------------
-- RLS: escrita só pelas funções; leitura do aluno só do que é dele
-- -----------------------------------------------------------------------------
alter table public.provas enable row level security;
alter table public.prova_questoes enable row level security;
alter table public.prova_segunda_chamada enable row level security;
alter table public.prova_tentativas enable row level security;
alter table public.prova_respostas enable row level security;
alter table public.prova_saidas enable row level security;

revoke all on public.provas, public.prova_questoes, public.prova_segunda_chamada,
  public.prova_tentativas, public.prova_respostas, public.prova_saidas from anon, authenticated;
grant select on public.provas, public.prova_questoes, public.prova_segunda_chamada,
  public.prova_tentativas, public.prova_respostas, public.prova_saidas to authenticated;

create policy "provas: professor lê todas, aluno lê as da sua turma"
  on public.provas for select to authenticated
  using ((select privado.eh_professor()) or privado.aprovado_na_oferta(turma_disciplina_id));

-- As questões (com os exercícios) só chegam ao aluno pela função questoes_da_prova.
create policy "questões da prova: só o professor"
  on public.prova_questoes for select to authenticated
  using ((select privado.eh_professor()));

create policy "segunda chamada: professor e o próprio aluno"
  on public.prova_segunda_chamada for select to authenticated
  using ((select privado.eh_professor()) or aluno_id = (select auth.uid()));

create policy "tentativas: professor e o próprio aluno"
  on public.prova_tentativas for select to authenticated
  using ((select privado.eh_professor()) or aluno_id = (select auth.uid()));

-- O aluno não lê as respostas pela tabela (a nota só sai depois de publicada).
create policy "respostas: só o professor"
  on public.prova_respostas for select to authenticated
  using ((select privado.eh_professor()));

create policy "saídas: professor e o próprio aluno"
  on public.prova_saidas for select to authenticated
  using (
    (select privado.eh_professor())
    or exists (select 1 from public.prova_tentativas t where t.id = tentativa_id and t.aluno_id = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- Funções internas
-- -----------------------------------------------------------------------------

-- Horário da prova para um aluno (o da segunda chamada, se houver).
create or replace function privado.janela_da_prova(p_prova_id bigint, p_aluno uuid)
returns table (abre_em timestamptz, fecha_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(s.abre_em, p.abre_em), coalesce(s.fecha_em, p.fecha_em)
  from public.provas p
  left join public.prova_segunda_chamada s on s.prova_id = p.id and s.aluno_id = p_aluno
  where p.id = p_prova_id;
$$;

revoke all on function privado.janela_da_prova(bigint, uuid) from public;

-- Fecha a tentativa cujo tempo acabou (a prova vai entregue sozinha).
create or replace function privado.fechar_se_acabou(p_tentativa_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.prova_tentativas
  set entregue_em = termina_em, encerrada_por = 'tempo'
  where id = p_tentativa_id and entregue_em is null and termina_em <= now();
$$;

revoke all on function privado.fechar_se_acabou(bigint) from public;

-- Tentativa em andamento do aluno logado (erro se não houver).
create or replace function privado.tentativa_em_andamento(p_prova_id bigint)
returns public.prova_tentativas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tentativa public.prova_tentativas%rowtype;
begin
  select * into v_tentativa from public.prova_tentativas
  where prova_id = p_prova_id and aluno_id = (select auth.uid());
  if v_tentativa.id is null then
    raise exception 'Comece a prova primeiro.' using errcode = '42501';
  end if;
  perform privado.fechar_se_acabou(v_tentativa.id);
  select * into v_tentativa from public.prova_tentativas where id = v_tentativa.id;
  if v_tentativa.entregue_em is not null then
    raise exception 'A prova já foi entregue.' using errcode = '55000';
  end if;
  return v_tentativa;
end;
$$;

revoke all on function privado.tentativa_em_andamento(bigint) from public;

-- Nota final (0 a 10) de uma tentativa: média ponderada das questões.
-- Questão sem resposta ou marcada "não confere" conta zero.
create or replace function privado.nota_da_tentativa(p_tentativa_id bigint)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case when sum(q.peso) > 0 then
    round(sum(q.peso * coalesce(case when r.situacao = 'nao_confere' then 0 else r.nota end, 0)) / sum(q.peso), 1)
  else 0 end
  from public.prova_tentativas t
  join public.prova_questoes q on q.prova_id = t.prova_id
  left join public.prova_respostas r on r.tentativa_id = t.id and r.questao_id = q.id
  where t.id = p_tentativa_id;
$$;

revoke all on function privado.nota_da_tentativa(bigint) from public;

-- -----------------------------------------------------------------------------
-- Professor: montar a prova
-- -----------------------------------------------------------------------------
create or replace function public.salvar_prova(
  p_id bigint,
  p_turma_disciplina_id bigint,
  p_titulo text,
  p_instrucoes text,
  p_abre_em timestamptz,
  p_fecha_em timestamptz,
  p_duracao_min integer,
  p_saidas_para_encerrar integer,
  p_questoes jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_questao jsonb;
  v_ordem integer := 0;
  v_comecou boolean;
  v_mudou boolean;
begin
  perform privado.exigir_professor();

  if char_length(trim(coalesce(p_titulo, ''))) not between 1 and 160 then
    raise exception 'Escreva o título da prova (até 160 letras).' using errcode = '22023';
  end if;
  if char_length(coalesce(p_instrucoes, '')) > 5000 then
    raise exception 'As instruções passaram do limite de 5 mil letras.' using errcode = '22023';
  end if;
  if p_abre_em is null or p_fecha_em is null or p_fecha_em <= p_abre_em then
    raise exception 'O horário de fechar precisa ser depois do horário de abrir.' using errcode = '22023';
  end if;
  if p_duracao_min is null or p_duracao_min not between 5 and 600 then
    raise exception 'A duração vai de 5 a 600 minutos.' using errcode = '22023';
  end if;
  if p_saidas_para_encerrar is not null and p_saidas_para_encerrar not between 1 and 3 then
    raise exception 'Escolha encerrar na 1ª, 2ª ou 3ª saída, ou só avisar.' using errcode = '22023';
  end if;
  if p_questoes is null or jsonb_typeof(p_questoes) <> 'array' or jsonb_array_length(p_questoes) not between 1 and 30 then
    raise exception 'Coloque de 1 a 30 questões na prova.' using errcode = '22023';
  end if;
  for v_questao in select value from jsonb_array_elements(p_questoes) loop
    if jsonb_typeof(v_questao) <> 'object'
      or jsonb_typeof(v_questao -> 'exercicio_id') <> 'number'
      or not exists (select 1 from public.exercicios where id = (v_questao ->> 'exercicio_id')::bigint)
    then
      raise exception 'Questão não encontrada.' using errcode = 'P0002';
    end if;
    if coalesce((v_questao ->> 'peso')::numeric, 1) <= 0 or coalesce((v_questao ->> 'peso')::numeric, 1) > 100 then
      raise exception 'O peso de cada questão vai de 0,1 a 100.' using errcode = '22023';
    end if;
  end loop;
  if (select count(distinct value ->> 'exercicio_id') from jsonb_array_elements(p_questoes)) <> jsonb_array_length(p_questoes) then
    raise exception 'A mesma questão aparece duas vezes na prova.' using errcode = '22023';
  end if;

  if p_id is null then
    if not exists (select 1 from public.turma_disciplinas where id = p_turma_disciplina_id) then
      raise exception 'Turma ou disciplina não encontrada.' using errcode = 'P0002';
    end if;
    insert into public.provas (turma_disciplina_id, titulo, instrucoes, abre_em, fecha_em, duracao_min, saidas_para_encerrar)
    values (p_turma_disciplina_id, trim(p_titulo), coalesce(p_instrucoes, ''), p_abre_em, p_fecha_em, p_duracao_min, p_saidas_para_encerrar)
    returning id into v_id;
  else
    select exists (select 1 from public.prova_tentativas where prova_id = p_id) into v_comecou;
    if v_comecou then
      -- Depois que algum aluno começou, as questões e os pesos ficam travados.
      select exists (
        select 1 from (
          select (value ->> 'exercicio_id')::bigint as exercicio_id, coalesce((value ->> 'peso')::numeric, 1) as peso,
                 (ordinality - 1)::smallint as ordem
          from jsonb_array_elements(p_questoes) with ordinality
        ) nova
        full join (select exercicio_id, peso, ordem from public.prova_questoes where prova_id = p_id) atual
          on atual.exercicio_id = nova.exercicio_id and atual.peso = nova.peso
        where atual.exercicio_id is null or nova.exercicio_id is null
      ) into v_mudou;
      if v_mudou then
        raise exception 'Algum aluno já começou a prova: as questões e os pesos não podem mudar.' using errcode = '55000';
      end if;
    end if;

    update public.provas
    set titulo = trim(p_titulo), instrucoes = coalesce(p_instrucoes, ''), abre_em = p_abre_em, fecha_em = p_fecha_em,
        duracao_min = p_duracao_min, saidas_para_encerrar = p_saidas_para_encerrar
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Prova não encontrada.' using errcode = 'P0002';
    end if;
    if v_comecou then
      return v_id;
    end if;
    delete from public.prova_questoes where prova_id = v_id;
  end if;

  for v_questao in select value from jsonb_array_elements(p_questoes) loop
    insert into public.prova_questoes (prova_id, exercicio_id, peso, ordem)
    values (v_id, (v_questao ->> 'exercicio_id')::bigint, coalesce((v_questao ->> 'peso')::numeric, 1), v_ordem);
    v_ordem := v_ordem + 1;
  end loop;
  return v_id;
end;
$$;

revoke all on function public.salvar_prova(bigint, bigint, text, text, timestamptz, timestamptz, integer, integer, jsonb) from public, anon;
grant execute on function public.salvar_prova(bigint, bigint, text, text, timestamptz, timestamptz, integer, integer, jsonb) to authenticated;

create or replace function public.remover_prova(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  if exists (select 1 from public.prova_tentativas where prova_id = p_id) then
    raise exception 'Esta prova já tem alunos que começaram e não pode ser removida.' using errcode = '55000';
  end if;
  -- Questões só desta prova (sem aula) somem junto, se nenhuma outra prova usa.
  delete from public.provas where id = p_id;
  if not found then
    raise exception 'Prova não encontrada.' using errcode = 'P0002';
  end if;
  delete from public.exercicios e
  where e.aula_id is null
    and not exists (select 1 from public.prova_questoes q where q.exercicio_id = e.id)
    and not exists (select 1 from public.entregas x where x.exercicio_id = e.id);
end;
$$;

revoke all on function public.remover_prova(bigint) from public, anon;
grant execute on function public.remover_prova(bigint) to authenticated;

-- Exercício usado em prova não pode ser removido.
create or replace function public.remover_exercicio(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  if exists (select 1 from public.entregas where exercicio_id = p_id) then
    raise exception 'Este exercício já tem entregas de alunos e não pode ser removido.' using errcode = '55000';
  end if;
  if exists (select 1 from public.prova_questoes where exercicio_id = p_id) then
    raise exception 'Este exercício está numa prova e não pode ser removido.' using errcode = '55000';
  end if;
  delete from public.exercicios where id = p_id;
  if not found then
    raise exception 'Exercício não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

-- Segunda chamada: horário só do aluno. A tentativa anterior é apagada.
create or replace function public.liberar_segunda_chamada(
  p_prova_id bigint,
  p_aluno_id uuid,
  p_abre_em timestamptz,
  p_fecha_em timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  if p_abre_em is null or p_fecha_em is null or p_fecha_em <= p_abre_em then
    raise exception 'O horário de fechar precisa ser depois do horário de abrir.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.provas p
    join public.matriculas m on m.turma_disciplina_id = p.turma_disciplina_id
    where p.id = p_prova_id and m.aluno_id = p_aluno_id and m.status = 'aprovado'
  ) then
    raise exception 'Aluno não encontrado entre os aprovados.' using errcode = 'P0002';
  end if;
  delete from public.prova_tentativas where prova_id = p_prova_id and aluno_id = p_aluno_id;
  insert into public.prova_segunda_chamada (prova_id, aluno_id, abre_em, fecha_em)
  values (p_prova_id, p_aluno_id, p_abre_em, p_fecha_em)
  on conflict (prova_id, aluno_id) do update set abre_em = excluded.abre_em, fecha_em = excluded.fecha_em, criado_em = now();
end;
$$;

revoke all on function public.liberar_segunda_chamada(bigint, uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.liberar_segunda_chamada(bigint, uuid, timestamptz, timestamptz) to authenticated;

-- Reconferência de uma resposta (o navegador do professor roda os secretos).
create or replace function public.conferir_resposta(p_resposta_id bigint, p_confere boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  update public.prova_respostas
  set situacao = case when p_confere then 'confirmada' else 'nao_confere' end, conferida_em = now()
  where id = p_resposta_id;
  if not found then
    raise exception 'Resposta não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.conferir_resposta(bigint, boolean) from public, anon;
grant execute on function public.conferir_resposta(bigint, boolean) to authenticated;

create or replace function public.publicar_notas(p_prova_id bigint, p_publicar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  update public.provas
  set notas_publicadas_em = case when p_publicar then now() end
  where id = p_prova_id;
  if not found then
    raise exception 'Prova não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.publicar_notas(bigint, boolean) from public, anon;
grant execute on function public.publicar_notas(bigint, boolean) to authenticated;

-- Situação de cada aluno aprovado na prova (ao vivo e depois).
create or replace function public.situacao_da_prova(p_prova_id bigint)
returns table (
  aluno_id uuid,
  nome text,
  apelido text,
  tentativa_id bigint,
  comecou_em timestamptz,
  termina_em timestamptz,
  entregue_em timestamptz,
  encerrada_por text,
  saidas smallint,
  respondidas integer,
  a_confirmar integer,
  nota numeric,
  segunda_chamada boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  -- Quem passou do tempo conta como entregue.
  perform privado.fechar_se_acabou(t.id) from public.prova_tentativas t where t.prova_id = p_prova_id;
  return query
    select p.id, p.nome, p.apelido, t.id, t.comecou_em, t.termina_em, t.entregue_em, t.encerrada_por, t.saidas,
      (select count(*)::integer from public.prova_respostas r where r.tentativa_id = t.id),
      (select count(*)::integer from public.prova_respostas r where r.tentativa_id = t.id and r.situacao = 'a_confirmar'),
      case when t.id is not null then privado.nota_da_tentativa(t.id) end,
      exists (select 1 from public.prova_segunda_chamada s where s.prova_id = p_prova_id and s.aluno_id = p.id)
    from public.provas pr
    join public.matriculas m on m.turma_disciplina_id = pr.turma_disciplina_id and m.status = 'aprovado'
    join public.perfis p on p.id = m.aluno_id
    left join public.prova_tentativas t on t.prova_id = pr.id and t.aluno_id = p.id
    where pr.id = p_prova_id
    order by p.nome;
end;
$$;

revoke all on function public.situacao_da_prova(bigint) from public, anon;
grant execute on function public.situacao_da_prova(bigint) to authenticated;

-- -----------------------------------------------------------------------------
-- Aluno: fazer a prova
-- -----------------------------------------------------------------------------

-- Provas das turmas do aluno, com o horário dele, a situação e a nota (se publicada).
create or replace function public.minhas_provas()
returns table (
  id bigint,
  turma_disciplina_id bigint,
  titulo text,
  instrucoes text,
  abre_em timestamptz,
  fecha_em timestamptz,
  duracao_min smallint,
  saidas_para_encerrar smallint,
  questoes integer,
  comecou_em timestamptz,
  termina_em timestamptz,
  entregue_em timestamptz,
  encerrada_por text,
  saidas smallint,
  nota numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aluno uuid := (select auth.uid());
begin
  if v_aluno is null then
    raise exception 'Entre na sua conta primeiro.' using errcode = '42501';
  end if;
  perform privado.fechar_se_acabou(t.id) from public.prova_tentativas t where t.aluno_id = v_aluno;
  return query
    select pr.id, pr.turma_disciplina_id, pr.titulo, pr.instrucoes, j.abre_em, j.fecha_em, pr.duracao_min,
      pr.saidas_para_encerrar,
      (select count(*)::integer from public.prova_questoes q where q.prova_id = pr.id),
      t.comecou_em, t.termina_em, t.entregue_em, t.encerrada_por, t.saidas,
      case when pr.notas_publicadas_em is not null and t.id is not null then privado.nota_da_tentativa(t.id) end
    from public.provas pr
    join public.matriculas m on m.turma_disciplina_id = pr.turma_disciplina_id and m.aluno_id = v_aluno and m.status = 'aprovado'
    cross join lateral privado.janela_da_prova(pr.id, v_aluno) j
    left join public.prova_tentativas t on t.prova_id = pr.id and t.aluno_id = v_aluno
    order by j.abre_em, pr.id;
end;
$$;

revoke all on function public.minhas_provas() from public, anon;
grant execute on function public.minhas_provas() to authenticated;

-- Começa (ou retoma) a prova. Devolve quando o tempo acaba.
create or replace function public.comecar_prova(p_prova_id bigint)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aluno uuid := (select auth.uid());
  v_prova public.provas%rowtype;
  v_abre timestamptz;
  v_fecha timestamptz;
  v_tentativa public.prova_tentativas%rowtype;
begin
  if v_aluno is null or privado.eh_professor() then
    raise exception 'Só o aluno faz a prova.' using errcode = '42501';
  end if;
  select * into v_prova from public.provas where id = p_prova_id;
  if v_prova.id is null or not privado.aprovado_na_oferta(v_prova.turma_disciplina_id) then
    raise exception 'Prova não encontrada.' using errcode = 'P0002';
  end if;

  select * into v_tentativa from public.prova_tentativas where prova_id = p_prova_id and aluno_id = v_aluno;
  if v_tentativa.id is not null then
    perform privado.fechar_se_acabou(v_tentativa.id);
    select * into v_tentativa from public.prova_tentativas where id = v_tentativa.id;
    if v_tentativa.entregue_em is not null then
      raise exception 'A prova já foi entregue.' using errcode = '55000';
    end if;
    return v_tentativa.termina_em;
  end if;

  select j.abre_em, j.fecha_em into v_abre, v_fecha from privado.janela_da_prova(p_prova_id, v_aluno) j;
  if now() < v_abre then
    raise exception 'A prova ainda não abriu.' using errcode = '55000';
  end if;
  if now() >= v_fecha then
    raise exception 'O horário da prova já fechou.' using errcode = '55000';
  end if;

  insert into public.prova_tentativas (prova_id, aluno_id, termina_em)
  values (p_prova_id, v_aluno, least(now() + make_interval(mins => v_prova.duracao_min), v_fecha))
  returning * into v_tentativa;
  return v_tentativa.termina_em;
end;
$$;

revoke all on function public.comecar_prova(bigint) from public, anon;
grant execute on function public.comecar_prova(bigint) to authenticated;

-- Questões da prova para o aluno durante a tentativa: enunciado, código
-- inicial, testes visíveis completos e ocultos só com a impressão digital.
-- Secretos nunca saem daqui. A última resposta guardada vem junto.
create or replace function public.questoes_da_prova(p_prova_id bigint)
returns table (
  questao_id bigint,
  titulo text,
  enunciado text,
  linguagem text,
  codigo_inicial text,
  peso numeric,
  testes jsonb,
  minha_resposta text,
  respondida_em timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tentativa public.prova_tentativas%rowtype;
begin
  v_tentativa := privado.tentativa_em_andamento(p_prova_id);
  return query
    select q.id, e.titulo, e.enunciado, e.linguagem, e.codigo_inicial, q.peso,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', t.id, 'tipo', t.tipo, 'entrada', t.entrada,
          'saida_esperada', case when t.tipo = 'visivel' then t.saida_esperada end,
          'saida_hash', t.saida_hash
        ) order by t.tipo desc, t.ordem, t.id)
        from public.testes t
        where t.exercicio_id = e.id and t.tipo in ('visivel', 'oculto')
      ), '[]'::jsonb),
      r.codigo, r.respondida_em
    from public.prova_questoes q
    join public.exercicios e on e.id = q.exercicio_id
    left join public.prova_respostas r on r.tentativa_id = v_tentativa.id and r.questao_id = q.id
    where q.prova_id = p_prova_id
    order by q.ordem, q.id;
end;
$$;

revoke all on function public.questoes_da_prova(bigint) from public, anon;
grant execute on function public.questoes_da_prova(bigint) to authenticated;

-- Guarda a resposta de uma questão (vale a última).
create or replace function public.responder_questao(p_questao_id bigint, p_codigo text, p_testes_certos integer)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_questao public.prova_questoes%rowtype;
  v_tentativa public.prova_tentativas%rowtype;
  v_total integer;
  v_quando timestamptz;
begin
  select * into v_questao from public.prova_questoes where id = p_questao_id;
  if v_questao.id is null then
    raise exception 'Questão não encontrada.' using errcode = 'P0002';
  end if;
  v_tentativa := privado.tentativa_em_andamento(v_questao.prova_id);
  if char_length(coalesce(p_codigo, '')) not between 1 and 20000 then
    raise exception 'Escreva o código antes de entregar (até 20 mil caracteres).' using errcode = '22023';
  end if;
  select count(*) into v_total from public.testes where exercicio_id = v_questao.exercicio_id and tipo in ('visivel', 'oculto');
  if p_testes_certos is null or p_testes_certos < 0 or p_testes_certos > v_total then
    raise exception 'Resultado dos testes inválido.' using errcode = '22023';
  end if;

  insert into public.prova_respostas (tentativa_id, questao_id, codigo, testes_certos, testes_total, nota)
  values (
    v_tentativa.id, p_questao_id, p_codigo, p_testes_certos, v_total,
    case when v_total = 0 then 0 else round(10.0 * p_testes_certos / v_total, 1) end
  )
  on conflict (tentativa_id, questao_id) do update
  set codigo = excluded.codigo, testes_certos = excluded.testes_certos, testes_total = excluded.testes_total,
      nota = excluded.nota, respostas = public.prova_respostas.respostas + 1, situacao = 'a_confirmar',
      respondida_em = now(), conferida_em = null
  returning respondida_em into v_quando;
  return v_quando;
end;
$$;

revoke all on function public.responder_questao(bigint, text, integer) from public, anon;
grant execute on function public.responder_questao(bigint, text, integer) to authenticated;

-- O aluno saiu da aba ou da janela. Devolve quantas saídas e se a prova encerrou.
create or replace function public.registrar_saida_da_prova(p_prova_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tentativa public.prova_tentativas%rowtype;
  v_limite smallint;
  v_encerrou boolean := false;
begin
  v_tentativa := privado.tentativa_em_andamento(p_prova_id);
  insert into public.prova_saidas (tentativa_id) values (v_tentativa.id);
  update public.prova_tentativas set saidas = saidas + 1 where id = v_tentativa.id
  returning * into v_tentativa;
  select saidas_para_encerrar into v_limite from public.provas where id = p_prova_id;
  if v_limite is not null and v_tentativa.saidas >= v_limite then
    update public.prova_tentativas set entregue_em = now(), encerrada_por = 'saidas' where id = v_tentativa.id;
    v_encerrou := true;
  end if;
  return jsonb_build_object('saidas', v_tentativa.saidas, 'encerrada', v_encerrou, 'limite', v_limite);
end;
$$;

revoke all on function public.registrar_saida_da_prova(bigint) from public, anon;
grant execute on function public.registrar_saida_da_prova(bigint) to authenticated;

-- O aluno voltou: fecha a última saída aberta (para o professor ver quanto tempo ficou fora).
create or replace function public.registrar_volta_da_prova(p_prova_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.prova_saidas s
  set voltou_em = now()
  where s.id = (
    select s2.id from public.prova_saidas s2
    join public.prova_tentativas t on t.id = s2.tentativa_id
    where t.prova_id = p_prova_id and t.aluno_id = (select auth.uid()) and s2.voltou_em is null
    order by s2.saiu_em desc
    limit 1
  );
end;
$$;

revoke all on function public.registrar_volta_da_prova(bigint) from public, anon;
grant execute on function public.registrar_volta_da_prova(bigint) to authenticated;

create or replace function public.entregar_prova(p_prova_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tentativa public.prova_tentativas%rowtype;
begin
  v_tentativa := privado.tentativa_em_andamento(p_prova_id);
  update public.prova_tentativas set entregue_em = now(), encerrada_por = 'aluno' where id = v_tentativa.id;
end;
$$;

revoke all on function public.entregar_prova(bigint) from public, anon;
grant execute on function public.entregar_prova(bigint) to authenticated;
