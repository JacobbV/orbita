-- Testes do professor da nave (nome e boneco do professor para os alunos). Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

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
grant execute on function pg_temp.entrar(text) to authenticated;

select pg_temp.criar_conta('f9000000-0000-0000-0000-00000000000f', 'docente.nave@academico.ifpb.edu.br',
  '{"nome": "Prof. Fictício da Nave"}');
update public.perfis set papel = 'professor' where id = 'f9000000-0000-0000-0000-00000000000f';

select pg_temp.criar_conta('f9000000-0000-0000-0000-0000000000a1', 'polaris.nave@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Polaris Nave', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Polaris Nave, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'f9000000-0000-0000-0000-0000000000a1';

select pg_temp.criar_conta('f9000000-0000-0000-0000-0000000000a2', 'antares.nave@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Antares Nave', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Antares Nave, 1º INFO M, manhã'));

-- O professor salva o boneco dele.
select pg_temp.entrar('f9000000-0000-0000-0000-00000000000f');
set local role authenticated;
select public.salvar_avatar('{"rosto": "rosto-barba-e-oculos", "roupa": "roupa-cardiga"}');
reset role;

-- O primeiro professor cadastrado é o da nave.
create temp table esperado as
  select p.nome, a.escolhas from public.perfis p left join public.avatares a on a.perfil_id = p.id
  where p.papel = 'professor' order by p.criado_em limit 1;
grant select on esperado to authenticated;

select pg_temp.entrar('f9000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((select count(*) from public.professor_da_nave()), 1::bigint, 'aluno aprovado vê o professor da nave');
select is((select nome from public.professor_da_nave()), (select nome from esperado), 'com o nome do professor');
select is((select escolhas from public.professor_da_nave()), (select escolhas from esperado), 'e o boneco salvo');
reset role;

select pg_temp.entrar('f9000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select is((select count(*) from public.professor_da_nave()), 0::bigint, 'aluno ainda não aprovado não vê nada');
reset role;

set local role anon;
select throws_ok($$ select * from public.professor_da_nave() $$, '42501', null, 'quem não entrou não chama a função');
reset role;

select * from finish();
rollback;
