-- Remover aula ou exercício não apaga nem barra o XP já ganho. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('fb000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated',
        'authenticated', 'vega.remocao@academico.ifpb.edu.br', '{}', now(), now());

create temp table ids as
select
  (select a.id from public.aulas a join public.unidades u on u.id = a.unidade_id
   join public.disciplinas d on d.id = u.disciplina_id
   where d.sigla = 'ALG' and u.numero = 2 and a.numero = 3) as aula;

insert into public.exercicios (aula_id, titulo, enunciado) select aula, 'Exercício que sai', 'x' from ids;
alter table ids add column exercicio bigint;
update ids set exercicio = (select id from public.exercicios where titulo = 'Exercício que sai');

insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, aula_id)
select 'fb000000-0000-0000-0000-0000000000a1', 10, 'aula', 'Abriu a aula', aula from ids;
insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, exercicio_id)
select 'fb000000-0000-0000-0000-0000000000a1', 20, 'exercicio', 'Resolveu', exercicio from ids;

select lives_ok($$ delete from public.exercicios where id = (select exercicio from ids) $$, 'remove o exercício que deu XP');
select lives_ok($$ delete from public.aulas where id = (select aula from ids) $$, 'remove a aula que deu XP');
select is(
  (select sum(quantidade)::int from public.xp_eventos where aluno_id = 'fb000000-0000-0000-0000-0000000000a1'),
  30, 'o XP continua com o aluno');
select is(
  (select count(*)::int from public.xp_eventos
   where aluno_id = 'fb000000-0000-0000-0000-0000000000a1' and aula_id is null and exercicio_id is null),
  2, 'os eventos ficam sem a origem removida');
select throws_ok(
  $$ insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao)
     values ('fb000000-0000-0000-0000-0000000000a1', 5, 'aula', 'Sem aula') $$,
  '23514', null, 'XP novo de aula ainda exige a aula');
select throws_ok(
  $$ insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao)
     values ('fb000000-0000-0000-0000-0000000000a1', 5, 'exercicio', 'Sem exercício') $$,
  '23514', null, 'XP novo de exercício ainda exige o exercício');

select * from finish();
rollback;
