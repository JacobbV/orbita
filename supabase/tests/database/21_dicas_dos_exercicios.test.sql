-- Dicas dos exercícios: o professor salva até 3, o aluno da turma lê as do
-- exercício liberado, questão de prova não guarda dicas. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

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
grant execute on function pg_temp.aula(text, int, int), pg_temp.entrar(text) to authenticated;

select pg_temp.criar_conta('fd000000-0000-0000-0000-00000000000f', 'docente.dicas@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'fd000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('fd000000-0000-0000-0000-0000000000a1', 'orion.dicas@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Órion Dicas', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Órion Dicas, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'fd000000-0000-0000-0000-0000000000a1';
select pg_temp.criar_conta('fd000000-0000-0000-0000-0000000000b2', 'lyra.dicas@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Lyra Dicas', 'turma_disciplina_id', pg_temp.oferta('1º INFO V', 'ALG')::text,
    'quem_e_voce', 'Lyra Dicas, 1º INFO V, tarde'));
update public.matriculas set status = 'aprovado' where aluno_id = 'fd000000-0000-0000-0000-0000000000b2';
delete from public.liberacoes where turma_disciplina_id in (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.oferta('1º INFO V', 'ALG'));
insert into public.liberacoes (turma_disciplina_id, aula_id) values (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 4, 2));

create temp table ids (nome text primary key, id bigint);
grant all on ids to authenticated;

select pg_temp.entrar('fd000000-0000-0000-0000-00000000000f');
set local role authenticated;

insert into ids select 'soma', public.salvar_exercicio(null, pg_temp.aula('ALG', 4, 2), 'Soma com dicas', 'Some dois números.', 1, '',
  '[{"tipo": "visivel", "entrada": "1\n2", "saida_esperada": "3"}]', 'python', null, null,
  array['  Use int() no input().  ', '', 'Some as duas variáveis.']);
select is((select dicas from public.exercicios where id = (select id from ids where nome = 'soma')),
  array['Use int() no input().', 'Some as duas variáveis.'], 'salva as dicas sem as vazias e sem espaços nas pontas');

select public.salvar_exercicio((select id from ids where nome = 'soma'), null, 'Soma com dicas', 'Some dois números.', 1, '',
  '[{"tipo": "visivel", "entrada": "1\n2", "saida_esperada": "3"}]', 'python', null, null, null);
select is((select dicas from public.exercicios where id = (select id from ids where nome = 'soma')),
  array['Use int() no input().', 'Some as duas variáveis.'], 'editar sem mandar dicas mantém as que já estavam');

select public.salvar_exercicio((select id from ids where nome = 'soma'), null, 'Soma com dicas', 'Some dois números.', 1, '',
  '[{"tipo": "visivel", "entrada": "1\n2", "saida_esperada": "3"}]', 'python', null, null, array['Use +.']);
select is((select dicas from public.exercicios where id = (select id from ids where nome = 'soma')),
  array['Use +.'], 'editar com dicas troca as dicas');

insert into ids select 'sem', public.salvar_exercicio(null, pg_temp.aula('ALG', 4, 2), 'Sem dicas', 'Mostre 1.', 1, '',
  '[{"tipo": "visivel", "entrada": "", "saida_esperada": "1"}]');
select is((select dicas from public.exercicios where id = (select id from ids where nome = 'sem')), '{}'::text[],
  'exercício sem dicas fica com a lista vazia');

insert into ids select 'prova', public.salvar_exercicio(null, null, 'Questão de prova', 'Mostre 2.', 1, '',
  '[{"tipo": "visivel", "entrada": "", "saida_esperada": "2"}]', 'python', null, null, array['Não devia ficar.']);
select is((select dicas from public.exercicios where id = (select id from ids where nome = 'prova')), '{}'::text[],
  'questão só de prova nunca guarda dicas');

select throws_ok($$ select public.salvar_exercicio(null, pg_temp.aula('ALG', 4, 2), 'x', 'y', 1, '',
  '[{"tipo": "visivel", "entrada": "", "saida_esperada": "1"}]', 'python', null, null, array['a', 'b', 'c', 'd']) $$,
  '22023', 'Use até 3 dicas.', 'mais de 3 dicas é recusado');
select throws_ok($$ select public.salvar_exercicio(null, pg_temp.aula('ALG', 4, 2), 'x', 'y', 1, '',
  '[{"tipo": "visivel", "entrada": "", "saida_esperada": "1"}]', 'python', null, null, array[repeat('a', 1001)]) $$,
  '22023', 'Cada dica pode ter até 1000 letras.', 'dica com mais de 1000 letras é recusada');
reset role;

select throws_ok($$ update public.exercicios set dicas = array['a', 'b', 'c', 'd'] where id = (select id from ids where nome = 'sem') $$,
  '23514', null, 'a própria tabela não aceita mais de 3 dicas');

-- Aluno da turma com a aula liberada lê as dicas; aluno de outra turma não vê o exercício.
select pg_temp.entrar('fd000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((select dicas from public.exercicios where id = (select id from ids where nome = 'soma')), array['Use +.'],
  'aluno da turma lê as dicas do exercício liberado');
select throws_ok($$ select public.salvar_exercicio((select id from ids where nome = 'soma'), null, 'x', 'y', 1, '',
  '[{"tipo": "visivel", "entrada": "", "saida_esperada": "1"}]', 'python', null, null, array['trapaça']) $$,
  '42501', null, 'aluno não muda as dicas');
reset role;

select pg_temp.entrar('fd000000-0000-0000-0000-0000000000b2');
set local role authenticated;
select is((select count(*)::int from public.exercicios where id = (select id from ids where nome = 'soma')), 0,
  'aluno de outra turma não vê o exercício nem as dicas');
reset role;

select * from finish();
rollback;
