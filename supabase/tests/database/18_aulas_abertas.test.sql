-- Testes da última aula aberta ("Continuar aula"). Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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

grant execute on function pg_temp.oferta(text, text), pg_temp.aula(text, int, int), pg_temp.entrar(text)
  to anon, authenticated;

select pg_temp.criar_conta('e3000000-0000-0000-0000-00000000000f', 'docente.continuar@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'e3000000-0000-0000-0000-00000000000f';

select pg_temp.criar_conta('e3000000-0000-0000-0000-0000000000a1', 'vega.continuar@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Vega Continuar', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Vega Continuar, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'e3000000-0000-0000-0000-0000000000a1';

select pg_temp.criar_conta('e3000000-0000-0000-0000-0000000000a2', 'rigel.continuar@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Rigel Continuar', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Rigel Continuar, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'e3000000-0000-0000-0000-0000000000a2';

delete from public.liberacoes where aula_id in (pg_temp.aula('ALG', 2, 1), pg_temp.aula('ALG', 2, 2));
insert into public.liberacoes (turma_disciplina_id, aula_id)
values (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 2, 1));

set local role authenticated;

-- Aluno
select pg_temp.entrar('e3000000-0000-0000-0000-0000000000a1');
select lives_ok(format($$ select public.registrar_aula_aberta(%s) $$, pg_temp.aula('ALG', 2, 1)),
  'aluno registra uma aula liberada');
select is((select count(*)::int from public.aulas_abertas), 1, 'aluno vê a própria linha');
select lives_ok(format($$ select public.registrar_aula_aberta(%s) $$, pg_temp.aula('ALG', 2, 1)),
  'abrir de novo não dá erro');
select is((select count(*)::int from public.aulas_abertas), 1, 'abrir de novo não duplica');
select throws_ok(format($$ select public.registrar_aula_aberta(%s) $$, pg_temp.aula('ALG', 2, 2)),
  '42501', 'Esta aula ainda não foi liberada para a sua turma.', 'aula não liberada é recusada');
select throws_ok($$ insert into public.aulas_abertas (aluno_id, aula_id) values (auth.uid(), 1) $$,
  '42501', null, 'aluno não escreve direto na tabela');

-- Outro aluno não enxerga
select pg_temp.entrar('e3000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.aulas_abertas), 0, 'outro aluno não vê as linhas alheias');

-- Professor vê tudo e não deixa rastro
select pg_temp.entrar('e3000000-0000-0000-0000-00000000000f');
select is((select count(*)::int from public.aulas_abertas where aluno_id = 'e3000000-0000-0000-0000-0000000000a1'), 1,
  'professor lê as linhas dos alunos');
select lives_ok(format($$ select public.registrar_aula_aberta(%s) $$, pg_temp.aula('ALG', 2, 1)),
  'professor chama sem erro e sem gravar');

select * from finish();
rollback;
