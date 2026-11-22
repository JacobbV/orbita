-- Testes das funções do painel do professor: estrutura de unidades e aulas,
-- liberação por unidade e link da aula. Nomes e e-mails inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

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

create function pg_temp.unidade(p_sigla text, p_numero int) returns bigint language sql as $$
  select u.id from public.unidades u join public.disciplinas d on d.id = u.disciplina_id
  where d.sigla = p_sigla and u.numero = p_numero;
$$;

create function pg_temp.disciplina(p_sigla text) returns bigint language sql as $$
  select id from public.disciplinas where sigla = p_sigla;
$$;

-- Títulos das aulas de uma unidade, na ordem, para comparar a numeração.
create function pg_temp.titulos(p_unidade bigint) returns text language sql as $$
  select string_agg(numero || ':' || titulo, ' | ' order by numero) from public.aulas where unidade_id = p_unidade;
$$;

grant execute on function pg_temp.oferta(text, text), pg_temp.unidade(text, int), pg_temp.disciplina(text),
  pg_temp.titulos(bigint) to authenticated;

select pg_temp.criar_conta('d0000000-0000-0000-0000-00000000000f', 'professora.ficticia@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'd0000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('d0000000-0000-0000-0000-0000000000a1', 'cometa.halley@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Cometa Halley', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'FUND')::text,
    'quem_e_voce', 'Cometa Halley, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'd0000000-0000-0000-0000-0000000000a1';

-- ---------------------------------------------------------------------------
-- Aluno não usa as funções do professor
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "d0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.adicionar_unidade(pg_temp.disciplina('FUND'), 'Invasão') $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não adiciona unidade');
select throws_ok($$ select public.adicionar_aula(pg_temp.unidade('FUND', 1), 'Invasão') $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não adiciona aula');
select throws_ok($$ select public.remover_aula((select min(id) from public.aulas)) $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não remove aula');
select throws_ok($$ select public.liberar_unidade(pg_temp.oferta('1º INFO M', 'FUND'), pg_temp.unidade('FUND', 1), true) $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não libera unidade');
select throws_ok($$ select public.definir_link_da_aula((select min(id) from public.aulas), 'https://example.com/x') $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não troca o link da aula');
reset role;

-- Visitante nem enxerga as funções
set local role anon;
select throws_ok($$ select public.adicionar_unidade(1, 'x') $$, '42501', null, 'visitante não chama as funções do professor');
reset role;

-- ---------------------------------------------------------------------------
-- Professor monta a estrutura de Fundamentos (4 unidades, 0 aulas)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "d0000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
set local role authenticated;

select is((public.adicionar_unidade(pg_temp.disciplina('FUND'), '  Sistemas operacionais ')).numero, 5::smallint,
  'unidade nova entra no fim, com o título sem espaços nas pontas');
select public.adicionar_aula(pg_temp.unidade('FUND', 1), t) from unnest(array['Placa-mãe', 'Processador', 'Memória', 'Armazenamento']) t;
select is(pg_temp.titulos(pg_temp.unidade('FUND', 1)), '1:Placa-mãe | 2:Processador | 3:Memória | 4:Armazenamento',
  'aulas novas recebem os números 1, 2, 3 e 4');

select lives_ok($$ select public.remover_aula((select id from public.aulas where unidade_id = pg_temp.unidade('FUND', 1) and numero = 2)) $$,
  'professor remove a aula 2');
select is(pg_temp.titulos(pg_temp.unidade('FUND', 1)), '1:Placa-mãe | 2:Memória | 3:Armazenamento',
  'as aulas seguintes são renumeradas sem buraco');

select lives_ok($$ update public.aulas set titulo = 'Memória RAM' where unidade_id = pg_temp.unidade('FUND', 1) and numero = 2 $$,
  'professor renomeia a aula');

-- Liberação da unidade inteira para uma turma
select is(public.liberar_unidade(pg_temp.oferta('1º INFO M', 'FUND'), pg_temp.unidade('FUND', 1), true), 3,
  'liberar a unidade libera as 3 aulas');
select is(public.liberar_unidade(pg_temp.oferta('1º INFO M', 'FUND'), pg_temp.unidade('FUND', 1), true), 0,
  'liberar de novo não duplica nada');
select throws_ok($$ select public.liberar_unidade(pg_temp.oferta('1º INFO M', 'FUND'), pg_temp.unidade('ALG', 1), true) $$,
  null, null, 'não libera unidade de outra disciplina');

-- Link da aula
select lives_ok($$ select public.definir_link_da_aula((select id from public.aulas where unidade_id = pg_temp.unidade('FUND', 1) and numero = 1), 'https://example.com/placa-mae', 'Slides') $$,
  'professor define o link da aula');
select lives_ok($$ select public.definir_link_da_aula((select id from public.aulas where unidade_id = pg_temp.unidade('FUND', 1) and numero = 1), 'https://example.com/placa-mae-v2', 'Slides') $$,
  'trocar o link substitui o anterior');
select throws_ok($$ select public.definir_link_da_aula((select id from public.aulas where unidade_id = pg_temp.unidade('FUND', 1) and numero = 1), 'javascript:alert(1)') $$,
  '23514', null, 'link sem https é recusado');
reset role;

-- O aluno aprovado do 1º INFO M vê o link novo, e só um
select set_config('request.jwt.claims', '{"sub": "d0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((select string_agg(url, ',') from public.materiais m join public.aulas a on a.id = m.aula_id where a.unidade_id = pg_temp.unidade('FUND', 1)),
  'https://example.com/placa-mae-v2', 'aluno vê só o link atual da aula liberada');
reset role;

-- Bloquear a unidade e remover uma unidade do meio
select set_config('request.jwt.claims', '{"sub": "d0000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
set local role authenticated;
select is(public.liberar_unidade(pg_temp.oferta('1º INFO M', 'FUND'), pg_temp.unidade('FUND', 1), false), 3,
  'bloquear a unidade bloqueia as 3 aulas');
select lives_ok($$ select public.remover_unidade(pg_temp.unidade('FUND', 2)) $$, 'professor remove a unidade 2');
select is((select string_agg(numero || ':' || titulo, ' | ' order by numero) from public.unidades where disciplina_id = pg_temp.disciplina('FUND')),
  '1:Hardware | 2:Redes de computadores | 3:Topologias de rede | 4:Sistemas operacionais',
  'as unidades seguintes são renumeradas sem buraco');
reset role;

select * from finish();
rollback;
