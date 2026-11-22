-- Testes dos slides HTML: bucket privado, quem registra os slides de uma aula
-- e quem consegue baixar o arquivo. Nomes e e-mails inventados.
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

-- Quantos arquivos do bucket de materiais a pessoa atual enxerga com este caminho.
create function pg_temp.ve(p_caminho text) returns bigint language sql as $$
  select count(*) from storage.objects where bucket_id = 'materiais' and name = p_caminho;
$$;

grant execute on function pg_temp.oferta(text, text), pg_temp.aula(text, int, int), pg_temp.ve(text)
  to anon, authenticated;

-- Estado limpo para as aulas usadas aqui (Web, unidade I, aulas 1 e 2).
delete from public.liberacoes where aula_id in (pg_temp.aula('WEB', 1, 1), pg_temp.aula('WEB', 1, 2));
delete from public.materiais where aula_id in (pg_temp.aula('WEB', 1, 1), pg_temp.aula('WEB', 1, 2));

select pg_temp.criar_conta('e0000000-0000-0000-0000-00000000000f', 'docente.ficticio@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'e0000000-0000-0000-0000-00000000000f';

-- Aprovada no 3º INFO M (Web)
select pg_temp.criar_conta('e0000000-0000-0000-0000-0000000000a1', 'nebulosa.orion@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Nebulosa Orion', 'turma_disciplina_id', pg_temp.oferta('3º INFO M', 'WEB')::text,
    'quem_e_voce', 'Nebulosa Orion, 3º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'e0000000-0000-0000-0000-0000000000a1';

-- Aprovado no 3º INFO V (outra turma da mesma disciplina)
select pg_temp.criar_conta('e0000000-0000-0000-0000-0000000000a2', 'pulsar.vela@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Pulsar Vela', 'turma_disciplina_id', pg_temp.oferta('3º INFO V', 'WEB')::text,
    'quem_e_voce', 'Pulsar Vela, 3º INFO V, tarde'));
update public.matriculas set status = 'aprovado' where aluno_id = 'e0000000-0000-0000-0000-0000000000a2';

-- Pendente no 3º INFO M
select pg_temp.criar_conta('e0000000-0000-0000-0000-0000000000a3', 'quasar.lira@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Quasar Lira', 'turma_disciplina_id', pg_temp.oferta('3º INFO M', 'WEB')::text,
    'quem_e_voce', 'Quasar Lira, 3º INFO M, manhã'));

-- Arquivos de exemplo no bucket (o envio de verdade passa pela API do Storage).
insert into storage.objects (bucket_id, name, owner_id)
values ('materiais', 'aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-1.html', 'e0000000-0000-0000-0000-00000000000f'),
       ('materiais', 'aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-2.html', 'e0000000-0000-0000-0000-00000000000f'),
       ('materiais', 'aulas/' || pg_temp.aula('WEB', 1, 2) || '/slides-1.html', 'e0000000-0000-0000-0000-00000000000f');

select is((select public from storage.buckets where id = 'materiais'), false, 'o bucket de materiais é privado');

-- ---------------------------------------------------------------------------
-- Quem registra os slides
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "e0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.definir_slides_da_aula(pg_temp.aula('WEB', 1, 1), 'aulas/' || pg_temp.aula('WEB', 1, 1) || '/x.html') $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não registra slides');
select throws_ok($$ select public.remover_slides_da_aula(pg_temp.aula('WEB', 1, 1)) $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não remove slides');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('materiais', 'aulas/1/invasao.html') $$,
  '42501', null, 'aluno não envia arquivo ao bucket');
reset role;

set local role anon;
select throws_ok($$ select public.definir_slides_da_aula(1, 'aulas/1/x.html') $$, '42501', null,
  'visitante nem enxerga a função de slides');
reset role;

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.definir_slides_da_aula(pg_temp.aula('WEB', 1, 1), 'aulas/999999/x.html') $$,
  '22023', 'Caminho de slides inválido.', 'caminho de outra aula é recusado');
select throws_ok($$ select public.definir_slides_da_aula(pg_temp.aula('WEB', 1, 1), 'aulas/' || pg_temp.aula('WEB', 1, 1) || '/x.pdf') $$,
  '22023', 'Caminho de slides inválido.', 'arquivo que não é .html é recusado');
select is(public.definir_slides_da_aula(pg_temp.aula('WEB', 1, 1), 'aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-1.html', 'Slides'),
  null, 'primeiros slides da aula: nada para apagar');
select is(public.definir_slides_da_aula(pg_temp.aula('WEB', 1, 1), 'aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-2.html'),
  'aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-1.html', 'enviar de novo substitui e devolve o arquivo antigo');
select is((select count(*) from public.materiais where aula_id = pg_temp.aula('WEB', 1, 1) and tipo = 'slide'), 1::bigint,
  'a aula fica com um só arquivo de slides');
select public.definir_slides_da_aula(pg_temp.aula('WEB', 1, 2), 'aulas/' || pg_temp.aula('WEB', 1, 2) || '/slides-1.html');
select is(pg_temp.ve('aulas/' || pg_temp.aula('WEB', 1, 2) || '/slides-1.html'), 1::bigint,
  'professor baixa slides de aula bloqueada (modo apresentação)');

-- Libera só a aula 1 para o 3º INFO M
insert into public.liberacoes (turma_disciplina_id, aula_id) values (pg_temp.oferta('3º INFO M', 'WEB'), pg_temp.aula('WEB', 1, 1));
reset role;

-- ---------------------------------------------------------------------------
-- Quem baixa os arquivos
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "e0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(pg_temp.ve('aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-2.html'), 1::bigint,
  'aluno aprovado baixa os slides da aula liberada');
select is(pg_temp.ve('aulas/' || pg_temp.aula('WEB', 1, 2) || '/slides-1.html'), 0::bigint,
  'aluno aprovado não baixa os slides de aula bloqueada');
select is(pg_temp.ve('aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-1.html'), 0::bigint,
  'arquivo antigo, sem material ligado, não é baixado');
reset role;

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-0000-0000-0000000000a2", "role": "authenticated"}', true);
set local role authenticated;
select is(pg_temp.ve('aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-2.html'), 0::bigint,
  'aluno de outra turma não baixa os slides');
reset role;

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-0000-0000-0000000000a3", "role": "authenticated"}', true);
set local role authenticated;
select is(pg_temp.ve('aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-2.html'), 0::bigint,
  'aluno pendente não baixa os slides');
reset role;

set local role anon;
select is(pg_temp.ve('aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-2.html'), 0::bigint,
  'visitante não baixa os slides');
reset role;

-- Professor tira os slides: o aluno perde o acesso ao arquivo
select set_config('request.jwt.claims', '{"sub": "e0000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
set local role authenticated;
select is(public.remover_slides_da_aula(pg_temp.aula('WEB', 1, 1)), 'aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-2.html',
  'remover devolve o arquivo para apagar');
reset role;

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(pg_temp.ve('aulas/' || pg_temp.aula('WEB', 1, 1) || '/slides-2.html'), 0::bigint,
  'sem os slides registrados, o aluno não baixa mais o arquivo');
reset role;

select * from finish();
rollback;
