-- Testes da presença na escola virtual: XP por tempo sentado. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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

select pg_temp.criar_conta('e3000000-0000-0000-0000-00000000000f', 'docente.presenca@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'e3000000-0000-0000-0000-00000000000f';

select pg_temp.criar_conta('e3000000-0000-0000-0000-0000000000a1', 'vega.presenca@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Vega Presenca', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Vega Presenca, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'e3000000-0000-0000-0000-0000000000a1';

set local role authenticated;
select pg_temp.entrar('e3000000-0000-0000-0000-0000000000a1');

select is((select (public.registrar_presenca_escola('lab-1') ->> 'xp')::int), 0, 'o primeiro sinal só marca o início');
select is((select (public.registrar_presenca_escola('lab-1') ->> 'xp')::int), 0, 'sinal em rajada não conta');
select throws_ok($$ select public.registrar_presenca_escola('copa') $$, '22023', 'Sala inválida.', 'sala de descanso não rende XP');

-- Voltar o relógio do último sinal para simular o tempo passando.
reset role;
update public.presencas_escola set ultimo_sinal = now() - interval '60 seconds', segundos = 840
where aluno_id = 'e3000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select pg_temp.entrar('e3000000-0000-0000-0000-0000000000a1');

select is((select (public.registrar_presenca_escola('lab-1') ->> 'xp')::int), 5, '15 minutos contados dão 5 XP');

reset role;
update public.presencas_escola set ultimo_sinal = now() - interval '10 minutes'
where aluno_id = 'e3000000-0000-0000-0000-0000000000a1';
select is((select segundos from public.presencas_escola where aluno_id = 'e3000000-0000-0000-0000-0000000000a1'), 900,
  'o tempo contado vem do relógio do banco');
set local role authenticated;
select pg_temp.entrar('e3000000-0000-0000-0000-0000000000a1');
select public.registrar_presenca_escola('lab-1');
select is((select segundos from public.presencas_escola where aluno_id = 'e3000000-0000-0000-0000-0000000000a1'), 990,
  'um sinal vale no máximo 90 segundos');

reset role;
update public.presencas_escola set ultimo_sinal = now() - interval '60 seconds', segundos = 99999, pagamentos = 3
where aluno_id = 'e3000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select pg_temp.entrar('e3000000-0000-0000-0000-0000000000a1');
select is((select (public.registrar_presenca_escola('lab-1') ->> 'xp')::int), 5, 'o quarto pagamento do dia sai');

reset role;
update public.presencas_escola set ultimo_sinal = now() - interval '60 seconds'
where aluno_id = 'e3000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select pg_temp.entrar('e3000000-0000-0000-0000-0000000000a1');
select is((select (public.registrar_presenca_escola('lab-1') ->> 'xp')::int), 0, 'passou de 4 pagamentos no dia, não rende mais');

select pg_temp.entrar('e3000000-0000-0000-0000-00000000000f');
select is((select (public.registrar_presenca_escola('lab-1') ->> 'xp')::int), 0, 'professor não ganha XP');

reset role;
select is((select count(*)::int from public.xp_eventos where motivo = 'presenca' and aluno_id = 'e3000000-0000-0000-0000-0000000000a1'), 2,
  'o aluno tem dois eventos de presença');

select * from finish();
rollback;
