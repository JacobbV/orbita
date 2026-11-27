-- Testes das provas (Fase 4). Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

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

-- Professor, dois alunos aprovados em ALG 1º INFO M e um de outra turma.
select pg_temp.criar_conta('fc000000-0000-0000-0000-00000000000f', 'docente.prova@academico.ifpb.edu.br', '{"nome": "Prof. Fictício Prova"}');
update public.perfis set papel = 'professor' where id = 'fc000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('fc000000-0000-0000-0000-0000000000a1', 'gemeos.prova@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Gêmeos Prova', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text, 'quem_e_voce', 'Gêmeos Prova, 1º INFO M, manhã'));
select pg_temp.criar_conta('fc000000-0000-0000-0000-0000000000a2', 'aries.prova@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Áries Prova', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text, 'quem_e_voce', 'Áries Prova, 1º INFO M, manhã'));
select pg_temp.criar_conta('fc000000-0000-0000-0000-0000000000a3', 'touro.prova@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Touro Prova', 'turma_disciplina_id', pg_temp.oferta('1º INFO V', 'ALG')::text, 'quem_e_voce', 'Touro Prova, 1º INFO V, tarde'));
update public.matriculas set status = 'aprovado' where aluno_id::text like 'fc000000-%';

create temp table ids (nome text primary key, valor bigint);
grant all on ids to authenticated;

