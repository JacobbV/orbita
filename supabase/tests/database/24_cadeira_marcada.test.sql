-- Testes da cadeira marcada no laboratório. Nomes inventados.
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

create function pg_temp.entrar(p_id text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;

grant execute on function pg_temp.oferta(text, text), pg_temp.entrar(text) to anon, authenticated;

select pg_temp.criar_conta('e4000000-0000-0000-0000-00000000000f', 'docente.cadeira@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'e4000000-0000-0000-0000-00000000000f';

select pg_temp.criar_conta('e4000000-0000-0000-0000-0000000000a1', 'orion.cadeira@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Orion Cadeira', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Orion Cadeira, 1º INFO M, manhã'));
select pg_temp.criar_conta('e4000000-0000-0000-0000-0000000000a2', 'lira.cadeira@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Lira Cadeira', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Lira Cadeira, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado'
where aluno_id in ('e4000000-0000-0000-0000-0000000000a1', 'e4000000-0000-0000-0000-0000000000a2');

set local role authenticated;
select pg_temp.entrar('e4000000-0000-0000-0000-0000000000a1');

select lives_ok($$ select public.escolher_cadeira('lab-1', 'lab-1-5') $$, 'aluno marca uma cadeira');
select is((select count(*)::int from public.cadeiras_ocupadas() where minha), 1, 'ele vê qual é a sua');
select lives_ok($$ select public.escolher_cadeira('lab-1', 'lab-1-6') $$, 'trocar de cadeira funciona');
select is((select assento from public.cadeiras_ocupadas() where minha), 'lab-1-6', 'a cadeira antiga fica livre e a nova é a dele');
select throws_ok($$ select public.escolher_cadeira('lab-1', 'lab-2-3') $$, '22023', 'Cadeira inválida.', 'cadeira de outra sala é recusada');

select pg_temp.entrar('e4000000-0000-0000-0000-0000000000a2');
select throws_ok($$ select public.escolher_cadeira('lab-1', 'lab-1-6') $$, '23505', 'Esta cadeira já tem dono.', 'cadeira com dono é recusada');
select is((select count(*)::int from public.cadeiras_escola), 0, 'aluno não lê a tabela dos outros');

select pg_temp.entrar('e4000000-0000-0000-0000-00000000000f');
select throws_ok($$ select public.escolher_cadeira('lab-1', 'lab-1-7') $$, '42501', 'Cadeira marcada é só para alunos.', 'professor não marca cadeira');
select is((select count(*)::int from public.cadeiras_escola), 1, 'professor vê as cadeiras marcadas');

select * from finish();
rollback;
