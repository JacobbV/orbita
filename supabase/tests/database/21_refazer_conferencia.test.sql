-- Refazer a conferência de entregas antigas: só melhora, devolve o XP que faltou. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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

select pg_temp.criar_conta('fe000000-0000-0000-0000-00000000000f', 'docente.refaz@academico.ifpb.edu.br', '{"nome": "Prof. Fictício Refaz"}');
update public.perfis set papel = 'professor' where id = 'fe000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('fe000000-0000-0000-0000-0000000000a1', 'mara.refaz@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Mara Refaz', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text, 'quem_e_voce', 'Mara Refaz, 1º INFO M, manhã'));
select pg_temp.criar_conta('fe000000-0000-0000-0000-0000000000a2', 'iago.refaz@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Iago Refaz', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text, 'quem_e_voce', 'Iago Refaz, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id in ('fe000000-0000-0000-0000-0000000000a1', 'fe000000-0000-0000-0000-0000000000a2');

create temp table ids (nome text primary key, valor bigint);
grant all on ids to authenticated;

select pg_temp.entrar('fe000000-0000-0000-0000-00000000000f');
set local role authenticated;
insert into ids values ('ex', public.salvar_exercicio(null, null, 'Dobro', 'Leia um número e mostre o dobro.', 2, '',
  '[{"tipo": "visivel", "entrada": "4", "saida_esperada": "8"}, {"tipo": "oculto", "entrada": "5", "saida_esperada": "10"},
    {"tipo": "secreto", "entrada": "6", "saida_esperada": "12"}]'));
reset role;

-- Mara: entregou com a regra antiga (1 de 2), sem XP. Iago: XP retirado numa reconferência antiga.
insert into public.entregas (exercicio_id, aluno_id, codigo, testes_certos, testes_total, nota, tentativa, situacao)
values ((select valor from ids where nome = 'ex'), 'fe000000-0000-0000-0000-0000000000a1', 'x', 1, 2, 5.0, 1, 'nao_confere'),
       ((select valor from ids where nome = 'ex'), 'fe000000-0000-0000-0000-0000000000a2', 'x', 1, 2, 5.0, 1, 'nao_confere');
insert into ids values ('mara', (select id from public.entregas where aluno_id = 'fe000000-0000-0000-0000-0000000000a1')),
                       ('iago', (select id from public.entregas where aluno_id = 'fe000000-0000-0000-0000-0000000000a2'));
insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, exercicio_id, situacao)
values ('fe000000-0000-0000-0000-0000000000a2', 35, 'exercicio', 'Resolveu Dobro', (select valor from ids where nome = 'ex'), 'retirado');

select pg_temp.entrar('fe000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select throws_ok(format('select public.refazer_conferencia(%s, 2, true)', (select valor from ids where nome = 'mara')),
  '42501', null, 'aluno não refaz conferência');
reset role;

select pg_temp.entrar('fe000000-0000-0000-0000-00000000000f');
set local role authenticated;
select throws_ok(format('select public.refazer_conferencia(%s, 3, true)', (select valor from ids where nome = 'mara')),
  '22023', null, 'mais testes certos que testes do exercício é recusado');

select is((public.refazer_conferencia((select valor from ids where nome = 'mara'), 2, false) ->> 'mudou')::boolean, true,
  'acertou os visíveis e ocultos mas errou o secreto: nota sobe');
reset role;
select is((select nota from public.entregas where id = (select valor from ids where nome = 'mara')), 10.0::numeric, 'nota subiu para 10');
select is((select count(*) from public.xp_eventos where aluno_id = 'fe000000-0000-0000-0000-0000000000a1'), 0::bigint,
  'sem acertar o secreto, não ganha XP');

select pg_temp.entrar('fe000000-0000-0000-0000-00000000000f');
set local role authenticated;
select is((public.refazer_conferencia((select valor from ids where nome = 'mara'), 2, true) ->> 'xp')::int, 35,
  'acertando tudo, recebe o XP que faltava');
select is((public.refazer_conferencia((select valor from ids where nome = 'mara'), 2, true) ->> 'mudou')::boolean, false,
  'repetir não muda nada');
select is((public.refazer_conferencia((select valor from ids where nome = 'iago'), 2, true) ->> 'xp')::int, 35,
  'XP retirado é devolvido');
select is((public.refazer_conferencia((select valor from ids where nome = 'iago'), 0, false) ->> 'mudou')::boolean, false,
  'resultado pior nunca rebaixa');
reset role;

select is((select count(*) from public.xp_eventos where aluno_id = 'fe000000-0000-0000-0000-0000000000a1' and situacao = 'confirmado'), 1::bigint,
  'um XP só para Mara');
select is((select count(*) from public.xp_eventos where aluno_id = 'fe000000-0000-0000-0000-0000000000a2' and situacao = 'confirmado'), 1::bigint,
  'o XP do Iago voltou a valer, sem duplicar');
select is((select situacao from public.entregas where id = (select valor from ids where nome = 'iago')), 'confirmada', 'entrega do Iago confirmada');

select * from finish();
rollback;
