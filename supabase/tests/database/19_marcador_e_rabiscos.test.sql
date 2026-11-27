-- Marcador de página e rabiscos dos slides: tudo pessoal. Nomes inventados.
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

grant execute on function pg_temp.oferta(text, text), pg_temp.aula(text, int, int), pg_temp.entrar(text)
  to anon, authenticated;

delete from public.materiais where aula_id in (pg_temp.aula('ALG', 2, 1), pg_temp.aula('ALG', 2, 2));
delete from public.liberacoes where aula_id in (pg_temp.aula('ALG', 2, 1), pg_temp.aula('ALG', 2, 2));

select pg_temp.criar_conta('e3000000-0000-0000-0000-00000000000f', 'docente.marcador@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'e3000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('e3000000-0000-0000-0000-0000000000a1', 'atlas.marcador@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Atlas Marcador', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Atlas Marcador, 1º INFO M, manhã'));
select pg_temp.criar_conta('e3000000-0000-0000-0000-0000000000a2', 'bruma.marcador@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Bruma Marcador', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Bruma Marcador, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'e3000000-0000-0000-0000-0000000000a1';
-- Bruma continua só com o pedido pendente: não vê aula nenhuma.

insert into public.liberacoes (turma_disciplina_id, aula_id) values (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 2, 1));
insert into public.materiais (aula_id, tipo, titulo, caminho_storage) values
  (pg_temp.aula('ALG', 2, 1), 'slide', 'Slides liberados', 'teste/liberado.html'),
  (pg_temp.aula('ALG', 2, 2), 'slide', 'Slides bloqueados', 'teste/bloqueado.html');

create temp table ids (nome text primary key, id bigint);
grant all on ids to authenticated;
insert into ids select 'liberado', id from public.materiais where caminho_storage = 'teste/liberado.html';
insert into ids select 'bloqueado', id from public.materiais where caminho_storage = 'teste/bloqueado.html';

-- Aluno aprovado
select pg_temp.entrar('e3000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select lives_ok($$ insert into public.slides_do_usuario (usuario_id, material_id, marcador)
  values ('e3000000-0000-0000-0000-0000000000a1', (select id from ids where nome = 'liberado'), 7) $$,
  'aluno marca onde parou nos slides liberados');
select lives_ok($$ update public.slides_do_usuario set rabiscos = '{"7": [{"c": "#e11d48", "w": 6, "t": "l", "p": [10, 10, 40, 50]}]}'::jsonb
  where material_id = (select id from ids where nome = 'liberado') $$, 'aluno guarda os rabiscos');
select is((select marcador from public.slides_do_usuario), 7::smallint, 'aluno lê o próprio marcador');
select throws_ok($$ insert into public.slides_do_usuario (usuario_id, material_id, marcador)
  values ('e3000000-0000-0000-0000-0000000000a1', (select id from ids where nome = 'bloqueado'), 2) $$,
  '42501', null, 'aluno não anota em slides de aula bloqueada');
select throws_ok($$ insert into public.slides_do_usuario (usuario_id, material_id, marcador)
  values ('e3000000-0000-0000-0000-0000000000a2', (select id from ids where nome = 'liberado'), 2) $$,
  '42501', null, 'aluno não cria marcador em nome de outra pessoa');
select throws_ok($$ update public.slides_do_usuario set marcador = 1000 where material_id = (select id from ids where nome = 'liberado') $$,
  '23514', null, 'marcador tem limite');
select throws_ok($$ update public.slides_do_usuario set rabiscos = jsonb_build_object('1', repeat('x', 400001)) where material_id = (select id from ids where nome = 'liberado') $$,
  '23514', null, 'rabiscos têm limite de tamanho');
select throws_ok($$ update public.slides_do_usuario set rabiscos = '[]'::jsonb where material_id = (select id from ids where nome = 'liberado') $$,
  '23514', null, 'rabiscos precisam ser um objeto');
reset role;

-- Professor: tem os dele, e não lê os do aluno
select pg_temp.entrar('e3000000-0000-0000-0000-00000000000f');
set local role authenticated;
select lives_ok($$ insert into public.slides_do_usuario (usuario_id, material_id, marcador)
  values ('e3000000-0000-0000-0000-00000000000f', (select id from ids where nome = 'bloqueado'), 12) $$,
  'professor marca onde parou, mesmo numa aula ainda bloqueada');
select is((select count(*) from public.slides_do_usuario), 1::bigint, 'professor lê só o próprio marcador, não o do aluno');
select is((select count(*) from public.slides_do_usuario where usuario_id = 'e3000000-0000-0000-0000-0000000000a1'), 0::bigint,
  'professor não lê os rabiscos do aluno');
update public.slides_do_usuario set marcador = 3 where usuario_id = 'e3000000-0000-0000-0000-0000000000a1';
reset role;
select is((select marcador from public.slides_do_usuario where usuario_id = 'e3000000-0000-0000-0000-0000000000a1'), 7::smallint,
  'professor não muda o marcador do aluno');
set local role authenticated;
reset role;

-- Aluno sem matrícula aprovada
select pg_temp.entrar('e3000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select throws_ok($$ insert into public.slides_do_usuario (usuario_id, material_id, marcador)
  values ('e3000000-0000-0000-0000-0000000000a2', (select id from ids where nome = 'liberado'), 2) $$,
  '42501', null, 'aluno sem aprovação não anota');
select is((select count(*) from public.slides_do_usuario), 0::bigint, 'aluno não lê o marcador dos colegas');
reset role;

-- Anônimo
set local role anon;
select throws_ok($$ select * from public.slides_do_usuario $$, '42501', null, 'sem login não lê nada');
reset role;

select * from finish();
rollback;
