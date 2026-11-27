-- Testes da entrega única, da correção (nota e comentário) e da devolução
-- pelo professor. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

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

create temp table ids (nome text primary key, id bigint);
create function pg_temp.id(p_nome text) returns bigint language sql as $$ select id from ids where nome = p_nome $$;
grant execute on function pg_temp.oferta(text, text), pg_temp.aula(text, int, int), pg_temp.entrar(text),
  pg_temp.id(text) to anon, authenticated;
grant select, insert on ids to authenticated;

select pg_temp.criar_conta('e1000000-0000-0000-0000-00000000000f', 'docente.entrega@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'e1000000-0000-0000-0000-00000000000f';

select pg_temp.criar_conta('e1000000-0000-0000-0000-0000000000a1', 'vega.entrega@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Vega Entrega', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Vega Entrega, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'e1000000-0000-0000-0000-0000000000a1';

select pg_temp.criar_conta('e1000000-0000-0000-0000-0000000000a2', 'rigel.entrega@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Rigel Entrega', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Rigel Entrega, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'e1000000-0000-0000-0000-0000000000a2';

insert into public.liberacoes (turma_disciplina_id, aula_id)
values (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 3, 1))
on conflict do nothing;

with e as (
  insert into public.exercicios (aula_id, titulo, enunciado, dificuldade)
  values (pg_temp.aula('ALG', 3, 1), 'Dobro', 'Imprima o dobro de 2.', 1)
  returning id
) insert into ids select 'dobro', id from e;
insert into public.testes (exercicio_id, tipo, entrada, saida_esperada) values
  (pg_temp.id('dobro'), 'visivel', '', '4'),
  (pg_temp.id('dobro'), 'oculto', '', '4');

-- ---------------------------------------------------------------------------
-- Entrega única
-- ---------------------------------------------------------------------------
select pg_temp.entrar('e1000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is(public.entregar(pg_temp.id('dobro'), 'print(4)', 2) ->> 'xp', '20', 'primeira entrega aceita, com XP');
select throws_ok($$ select public.entregar(pg_temp.id('dobro'), 'print(2 * 2)', 2) $$,
  '23505', 'Você já entregou este exercício. Só dá para entregar de novo se o professor devolver.',
  'segunda entrega é recusada');
select is((select count(*) from public.entregas where exercicio_id = pg_temp.id('dobro')), 1::bigint,
  'continua com uma entrega só');
select throws_ok($$ select public.corrigir_entrega((select max(id) from public.entregas), 10, 'eu mesmo') $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não corrige a própria entrega');
select throws_ok($$ select public.devolver_entrega((select max(id) from public.entregas), null) $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não devolve a própria entrega');
select throws_ok($$ update public.entregas set comentario = 'ótimo', nota_professor = 10 $$,
  '42501', null, 'aluno não escreve na tabela de entregas');
reset role;

-- ---------------------------------------------------------------------------
-- Correção do professor
-- ---------------------------------------------------------------------------
insert into ids select 'entrega1', id from public.entregas where exercicio_id = pg_temp.id('dobro');

select pg_temp.entrar('e1000000-0000-0000-0000-00000000000f');
set local role authenticated;
select lives_ok($$ select public.corrigir_entrega(pg_temp.id('entrega1'), 8.46, '  Faltou ler a entrada com input().  ') $$,
  'professor corrige com nota e comentário');
select is((select nota_professor from public.entregas where id = pg_temp.id('entrega1')), 8.5, 'nota arredondada a uma casa');
select is((select comentario from public.entregas where id = pg_temp.id('entrega1')), 'Faltou ler a entrada com input().',
  'comentário sem espaços nas pontas');
select throws_ok($$ select public.corrigir_entrega(pg_temp.id('entrega1'), 11, null) $$,
  '22023', 'A nota vai de 0 a 10.', 'nota acima de 10 é recusada');
select throws_ok($$ select public.corrigir_entrega(-1, 5, null) $$,
  'P0002', 'Entrega não encontrada.', 'entrega inexistente');
reset role;

select pg_temp.entrar('e1000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((select comentario from public.entregas where id = pg_temp.id('entrega1')), 'Faltou ler a entrada com input().',
  'aluno lê o comentário do professor');
reset role;

select pg_temp.entrar('e1000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select is((select count(*) from public.entregas where exercicio_id = pg_temp.id('dobro')), 0::bigint,
  'colega não vê a entrega nem o comentário');
reset role;

-- ---------------------------------------------------------------------------
-- Devolução
-- ---------------------------------------------------------------------------
select pg_temp.entrar('e1000000-0000-0000-0000-00000000000f');
set local role authenticated;
select lives_ok($$ select public.devolver_entrega(pg_temp.id('entrega1'), '') $$, 'professor devolve a entrega');
select is((select comentario from public.entregas where id = pg_temp.id('entrega1')), 'Faltou ler a entrada com input().',
  'devolver sem texto mantém o comentário anterior');
select throws_ok($$ select public.devolver_entrega(pg_temp.id('entrega1'), null) $$,
  '22023', 'Esta entrega já foi devolvida.', 'não devolve duas vezes');
reset role;

select pg_temp.entrar('e1000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select ok((select devolvida_em is not null from public.entregas where id = pg_temp.id('entrega1')),
  'aluno vê que a entrega foi devolvida');
select is(public.entregar(pg_temp.id('dobro'), 'n = 2' || E'\n' || 'print(n * 2)', 2) ->> 'tentativa', '2',
  'depois de devolvida, o aluno entrega de novo');
select is((select count(*) from public.xp_eventos where motivo = 'exercicio' and exercicio_id = pg_temp.id('dobro')), 1::bigint,
  'refazer não dá XP duas vezes');
reset role;

select * from finish();
rollback;
