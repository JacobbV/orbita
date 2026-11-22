-- Testes de criar, editar e remover exercícios pelo painel. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

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

select pg_temp.criar_conta('fa000000-0000-0000-0000-00000000000f', 'docente.exercicios@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'fa000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('fa000000-0000-0000-0000-0000000000a1', 'lyra.exercicios@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Lyra Exercícios', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Lyra Exercícios, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'fa000000-0000-0000-0000-0000000000a1';
delete from public.liberacoes where turma_disciplina_id = pg_temp.oferta('1º INFO M', 'ALG');
insert into public.liberacoes (turma_disciplina_id, aula_id) values (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 3, 1));

create temp table ids (nome text primary key, id bigint);
grant all on ids to authenticated;

-- Professor
select pg_temp.entrar('fa000000-0000-0000-0000-00000000000f');
set local role authenticated;

insert into ids select 'dobro', public.salvar_exercicio(null, pg_temp.aula('ALG', 3, 1), '  Dobro  ', 'Leia n e mostre o dobro.', 1, 'n = int(input())',
  '[{"tipo": "visivel", "entrada": "2", "saida_esperada": "4"},
    {"tipo": "oculto", "entrada": "5", "saida_esperada": "10"},
    {"tipo": "secreto", "entrada": "-3", "saida_esperada": "-6"}]');
select is((select titulo from public.exercicios where id = (select id from ids where nome = 'dobro')), 'Dobro', 'cria o exercício sem espaços no título');
select is((select string_agg(tipo, ',' order by ordem) from public.testes where exercicio_id = (select id from ids where nome = 'dobro')),
  'visivel,oculto,secreto', 'cria os três testes na ordem');

select lives_ok($$ select public.salvar_exercicio((select id from ids where nome = 'dobro'), null, 'Dobro de um número', 'Leia n e mostre o dobro.', 2, '',
  '[{"tipo": "visivel", "entrada": "1", "saida_esperada": "2"}]') $$, 'edita o exercício');
select is((select count(*) from public.testes where exercicio_id = (select id from ids where nome = 'dobro')), 1::bigint, 'a edição troca os testes');
select is((select dificuldade from public.exercicios where id = (select id from ids where nome = 'dobro')), 2::smallint, 'e a dificuldade');

select throws_ok($$ select public.salvar_exercicio(null, pg_temp.aula('ALG', 3, 1), 'Só secreto', 'x', 1, '',
  '[{"tipo": "secreto", "entrada": "", "saida_esperada": "1"}]') $$,
  '22023', 'Coloque pelo menos um teste visível ou oculto: é com eles que o aluno confere o código.', 'precisa de um teste que o aluno use');
select throws_ok($$ select public.salvar_exercicio(null, pg_temp.aula('ALG', 3, 1), 'Sem testes', 'x', 1, '', '[]') $$,
  '22023', 'Coloque de 1 a 30 testes.', 'precisa de testes');
select throws_ok($$ select public.salvar_exercicio(null, pg_temp.aula('ALG', 3, 1), 'Tipo errado', 'x', 1, '',
  '[{"tipo": "publico", "saida_esperada": "1"}]') $$,
  '22023', 'Confira os testes: cada um precisa do tipo e da saída esperada.', 'confere o tipo do teste');
reset role;

-- Aluno não cria nem remove
select pg_temp.entrar('fa000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select throws_ok($$ select public.salvar_exercicio(null, pg_temp.aula('ALG', 3, 1), 'x', 'y', 1, '',
  '[{"tipo": "visivel", "saida_esperada": "1"}]') $$, '42501', 'Só o professor pode fazer isso.', 'aluno não cria exercício');
select public.entregar((select id from ids where nome = 'dobro'), 'print(2)', 1);
reset role;

-- Remover: recusa com entregas, aceita sem
select pg_temp.entrar('fa000000-0000-0000-0000-00000000000f');
set local role authenticated;
select throws_ok($$ select public.remover_exercicio((select id from ids where nome = 'dobro')) $$,
  '55000', 'Este exercício já tem entregas de alunos e não pode ser removido.', 'não apaga exercício com entregas');
insert into ids select 'vazio', public.salvar_exercicio(null, pg_temp.aula('ALG', 3, 1), 'Sem entregas', 'x', 1, '',
  '[{"tipo": "visivel", "saida_esperada": "1"}]');
select lives_ok($$ select public.remover_exercicio((select id from ids where nome = 'vazio')) $$, 'remove exercício sem entregas');
select is((select count(*) from public.exercicios where id = (select id from ids where nome = 'vazio')), 0::bigint, 'e ele some');

-- Linguagem
insert into ids select 'pagina', public.salvar_exercicio(null, pg_temp.aula('ALG', 3, 1), 'Minha página', 'Faça um h1.', 1, '',
  '[{"tipo": "visivel", "entrada": "h1", "saida_esperada": "Olá"}]', 'html');
select is((select linguagem from public.exercicios where id = (select id from ids where nome = 'pagina')), 'html', 'cria exercício de HTML e CSS');
select is((select linguagem from public.exercicios where id = (select id from ids where nome = 'dobro')), 'python', 'sem linguagem, fica Python');
select throws_ok($$ select public.salvar_exercicio(null, pg_temp.aula('ALG', 3, 1), 'x', 'y', 1, '',
  '[{"tipo": "visivel", "entrada": "", "saida_esperada": "1"}]', 'cobol') $$,
  '22023', 'Escolha a linguagem: Python, JavaScript ou HTML e CSS.', 'recusa linguagem desconhecida');
reset role;

select * from finish();
rollback;
