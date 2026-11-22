-- Testes dos pedidos de acesso: aprovação, recusa com motivo, limite de 3 pedidos por turma
-- e isolamento entre alunos. Nomes e e-mails inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

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

create function pg_temp.pedido(p_aluno uuid, p_sigla text) returns bigint language sql as $$
  select m.id from public.matriculas m
  join public.disciplinas d on d.id = m.disciplina_id
  where m.aluno_id = p_aluno and d.sigla = p_sigla
  order by m.tentativa desc limit 1;
$$;

grant execute on function pg_temp.oferta(text, text), pg_temp.pedido(uuid, text) to authenticated;

-- Professor: conta criada pelo painel e papel dado por SQL (como no passo a passo).
select pg_temp.criar_conta('b0000000-0000-0000-0000-00000000000f', 'professor.ficticio@academico.ifpb.edu.br',
  '{"nome": "Professor Fictício"}');
update public.perfis set papel = 'professor' where id = 'b0000000-0000-0000-0000-00000000000f';

-- Dois alunos, cada um com pedido feito no cadastro.
select pg_temp.criar_conta('b0000000-0000-0000-0000-0000000000a1', 'cometa.azul@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Cometa Azul', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Cometa Azul, 1º INFO M, manhã'));
select pg_temp.criar_conta('b0000000-0000-0000-0000-0000000000a2', 'nebulosa.verde@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Nebulosa Verde', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Nebulosa Verde, 1º INFO M, manhã'));

-- ---------------------------------------------------------------------------
-- Como aluno 1
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.matriculas), 1, 'aluno vê só o próprio pedido');
select throws_ok(
  $$ insert into public.matriculas (aluno_id, turma_disciplina_id, disciplina_id, quem_e_voce, tentativa, status)
     select auth.uid(), pg_temp.oferta('1º INFO M', 'ALG'), td.disciplina_id, 'Quero entrar aprovado', 2, 'aprovado'
     from public.turma_disciplinas td where td.id = pg_temp.oferta('1º INFO M', 'ALG') $$,
  '42501', null, 'aluno não insere pedido direto na tabela'
);
select throws_ok(
  $$ update public.matriculas set status = 'aprovado' $$,
  '42501', null, 'aluno não aprova o próprio pedido'
);
select throws_ok(
  $$ select public.decidir_pedido(pg_temp.pedido(auth.uid(), 'ALG'), true) $$,
  '42501', 'Só o professor decide pedidos.', 'aluno não usa a função do professor'
);
select throws_ok(
  $$ select public.aprovar_todos(pg_temp.oferta('1º INFO M', 'ALG')) $$,
  '42501', null, 'aluno não aprova todos'
);
select throws_ok(
  $$ select public.pedir_acesso(pg_temp.oferta('1º INFO M', 'ALG'), 'Cometa Azul, 1º INFO M, manhã') $$,
  'P0001', 'Você já tem um pedido em aberto ou aprovado nesta disciplina.',
  'não abre segundo pedido na mesma disciplina enquanto o primeiro está pendente'
);
select lives_ok(
  $$ select public.pedir_acesso(pg_temp.oferta('1º INFO M', 'FUND'), 'Cometa Azul, 1º INFO M, manhã') $$,
  'pode pedir outra disciplina; cada pedido é separado'
);
reset role;

-- ---------------------------------------------------------------------------
-- Como professor
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
set local role authenticated;

-- Contamos só as contas deste teste: o banco local pode ter outras contas de teste.
select is(
  (select count(*)::int from public.matriculas where aluno_id::text like 'b0000000-%'),
  3, 'professor vê todos os pedidos'
);
select is(
  (select quem_e_voce from public.matriculas where id = pg_temp.pedido('b0000000-0000-0000-0000-0000000000a2', 'ALG')),
  'Nebulosa Verde, 1º INFO M, manhã', 'professor lê o "Quem é você" ao decidir'
);
select is(
  (select count(*)::int from public.perfis where id::text like 'b0000000-%'),
  3, 'professor lê os perfis'
);
select is(
  (select status from public.decidir_pedido(pg_temp.pedido('b0000000-0000-0000-0000-0000000000a1', 'ALG'), false, 'Não achei você na chamada.')),
  'recusado', 'professor recusa com motivo'
);
select cmp_ok(
  public.aprovar_todos(pg_temp.oferta('1º INFO M', 'ALG')), '>=', 1,
  '"aprovar todos" aprova os pendentes daquela turma e disciplina'
);
select is(
  (select status from public.matriculas where id = pg_temp.pedido('b0000000-0000-0000-0000-0000000000a2', 'ALG')),
  'aprovado', 'o pedido pendente da turma foi aprovado'
);
select is(
  (select status from public.matriculas where id = pg_temp.pedido('b0000000-0000-0000-0000-0000000000a1', 'FUND')),
  'pendente', 'pedido de outra disciplina continua pendente'
);
select throws_ok(
  $$ select public.decidir_pedido(pg_temp.pedido('b0000000-0000-0000-0000-0000000000a2', 'ALG'), false) $$,
  'P0002', null, 'pedido já decidido não muda de novo'
);
reset role;

-- ---------------------------------------------------------------------------
-- Aluno recusado: vê o motivo e pode tentar até 3 vezes no total
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(
  (select motivo_recusa from public.matriculas where id = pg_temp.pedido(auth.uid(), 'ALG')),
  'Não achei você na chamada.', 'aluno recusado vê o motivo'
);
select is(
  (select tentativa from public.pedir_acesso(pg_temp.oferta('1º INFO M', 'ALG'), 'Cometa Azul, 1º INFO M, manhã, segunda tentativa')),
  2::smallint, 'aluno recusado pode pedir de novo (tentativa 2)'
);
reset role;

-- Professor recusa a 2ª; aluno faz a 3ª na mesma turma; professor recusa; a 4ª é barrada.
select set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
set local role authenticated;
select public.decidir_pedido(pg_temp.pedido('b0000000-0000-0000-0000-0000000000a1', 'ALG'), false);
reset role;
select set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(
  (select tentativa from public.pedir_acesso(pg_temp.oferta('1º INFO M', 'ALG'), 'Cometa Azul, 1º INFO M, manhã, terceira tentativa')),
  3::smallint, 'terceira tentativa na mesma turma'
);
reset role;
select set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
set local role authenticated;
select public.decidir_pedido(pg_temp.pedido('b0000000-0000-0000-0000-0000000000a1', 'ALG'), false);
reset role;
select set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select public.pedir_acesso(pg_temp.oferta('1º INFO M', 'ALG'), 'Cometa Azul, 1º INFO M, quarta tentativa') $$,
  'P0001', 'Você já fez 3 pedidos para esta turma. Fale com o professor.',
  'quarta tentativa na mesma turma é barrada (máximo de 3 por turma)'
);
select is(
  (select tentativa from public.pedir_acesso(pg_temp.oferta('1º INFO V', 'ALG'), 'Cometa Azul, errei a turma, sou do 1º INFO V, tarde')),
  1::smallint, 'em outra turma a contagem recomeça (tentativa 1 no 1º INFO V)'
);
reset role;

-- Professor não faz pedido de acesso
select set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select public.pedir_acesso(pg_temp.oferta('1º INFO M', 'ALG'), 'Professor testando o pedido') $$,
  'P0001', 'Só alunos fazem pedido de acesso.', 'professor não faz pedido de acesso'
);
reset role;

-- Visitante sem login
set local role anon;
select throws_ok($$ select * from public.matriculas $$, '42501', null, 'visitante não lê pedidos');
reset role;

select * from finish();
rollback;
