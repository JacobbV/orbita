-- Testes do laboratório: quem vê os exercícios e os testes, entregas, XP
-- "a confirmar" e reconferência do professor. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

create function pg_temp.criar_conta(p_id uuid, p_email text, p_meta jsonb default '{}')
returns void language sql as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, p_meta, now(), now());
$$;

create function pg_temp.oferta(p_turma text, p_sigla text) returns bigint language sql as $$
  select td.id from public.turma_disciplinas td
  join public.turmas t on t.id = td.turma_id
  join public.disciplinas d on d.id = td.disciplina_id
  where t.nome = p_turma and d.sigla = p_sigla;
$$;

create function pg_temp.aula(p_sigla text, p_unidade int, p_numero int) returns bigint language sql as $$
  select a.id from public.aulas a
  join public.unidades u on u.id = a.unidade_id
  join public.disciplinas d on d.id = u.disciplina_id
  where d.sigla = p_sigla and u.numero = p_unidade and a.numero = p_numero;
$$;

create function pg_temp.entrar(p_id text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;

-- Exercício de soma criado no teste (id guardado numa tabela temporária).
create temp table ids (nome text primary key, id bigint);
create function pg_temp.id(p_nome text) returns bigint language sql as $$ select id from ids where nome = p_nome $$;

grant execute on function pg_temp.oferta(text, text), pg_temp.aula(text, int, int), pg_temp.entrar(text),
  pg_temp.id(text) to anon, authenticated;
grant select, insert on ids to authenticated;

delete from public.liberacoes where turma_disciplina_id in (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.oferta('1º INFO V', 'ALG'));

select pg_temp.criar_conta('a7000000-0000-0000-0000-00000000000f', 'docente.lab@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'a7000000-0000-0000-0000-00000000000f';

select pg_temp.criar_conta('a7000000-0000-0000-0000-0000000000a1', 'orion.lab@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Órion Lab', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Órion Lab, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'a7000000-0000-0000-0000-0000000000a1';

select pg_temp.criar_conta('a7000000-0000-0000-0000-0000000000a2', 'lyra.lab@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Lyra Lab', 'turma_disciplina_id', pg_temp.oferta('1º INFO V', 'ALG')::text,
    'quem_e_voce', 'Lyra Lab, 1º INFO V, tarde'));
update public.matriculas set status = 'aprovado' where aluno_id = 'a7000000-0000-0000-0000-0000000000a2';

insert into public.liberacoes (turma_disciplina_id, aula_id)
values (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 1, 1));

-- ---------------------------------------------------------------------------
-- Professor cria os exercícios
-- ---------------------------------------------------------------------------
select pg_temp.entrar('a7000000-0000-0000-0000-00000000000f');
set local role authenticated;
with e as (
  insert into public.exercicios (aula_id, titulo, enunciado, dificuldade)
  values (pg_temp.aula('ALG', 1, 1), 'Soma', 'Leia dois números e imprima a soma.', 1)
  returning id
) insert into ids select 'soma', id from e;
with e as (
  insert into public.exercicios (aula_id, titulo, enunciado)
  values (pg_temp.aula('ALG', 1, 2), 'Bloqueado', 'Exercício de aula bloqueada.')
  returning id
) insert into ids select 'bloqueado', id from e;
insert into public.testes (exercicio_id, tipo, entrada, saida_esperada) values
  (pg_temp.id('soma'), 'visivel', '1 2', '3'),
  (pg_temp.id('soma'), 'oculto', '5 5', '10'),
  (pg_temp.id('soma'), 'secreto', '0 0', '0');
select is((select count(*) from public.testes where exercicio_id = pg_temp.id('soma')), 3::bigint,
  'professor lê todos os testes, inclusive os secretos');
reset role;

select is(privado.impressao_digital('10'), '4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5',
  'impressão digital é o SHA-256 da saída');
select is(privado.impressao_digital(E'10  \r\n\n'), privado.impressao_digital('10'),
  'espaços e linhas vazias no fim não mudam a impressão digital');

-- ---------------------------------------------------------------------------
-- O que o aluno enxerga
-- ---------------------------------------------------------------------------
select pg_temp.entrar('a7000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((select count(*) from public.exercicios), 1::bigint, 'aluno vê só o exercício da aula liberada');
select is((select count(*) from public.testes), 0::bigint, 'aluno não lê a tabela de testes');
select is((select count(*) from public.testes_do_exercicio(pg_temp.id('soma'))), 2::bigint,
  'aluno recebe o visível e o oculto, sem o secreto');
select is((select saida_esperada from public.testes_do_exercicio(pg_temp.id('soma')) where tipo = 'visivel'), '3',
  'teste visível vem com a resposta');
select is((select saida_esperada from public.testes_do_exercicio(pg_temp.id('soma')) where tipo = 'oculto'), null,
  'teste oculto vem sem a resposta');
select is((select saida_hash from public.testes_do_exercicio(pg_temp.id('soma')) where tipo = 'oculto'),
  '4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5', 'teste oculto vem só com a impressão digital');
select throws_ok($$ select * from public.testes_do_exercicio(pg_temp.id('bloqueado')) $$,
  '42501', null, 'testes de aula bloqueada não saem');
select throws_ok($$ insert into public.exercicios (aula_id, titulo, enunciado) values (pg_temp.aula('ALG', 1, 1), 'x', 'y') $$,
  '42501', null, 'aluno não cria exercício');

-- ---------------------------------------------------------------------------
-- Entregas
-- ---------------------------------------------------------------------------
select is(public.entregar(pg_temp.id('soma'), 'print(1)', 1) ->> 'xp', '0', 'acertou metade: sem XP');
select is((select nota from public.entregas where tentativa = 1), 5.0, 'nota proporcional aos testes certos');
select is(public.entregar(pg_temp.id('soma'), 'a, b = map(int, input().split())' || E'\n' || 'print(a + b)', 2) ->> 'xp', '20',
  'acertou tudo: +20 XP na hora');
select is((public.meu_progresso() ->> 'xp')::int, 20, 'XP a confirmar já conta no progresso');
select is(public.entregar(pg_temp.id('soma'), 'print(3)', 2) ->> 'xp', '0', 'o mesmo exercício não dá XP duas vezes');
select throws_ok($$ select public.entregar(pg_temp.id('soma'), 'print(3)', 3) $$,
  '22023', 'Resultado dos testes inválido.', 'não dá para dizer que acertou mais testes do que existem');
select throws_ok($$ select public.entregar(pg_temp.id('bloqueado'), 'print(3)', 0) $$,
  '42501', null, 'não entrega exercício de aula bloqueada');
select throws_ok($$ insert into public.entregas (exercicio_id, aluno_id, codigo, testes_certos, testes_total, nota, tentativa)
  values (pg_temp.id('soma'), auth.uid(), 'x', 2, 2, 10, 9) $$, '42501', null, 'aluno não grava entrega direto na tabela');
select throws_ok($$ select public.conferir_entrega((select max(id) from public.entregas), true) $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não confere a própria entrega');
reset role;

select pg_temp.entrar('a7000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select is((select count(*) from public.entregas), 0::bigint, 'aluno não vê as entregas dos colegas');
reset role;

-- ---------------------------------------------------------------------------
-- Reconferência do professor
-- ---------------------------------------------------------------------------
select pg_temp.entrar('a7000000-0000-0000-0000-00000000000f');
set local role authenticated;
select public.conferir_entrega((select id from public.entregas where tentativa = 2 and exercicio_id = pg_temp.id('soma')), false);
select is((select situacao from public.xp_eventos where motivo = 'exercicio'), 'retirado',
  'não confere: o XP do exercício é retirado');
reset role;

select pg_temp.entrar('a7000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((public.meu_progresso() ->> 'xp')::int, 0, 'XP retirado sai do progresso');
select is(public.entregar(pg_temp.id('soma'), 'a, b = map(int, input().split())' || E'\n' || 'print(a + b)', 2) ->> 'xp', '20',
  'depois de corrigir, a nova entrega dá XP de novo');
reset role;

select pg_temp.entrar('a7000000-0000-0000-0000-00000000000f');
set local role authenticated;
select public.conferir_entrega((select max(id) from public.entregas where exercicio_id = pg_temp.id('soma')), true);
select is((select situacao from public.entregas where id = (select max(id) from public.entregas where exercicio_id = pg_temp.id('soma'))),
  'confirmada', 'professor confirma a entrega');
select is((select situacao from public.xp_eventos where motivo = 'exercicio' and situacao <> 'retirado'), 'confirmado',
  'o XP passa para confirmado');
reset role;

select pg_temp.entrar('a7000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((public.meu_progresso() ->> 'xp')::int, 20, 'XP confirmado conta no progresso');
reset role;

select * from finish();
rollback;
