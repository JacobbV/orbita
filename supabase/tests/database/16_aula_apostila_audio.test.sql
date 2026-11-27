-- Testes da tela da aula: tópicos, apostila, áudio e o XP de ouvir o áudio.
-- Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

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

grant execute on function pg_temp.oferta(text, text), pg_temp.aula(text, int, int), pg_temp.entrar(text)
  to anon, authenticated;

delete from public.materiais where aula_id in (pg_temp.aula('ALG', 2, 1), pg_temp.aula('ALG', 2, 2));
delete from public.liberacoes where aula_id in (pg_temp.aula('ALG', 2, 1), pg_temp.aula('ALG', 2, 2));

select pg_temp.criar_conta('e2000000-0000-0000-0000-00000000000f', 'docente.apostila@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'e2000000-0000-0000-0000-00000000000f';

select pg_temp.criar_conta('e2000000-0000-0000-0000-0000000000a1', 'lyra.apostila@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Lyra Apostila', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Lyra Apostila, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'e2000000-0000-0000-0000-0000000000a1';

insert into public.liberacoes (turma_disciplina_id, aula_id)
values (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 2, 1));

-- Professor: tópicos
set local role authenticated;
select pg_temp.entrar('e2000000-0000-0000-0000-00000000000f');

select lives_ok(
  format($$ select public.definir_topicos_da_aula(%s, array['  Variáveis ', '', 'Tipos de dado']) $$, pg_temp.aula('ALG', 2, 1)),
  'professor define os tópicos');
select is((select topicos from public.aulas where id = pg_temp.aula('ALG', 2, 1)), array['Variáveis', 'Tipos de dado'],
  'tópicos vazios saem e os espaços das pontas também');
select throws_ok(
  format($$ select public.definir_topicos_da_aula(%s, array['a','b','c','d','e','f']) $$, pg_temp.aula('ALG', 2, 1)),
  '22023', 'Use no máximo 5 tópicos.', 'mais de 5 tópicos são recusados');
select throws_ok(
  format($$ select public.definir_topicos_da_aula(%s, array[repeat('x', 121)]) $$, pg_temp.aula('ALG', 2, 1)),
  '22023', 'Cada tópico pode ter até 120 letras.', 'tópico comprido demais é recusado');

-- Professor: apostila e áudio
select lives_ok(
  format($$ select public.definir_material_da_aula(%s, 'apostila', 'aulas/%s/apostila-1.html') $$, pg_temp.aula('ALG', 2, 1), pg_temp.aula('ALG', 2, 1)),
  'professor registra a apostila');
select lives_ok(
  format($$ select public.definir_material_da_aula(%s, 'audio', 'aulas/%s/audio-1.mp3') $$, pg_temp.aula('ALG', 2, 1), pg_temp.aula('ALG', 2, 1)),
  'professor registra o áudio');
select is(
  (select public.definir_material_da_aula(pg_temp.aula('ALG', 2, 1), 'apostila', 'aulas/' || pg_temp.aula('ALG', 2, 1) || '/apostila-2.html')),
  'aulas/' || pg_temp.aula('ALG', 2, 1) || '/apostila-1.html',
  'trocar a apostila devolve o arquivo antigo');
select is((select count(*)::int from public.materiais where aula_id = pg_temp.aula('ALG', 2, 1) and tipo = 'apostila'), 1,
  'uma aula tem uma só apostila');
select throws_ok(
  format($$ select public.definir_material_da_aula(%s, 'audio', 'aulas/%s/audio.html') $$, pg_temp.aula('ALG', 2, 1), pg_temp.aula('ALG', 2, 1)),
  '22023', 'Caminho do arquivo inválido.', 'áudio precisa ser .mp3');
select throws_ok(
  format($$ select public.definir_material_da_aula(%s, 'video', 'aulas/%s/v.mp3') $$, pg_temp.aula('ALG', 2, 1), pg_temp.aula('ALG', 2, 1)),
  '22023', 'Tipo de material inválido.', 'só apostila e áudio por aqui');

-- Aluno
select pg_temp.entrar('e2000000-0000-0000-0000-0000000000a1');
select throws_ok(
  format($$ select public.definir_topicos_da_aula(%s, array['x']) $$, pg_temp.aula('ALG', 2, 1)),
  '42501', null, 'aluno não define tópicos');
select throws_ok(
  format($$ select public.definir_material_da_aula(%s, 'audio', 'aulas/%s/a.mp3') $$, pg_temp.aula('ALG', 2, 1), pg_temp.aula('ALG', 2, 1)),
  '42501', null, 'aluno não registra material');

select is((select (public.registrar_audio_ouvido(pg_temp.aula('ALG', 2, 1)) ->> 'xp')::int), 10, 'ouvir o áudio dá 10 XP');
select is((select (public.registrar_audio_ouvido(pg_temp.aula('ALG', 2, 1)) ->> 'xp')::int), 0, 'ouvir de novo não dá XP');
select is((select count(*)::int from public.xp_eventos where aluno_id = 'e2000000-0000-0000-0000-0000000000a1' and motivo = 'audio'), 1,
  'um só evento de áudio por aula');
select throws_ok(
  format($$ select public.registrar_audio_ouvido(%s) $$, pg_temp.aula('ALG', 2, 2)),
  '42501', 'Esta aula ainda não foi liberada para a sua turma.', 'aula não liberada não dá XP');

-- Professor remove o áudio; sem áudio, não há XP
select pg_temp.entrar('e2000000-0000-0000-0000-00000000000f');
select is((select public.remover_material_da_aula(pg_temp.aula('ALG', 2, 1), 'audio')),
  'aulas/' || pg_temp.aula('ALG', 2, 1) || '/audio-1.mp3', 'remover o áudio devolve o arquivo');
reset role;
select is((select count(*)::int from public.materiais where aula_id = pg_temp.aula('ALG', 2, 1) and tipo = 'audio'), 0,
  'o áudio saiu');

select * from finish();
rollback;
