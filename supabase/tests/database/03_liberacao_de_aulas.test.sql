-- Testes da liberação de aulas e da edição da estrutura (unidades, aulas, turmas).
-- Nomes e e-mails inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

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

-- Aula pela sigla, número da unidade e número da aula (ex.: ALG IV.2)
create function pg_temp.aula(p_sigla text, p_unidade int, p_numero int) returns bigint language sql as $$
  select a.id from public.aulas a
  join public.unidades u on u.id = a.unidade_id
  join public.disciplinas d on d.id = u.disciplina_id
  where d.sigla = p_sigla and u.numero = p_unidade and a.numero = p_numero;
$$;

grant execute on function pg_temp.oferta(text, text), pg_temp.aula(text, int, int) to anon, authenticated;

-- Os testes partem de nenhuma liberação e nenhum link (o banco local pode ter
-- dados de testes manuais; tudo volta no rollback do fim).
delete from public.liberacoes;
delete from public.materiais;

-- Professor
select pg_temp.criar_conta('c0000000-0000-0000-0000-00000000000f', 'professor.ficticio@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'c0000000-0000-0000-0000-00000000000f';

-- Aluno do 1º INFO M (vai ser aprovado) e aluno do 1º INFO V (aprovado em outra turma)
select pg_temp.criar_conta('c0000000-0000-0000-0000-0000000000a1', 'estrela.cadente@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Estrela Cadente', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Estrela Cadente, 1º INFO M, manhã'));
select pg_temp.criar_conta('c0000000-0000-0000-0000-0000000000a2', 'asteroide.b612@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Asteroide B612', 'turma_disciplina_id', pg_temp.oferta('1º INFO V', 'ALG')::text,
    'quem_e_voce', 'Asteroide B612, 1º INFO V, tarde'));
update public.matriculas set status = 'aprovado'
where aluno_id = 'c0000000-0000-0000-0000-0000000000a2';

-- ---------------------------------------------------------------------------
-- Professor libera IV.1 e IV.2 para 1º INFO M e cadastra os links
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$ insert into public.liberacoes (turma_disciplina_id, aula_id) values
       (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 4, 1)),
       (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 4, 2)) $$,
  'professor libera aulas para uma turma'
);
select lives_ok(
  $$ insert into public.materiais (aula_id, tipo, titulo, url) values
       (pg_temp.aula('ALG', 4, 1), 'link', 'Slides da aula', 'https://example.com/alg-4-1'),
       (pg_temp.aula('ALG', 4, 2), 'link', 'Slides da aula', 'https://example.com/alg-4-2'),
       (pg_temp.aula('ALG', 4, 3), 'link', 'Slides da aula', 'https://example.com/alg-4-3') $$,
  'professor cadastra o link externo de cada aula'
);
select throws_ok(
  $$ insert into public.materiais (aula_id, tipo, url) values (pg_temp.aula('ALG', 4, 4), 'link', 'javascript:alert(1)') $$,
  '23514', null, 'link precisa começar com https://'
);
select throws_ok(
  $$ insert into public.liberacoes (turma_disciplina_id, aula_id)
     values (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('WEB', 1, 1)) $$,
  '23514', 'Esta aula não é da disciplina desta turma.', 'não libera aula de outra disciplina'
);
reset role;

-- ---------------------------------------------------------------------------
-- Aluno ainda pendente: vê títulos, mas nenhuma liberação nem link
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.aulas where id = pg_temp.aula('ALG', 4, 1)), 1, 'pendente vê o título da aula');
select is((select count(*)::int from public.liberacoes), 0, 'pendente não vê liberações');
select is((select count(*)::int from public.materiais), 0, 'pendente não vê links');
reset role;

-- Professor aprova
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
set local role authenticated;
select public.aprovar_todos(pg_temp.oferta('1º INFO M', 'ALG'));
reset role;

-- ---------------------------------------------------------------------------
-- Aluno aprovado: vê só as aulas liberadas para a turma dele
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.liberacoes), 2, 'aprovado vê as 2 aulas liberadas');
select results_eq(
  $$ select url from public.materiais order by url $$,
  $$ values ('https://example.com/alg-4-1'::text), ('https://example.com/alg-4-2'::text) $$,
  'aprovado vê os links das aulas liberadas e não o da IV.3 (bloqueada)'
);
select throws_ok(
  $$ insert into public.liberacoes (turma_disciplina_id, aula_id)
     values (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 4, 3)) $$,
  '42501', null, 'aluno não libera aula'
);
select is_empty(
  $$ delete from public.liberacoes returning 1 $$,
  'aluno não bloqueia aula'
);
reset role;

-- Aluno de outra turma (1º INFO V), mesmo aprovado, não vê as aulas do 1º INFO M
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-0000-0000-0000000000a2", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.liberacoes), 0, 'aluno de outra turma não vê as liberações');
select is((select count(*)::int from public.materiais), 0, 'aluno de outra turma não vê os links');
reset role;

-- Visitante sem login
set local role anon;
select is((select count(*)::int from public.aulas), 48, 'visitante vê os títulos das 48 aulas');
select throws_ok($$ select * from public.materiais $$, '42501', null, 'visitante não lê links');
select throws_ok($$ select * from public.liberacoes $$, '42501', null, 'visitante não lê liberações');
reset role;

-- ---------------------------------------------------------------------------
-- Professor bloqueia de novo e edita a estrutura
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
set local role authenticated;
delete from public.liberacoes
where turma_disciplina_id = pg_temp.oferta('1º INFO M', 'ALG') and aula_id = pg_temp.aula('ALG', 4, 2);

select lives_ok(
  $$ insert into public.aulas (unidade_id, numero, titulo)
     select u.id, 1, 'Partes do computador' from public.unidades u
     join public.disciplinas d on d.id = u.disciplina_id where d.sigla = 'FUND' and u.numero = 1 $$,
  'professor adiciona aula em Fundamentos'
);
select lives_ok(
  $$ insert into public.unidades (disciplina_id, numero, titulo)
     select id, 5, 'Unidade extra' from public.disciplinas where sigla = 'FUND' $$,
  'professor adiciona uma 5ª unidade'
);
select is(
  (select count(*)::int from public.unidades u join public.disciplinas d on d.id = u.disciplina_id where d.sigla = 'FUND'),
  5, 'Fundamentos agora tem 5 unidades'
);
select lives_ok(
  $$ update public.turmas set ano_letivo = 2027 where nome = '1º INFO M' $$,
  'professor muda o ano letivo da turma'
);
reset role;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select url from public.materiais $$,
  $$ values ('https://example.com/alg-4-1'::text) $$,
  'depois de bloquear a IV.2, o aluno perde o link dela'
);
select is_empty(
  $$ update public.aulas set titulo = 'Título trocado pelo aluno' returning 1 $$,
  'aluno não edita títulos de aulas'
);
select throws_ok(
  $$ insert into public.unidades (disciplina_id, numero, titulo) select id, 6, 'Invasão' from public.disciplinas where sigla = 'ALG' $$,
  '42501', null, 'aluno não cria unidade'
);
select is_empty(
  $$ update public.turmas set ano_letivo = 2030 returning 1 $$,
  'aluno não muda o ano letivo'
);
reset role;

select * from finish();
rollback;
