-- Prova de treino do Modo Ninja: só o professor, sem gravar nada. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

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

select pg_temp.criar_conta('fd000000-0000-0000-0000-00000000000f', 'docente.treino@academico.ifpb.edu.br', '{"nome": "Prof. Fictício Treino"}');
update public.perfis set papel = 'professor' where id = 'fd000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('fd000000-0000-0000-0000-0000000000a1', 'lira.treino@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Lira Treino', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text, 'quem_e_voce', 'Lira Treino, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'fd000000-0000-0000-0000-0000000000a1';

create temp table ids (nome text primary key, valor bigint);
grant all on ids to authenticated;

select pg_temp.entrar('fd000000-0000-0000-0000-00000000000f');
set local role authenticated;
insert into ids values ('q1', public.salvar_exercicio(null, null, 'Soma', 'Leia dois números e mostre a soma.', 1, '',
  '[{"tipo": "visivel", "entrada": "1\n2", "saida_esperada": "3"}, {"tipo": "oculto", "entrada": "5\n5", "saida_esperada": "10"},
    {"tipo": "secreto", "entrada": "0\n0", "saida_esperada": "0"}]'));
-- Prova que só abre amanhã: o treino do ninja vale a qualquer hora.
insert into ids values ('prova', public.salvar_prova(null, pg_temp.oferta('1º INFO M', 'ALG'), 'Prova de amanhã', '',
  now() + interval '1 day', now() + interval '1 day 2 hours', 60, null,
  jsonb_build_array(jsonb_build_object('exercicio_id', (select valor from ids where nome = 'q1'), 'peso', 2))));

select is((select count(*) from public.questoes_da_prova_ninja((select valor from ids where nome = 'prova'))), 1::bigint,
  'professor recebe as questões da prova de treino mesmo antes de abrir');
select is((select jsonb_array_length(testes) from public.questoes_da_prova_ninja((select valor from ids where nome = 'prova'))), 2,
  'só testes visíveis e ocultos, como o aluno');
select is((select testes -> 1 ->> 'saida_esperada' from public.questoes_da_prova_ninja((select valor from ids where nome = 'prova'))), null,
  'teste oculto chega sem a saída esperada');
select isnt((select testes -> 1 ->> 'saida_hash' from public.questoes_da_prova_ninja((select valor from ids where nome = 'prova'))), null,
  'teste oculto chega com a impressão digital');
select is((select peso from public.questoes_da_prova_ninja((select valor from ids where nome = 'prova'))), 2::numeric, 'peso da questão');
reset role;

select is((select count(*) from public.prova_tentativas where prova_id = (select valor from ids where nome = 'prova')), 0::bigint,
  'treino não cria tentativa');
select is((select count(*) from public.xp_eventos where aluno_id = 'fd000000-0000-0000-0000-00000000000f'), 0::bigint,
  'treino não dá XP ao professor');

select pg_temp.entrar('fd000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select throws_ok($$ select * from public.questoes_da_prova_ninja((select valor from ids where nome = 'prova')) $$, '42501', null,
  'aluno não usa a prova de treino do ninja');
reset role;

select * from finish();
rollback;
