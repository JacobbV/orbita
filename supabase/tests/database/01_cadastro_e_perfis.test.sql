-- Testes do cadastro: e-mail acadêmico, perfil criado como aluno e pedido inicial.
-- Todos os nomes e e-mails são inventados (LGPD).
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- Ajudante: cria uma conta como o Supabase Auth faria (os gatilhos disparam).
create function pg_temp.criar_conta(p_id uuid, p_email text, p_meta jsonb default '{}')
returns void language sql as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, p_meta, now(), now());
$$;

-- Oferta "1º INFO M + Algoritmos"
create function pg_temp.oferta(p_turma text, p_sigla text) returns bigint language sql as $$
  select td.id from public.turma_disciplinas td
  join public.turmas t on t.id = td.turma_id
  join public.disciplinas d on d.id = td.disciplina_id
  where t.nome = p_turma and d.sigla = p_sigla;
$$;

-- 0) O serviço de login (papel supabase_auth_admin) consegue rodar os gatilhos.
--    Sem isso o cadastro pelo site falha com erro 500, mesmo com os testes abaixo passando.
select ok(
  has_schema_privilege('supabase_auth_admin', 'privado', 'usage'),
  'o serviço de login pode usar o esquema privado'
);
select ok(
  has_function_privilege('supabase_auth_admin', 'privado.email_academico_valido(text)', 'execute'),
  'o serviço de login pode rodar a regra do e-mail'
);

-- 1) E-mail fora do domínio não cria conta ----------------------------------
select throws_ok(
  $$ select pg_temp.criar_conta('a0000000-0000-0000-0000-000000000001', 'visitante@gmail.com') $$,
  '23514', 'Use o seu e-mail @academico.ifpb.edu.br.',
  'recusa e-mail do Gmail'
);
select throws_ok(
  $$ select pg_temp.criar_conta('a0000000-0000-0000-0000-000000000002', 'aluno@academico.ifpb.edu.br.golpe.com') $$,
  '23514', null, 'recusa domínio falso que só começa igual'
);
select throws_ok(
  $$ select pg_temp.criar_conta('a0000000-0000-0000-0000-000000000003', 'docente@ifpb.edu.br') $$,
  '23514', null, 'recusa e-mail do IFPB que não é acadêmico'
);

-- 2) Cadastro válido cria perfil de aluno e pedido pendente -------------------
select lives_ok(
  format($$ select pg_temp.criar_conta('a0000000-0000-0000-0000-0000000000a1',
    '  Tripulante.Alfa@Academico.IFPB.edu.br ',
    jsonb_build_object('nome', 'Tripulante Alfa', 'turma_disciplina_id', %s::text,
      'quem_e_voce', 'Tripulante Alfa, 1º INFO M, manhã', 'papel', 'professor')) $$,
    pg_temp.oferta('1º INFO M', 'ALG')),
  'cadastro com e-mail acadêmico funciona'
);
select is(
  (select papel from public.perfis where id = 'a0000000-0000-0000-0000-0000000000a1'),
  'aluno', 'papel é aluno mesmo se o formulário mandar "professor"'
);
select is(
  (select email from public.perfis where id = 'a0000000-0000-0000-0000-0000000000a1'),
  'tripulante.alfa@academico.ifpb.edu.br', 'e-mail é guardado sem espaços e em minúsculas'
);
select is(
  (select status || '/' || tentativa from public.matriculas where aluno_id = 'a0000000-0000-0000-0000-0000000000a1'),
  'pendente/1', 'o cadastro já cria o pedido pendente (tentativa 1)'
);
select is(
  (select raw_user_meta_data ? 'quem_e_voce' or raw_user_meta_data ? 'turma_disciplina_id'
   from auth.users where id = 'a0000000-0000-0000-0000-0000000000a1'),
  false, 'os dados do pedido não ficam duplicados nos metadados da conta'
);

-- 3) Pedido inválido no cadastro bloqueia a conta ---------------------------
select throws_ok(
  format($$ select pg_temp.criar_conta('a0000000-0000-0000-0000-0000000000a2',
    'tripulante.beta@academico.ifpb.edu.br',
    jsonb_build_object('nome', 'Tripulante Beta', 'turma_disciplina_id', %s::text, 'quem_e_voce', 'eu')) $$,
    pg_temp.oferta('1º INFO M', 'ALG')),
  'P0001', null, '"Quem é você" curto demais não passa'
);
select throws_ok(
  $$ select pg_temp.criar_conta('a0000000-0000-0000-0000-0000000000a3',
    'tripulante.gama@academico.ifpb.edu.br',
    '{"nome": "Tripulante Gama", "turma_disciplina_id": "999999", "quem_e_voce": "Tripulante Gama, 1º INFO V, tarde"}') $$,
  'P0002', null, 'oferta inexistente não passa'
);

-- 4) Troca de e-mail também respeita o domínio ------------------------------
select throws_ok(
  $$ update auth.users set email = 'fora@gmail.com' where id = 'a0000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'não deixa trocar para e-mail fora do domínio'
);

-- 5) O que o aluno pode fazer com o próprio perfil --------------------------
select pg_temp.criar_conta('a0000000-0000-0000-0000-0000000000b1', 'tripulante.delta@academico.ifpb.edu.br',
  '{"nome": "Tripulante Delta"}');

select set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;

select results_eq(
  $$ select nome from public.perfis $$,
  $$ values ('Tripulante Alfa'::text) $$,
  'aluno lê só o próprio perfil'
);
select throws_ok(
  $$ update public.perfis set papel = 'professor' where id = auth.uid() $$,
  '42501', null, 'aluno não consegue se tornar professor'
);
select lives_ok(
  $$ update public.perfis set nome = 'Tripulante Alfa Silva' where id = auth.uid() $$,
  'aluno pode corrigir o próprio nome'
);
update public.perfis set nome = 'Nome Trocado' where id = 'a0000000-0000-0000-0000-0000000000b1';
reset role;
select is(
  (select nome from public.perfis where id = 'a0000000-0000-0000-0000-0000000000b1'),
  'Tripulante Delta', 'aluno não muda o nome de outro aluno'
);

-- 6) Visitante sem login não lê perfis ---------------------------------------
set local role anon;
select throws_ok($$ select * from public.perfis $$, '42501', null, 'visitante não lê perfis');
reset role;

select * from finish();
rollback;