-- ---------------------------------------------------------------------------
-- Professor monta a prova com uma questão só de prova e um exercício de aula
-- ---------------------------------------------------------------------------
select pg_temp.entrar('fc000000-0000-0000-0000-00000000000f');
set local role authenticated;
insert into ids values ('q1', public.salvar_exercicio(null, null, 'Soma', 'Leia dois números e mostre a soma.', 1, '',
  '[{"tipo": "visivel", "entrada": "1\n2", "saida_esperada": "3"}, {"tipo": "oculto", "entrada": "5\n5", "saida_esperada": "10"},
    {"tipo": "secreto", "entrada": "0\n0", "saida_esperada": "0"}]'));
insert into ids values ('q2', public.salvar_exercicio(null, null, 'Dobro', 'Mostre o dobro.', 1, '',
  '[{"tipo": "visivel", "entrada": "2", "saida_esperada": "4"}]'));
select is((select aula_id from public.exercicios where id = (select valor from ids where nome = 'q1')), null, 'questão só de prova fica sem aula');

select throws_ok($$ select public.salvar_prova(null, pg_temp.oferta('1º INFO M', 'ALG'), 'Prova 1', '', now() + interval '1 hour', now(), 60, null,
  '[{"exercicio_id": 1}]') $$, '22023', null, 'fechar antes de abrir é recusado');
select throws_ok($$ select public.salvar_prova(null, pg_temp.oferta('1º INFO M', 'ALG'), 'Prova 1', '', now(), now() + interval '1 hour', 60, null, '[]') $$,
  '22023', null, 'prova sem questão é recusada');
select throws_ok($$ select public.salvar_prova(null, pg_temp.oferta('1º INFO M', 'ALG'), 'Prova 1', '', now(), now() + interval '1 hour', 60, 4,
  jsonb_build_array(jsonb_build_object('exercicio_id', (select valor from ids where nome = 'q1')))) $$,
  '22023', null, 'encerrar só na 1ª, 2ª ou 3ª saída');

insert into ids values ('prova', public.salvar_prova(null, pg_temp.oferta('1º INFO M', 'ALG'), 'Prova da unidade I', 'Sem consulta.',
  now() - interval '10 minutes', now() + interval '2 hours', 60, null,
  jsonb_build_array(
    jsonb_build_object('exercicio_id', (select valor from ids where nome = 'q1'), 'peso', 3),
    jsonb_build_object('exercicio_id', (select valor from ids where nome = 'q2'), 'peso', 1))));
insert into ids values ('futura', public.salvar_prova(null, pg_temp.oferta('1º INFO M', 'ALG'), 'Prova futura', '',
  now() + interval '1 day', now() + interval '1 day 2 hours', 60, 2,
  jsonb_build_array(jsonb_build_object('exercicio_id', (select valor from ids where nome = 'q2')))));
select is((select count(*) from public.prova_questoes where prova_id = (select valor from ids where nome = 'prova')), 2::bigint, 'prova com 2 questões');
select throws_ok($$ select public.remover_exercicio((select valor from ids where nome = 'q1')) $$, '55000', null,
  'exercício usado em prova não é removido');
reset role;

-- ---------------------------------------------------------------------------
-- Aluno
-- ---------------------------------------------------------------------------
select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((select count(*) from public.minhas_provas()), 2::bigint, 'aluno vê as duas provas da turma');
select is((select count(*) from public.prova_questoes), 0::bigint, 'aluno não lê as questões pela tabela');
select is((select count(*) from public.exercicios where aula_id is null), 0::bigint, 'aluno não lê questão só de prova pela tabela');
select throws_ok($$ select * from public.questoes_da_prova((select valor from ids where nome = 'prova')) $$, '42501', null,
  'questões só aparecem depois de começar');
select throws_ok($$ select public.comecar_prova((select valor from ids where nome = 'futura')) $$, '55000', null,
  'prova que ainda não abriu não começa');
select throws_ok($$ select public.testes_do_exercicio((select valor from ids where nome = 'q1')) $$, '42501', null,
  'testes da questão de prova não saem pela função do laboratório');

select ok(public.comecar_prova((select valor from ids where nome = 'prova')) <= now() + interval '60 minutes', 'começa com a duração');
select is((select count(*) from public.questoes_da_prova((select valor from ids where nome = 'prova'))), 2::bigint, 'vê as 2 questões');
select ok(not ((select testes from public.questoes_da_prova((select valor from ids where nome = 'prova')) where titulo = 'Soma')::text like '%"secreto"%'),
  'teste secreto não vai para o aluno');
select is((select jsonb_path_query_first(testes, '$[*] ? (@.tipo == "oculto").saida_esperada')
  from public.questoes_da_prova((select valor from ids where nome = 'prova')) where titulo = 'Soma'), 'null'::jsonb,
  'teste oculto vai sem a saída');
select throws_ok($$ select public.responder_questao((select id from public.prova_questoes limit 1), 'print(1)', 9) $$, 'P0002', null,
  'aluno não lê o id das questões pela tabela');
reset role;
insert into ids select 'questao_soma', q.id from public.prova_questoes q join public.exercicios e on e.id = q.exercicio_id
  where q.prova_id = (select valor from ids where nome = 'prova') and e.titulo = 'Soma';
insert into ids select 'questao_dobro', q.id from public.prova_questoes q join public.exercicios e on e.id = q.exercicio_id
  where q.prova_id = (select valor from ids where nome = 'prova') and e.titulo = 'Dobro';

select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select throws_ok($$ select public.responder_questao((select valor from ids where nome = 'questao_soma'), 'print(1)', 3) $$, '22023', null,
  'mais testes certos que o total é recusado');
select lives_ok($$ select public.responder_questao((select valor from ids where nome = 'questao_soma'), 'print(0)', 0) $$, 'responde');
select lives_ok($$ select public.responder_questao((select valor from ids where nome = 'questao_soma'), 'print(int(input())+int(input()))', 2) $$,
  'responde de novo: vale a última');
select is((select minha_resposta from public.questoes_da_prova((select valor from ids where nome = 'prova')) where titulo = 'Soma'),
  'print(int(input())+int(input()))', 'última resposta volta ao recarregar');
select is((public.registrar_saida_da_prova((select valor from ids where nome = 'prova')) ->> 'encerrada')::boolean, false,
  'com "só avisar", a saída não encerra');
select lives_ok($$ select public.registrar_volta_da_prova((select valor from ids where nome = 'prova')) $$, 'registra a volta');
select is((select nota from public.minhas_provas() where titulo = 'Prova da unidade I'), null, 'nota escondida antes de publicar');
select lives_ok($$ select public.entregar_prova((select valor from ids where nome = 'prova')) $$, 'entrega a prova');
select throws_ok($$ select public.responder_questao((select valor from ids where nome = 'questao_dobro'), 'print(4)', 1) $$, '55000', null,
  'depois de entregar não responde mais');
select throws_ok($$ select public.comecar_prova((select valor from ids where nome = 'prova')) $$, '55000', null,
  'não começa de novo');
reset role;

-- ---------------------------------------------------------------------------
-- Tempo acaba e encerramento por saídas
-- ---------------------------------------------------------------------------
select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select lives_ok($$ select public.comecar_prova((select valor from ids where nome = 'prova')) $$, 'segundo aluno começa');
reset role;
update public.prova_tentativas set termina_em = now() - interval '1 minute' where aluno_id = 'fc000000-0000-0000-0000-0000000000a2';
select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select throws_ok($$ select public.responder_questao((select valor from ids where nome = 'questao_dobro'), 'print(4)', 1) $$, '55000', null,
  'tempo acabado: resposta recusada');
select is((select encerrada_por from public.minhas_provas() where titulo = 'Prova da unidade I'), 'tempo', 'entregue sozinha pelo tempo');
reset role;

-- Aluno de outra turma não vê nem começa.
select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a3');
set local role authenticated;
select throws_ok($$ select public.comecar_prova((select valor from ids where nome = 'prova')) $$, 'P0002', null, 'outra turma não começa');
reset role;

-- ---------------------------------------------------------------------------
-- Professor: situação, reconferência, segunda chamada e publicação
-- ---------------------------------------------------------------------------
select pg_temp.entrar('fc000000-0000-0000-0000-00000000000f');
set local role authenticated;
select is((select nota from public.situacao_da_prova((select valor from ids where nome = 'prova')) where nome = 'Gêmeos Prova'),
  7.5, 'nota ponderada: 10 × peso 3 + 0 × peso 1 = 7,5');
select is((select saidas from public.situacao_da_prova((select valor from ids where nome = 'prova')) where nome = 'Gêmeos Prova'),
  1::smallint, 'professor vê a saída da aba');
select lives_ok($$ select public.conferir_resposta((select id from public.prova_respostas limit 1), false) $$, 'reconfere: não confere');
select is((select nota from public.situacao_da_prova((select valor from ids where nome = 'prova')) where nome = 'Gêmeos Prova'),
  0.0, '"não confere" vale zero');
select throws_ok($$ select public.salvar_prova((select valor from ids where nome = 'prova'), null, 'Prova da unidade I', '',
  now() - interval '10 minutes', now() + interval '2 hours', 60, null,
  jsonb_build_array(jsonb_build_object('exercicio_id', (select valor from ids where nome = 'q2')))) $$, '55000', null,
  'questões travadas depois que alguém começou');
select lives_ok($$ select public.liberar_segunda_chamada((select valor from ids where nome = 'prova'),
  'fc000000-0000-0000-0000-0000000000a2', now(), now() + interval '1 day') $$, 'libera segunda chamada');
select lives_ok($$ select public.publicar_notas((select valor from ids where nome = 'prova'), true) $$, 'publica as notas');
reset role;

select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select is((select comecou_em from public.minhas_provas() where titulo = 'Prova da unidade I'), null, 'segunda chamada zera a tentativa');
reset role;

select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((select nota from public.minhas_provas() where titulo = 'Prova da unidade I'), 0.0, 'nota aparece depois de publicada');
select throws_ok($$ select public.publicar_notas((select valor from ids where nome = 'prova'), true) $$, '42501', null, 'aluno não publica');
reset role;

select * from finish();
rollback;
