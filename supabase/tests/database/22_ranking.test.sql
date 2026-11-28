-- Testes do ranking opcional por apelido. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

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

create function pg_temp.turma(p_turma text) returns bigint language sql as $$
  select id from public.turmas where nome = p_turma;
$$;

create function pg_temp.entrar(p_id text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.entrar(text) to authenticated;

create function pg_temp.aluno(p_id uuid, p_nome text, p_email text, p_turma text) returns void language plpgsql as $$
begin
  perform pg_temp.criar_conta(p_id, p_email,
    jsonb_build_object('nome', p_nome, 'turma_disciplina_id', pg_temp.oferta(p_turma, case when p_turma like '3%' then 'WEB' else 'ALG' end)::text,
      'quem_e_voce', p_nome || ', ' || p_turma || ', manhã'));
  update public.matriculas set status = 'aprovado' where aluno_id = p_id;
end;
$$;

select pg_temp.criar_conta('fc000000-0000-0000-0000-00000000000f', 'docente.rank@academico.ifpb.edu.br', '{"nome": "Prof. Fictício Ranking"}');
update public.perfis set papel = 'professor' where id = 'fc000000-0000-0000-0000-00000000000f';

-- a1, a2: 1º INFO M; a3: 1º INFO M mas sem apelido; b1: outra turma; p1: pedido pendente
select pg_temp.aluno('fc000000-0000-0000-0000-0000000000a1', 'Lyra Rank', 'lyra.rank@academico.ifpb.edu.br', '1º INFO M');
select pg_temp.aluno('fc000000-0000-0000-0000-0000000000a2', 'Draco Rank', 'draco.rank@academico.ifpb.edu.br', '1º INFO M');
select pg_temp.aluno('fc000000-0000-0000-0000-0000000000a3', 'Vega Rank', 'vega.rank@academico.ifpb.edu.br', '1º INFO M');
select pg_temp.aluno('fc000000-0000-0000-0000-0000000000b1', 'Altair Rank', 'altair.rank@academico.ifpb.edu.br', '3º INFO M');
select pg_temp.criar_conta('fc000000-0000-0000-0000-0000000000c1', 'rigel.rank@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Rigel Rank', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Rigel Rank, 1º INFO M, manhã'));

update public.perfis set apelido = 'Cometa Curioso' where id = 'fc000000-0000-0000-0000-0000000000a1';
update public.perfis set apelido = 'Estrela Veloz' where id = 'fc000000-0000-0000-0000-0000000000a2';
update public.perfis set apelido = 'Quasar Calmo' where id = 'fc000000-0000-0000-0000-0000000000b1';
update public.perfis set apelido = 'Pulsar Atento' where id = 'fc000000-0000-0000-0000-0000000000c1';

-- XP: a1 = 30 (confirmado) + 50 (a confirmar, não conta); a2 = 20 semana + 100 geral (evento antigo)
insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, dado_por, situacao) values
  ('fc000000-0000-0000-0000-0000000000a1', 30, 'professor', 'Participação', 'fc000000-0000-0000-0000-00000000000f', 'confirmado'),
  ('fc000000-0000-0000-0000-0000000000a1', 50, 'professor', 'Ainda a confirmar', 'fc000000-0000-0000-0000-00000000000f', 'a_confirmar'),
  ('fc000000-0000-0000-0000-0000000000a2', 20, 'professor', 'Participação', 'fc000000-0000-0000-0000-00000000000f', 'confirmado'),
  ('fc000000-0000-0000-0000-0000000000a2', 100, 'professor', 'Evento antigo', 'fc000000-0000-0000-0000-00000000000f', 'confirmado'),
  ('fc000000-0000-0000-0000-0000000000b1', 500, 'professor', 'Outra turma', 'fc000000-0000-0000-0000-00000000000f', 'confirmado');
update public.xp_eventos set criado_em = now() - interval '40 days' where descricao = 'Evento antigo';

-- Ninguém entra por padrão
select is((select count(*) from public.ranking_participantes), 0::bigint, 'ninguém começa dentro do ranking');

-- Entrar
select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((select participando from public.minha_situacao_no_ranking()), false, 'situação: fora do ranking');
select lives_ok($$ select public.entrar_no_ranking() $$, 'aluno com apelido entra no ranking');
select is((select participando from public.minha_situacao_no_ranking()), true, 'situação: dentro do ranking');
select throws_ok($$ insert into public.ranking_participantes (aluno_id) values ('fc000000-0000-0000-0000-0000000000a2') $$,
  '42501', null, 'aluno não escreve direto na tabela');
reset role;

select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select lives_ok($$ select public.entrar_no_ranking() $$, 'segundo aluno entra');
reset role;

-- Sem apelido, pendente e professor não entram
select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a3');
set local role authenticated;
select throws_ok($$ select public.entrar_no_ranking() $$, '23514', null, 'sem apelido não entra');
reset role;
select pg_temp.entrar('fc000000-0000-0000-0000-0000000000c1');
set local role authenticated;
select throws_ok($$ select public.entrar_no_ranking() $$, '42501', null, 'pedido pendente não entra');
reset role;
select pg_temp.entrar('fc000000-0000-0000-0000-00000000000f');
set local role authenticated;
select throws_ok($$ select public.entrar_no_ranking() $$, '42501', null, 'professor não entra');
reset role;

-- Aluno da outra turma entra no ranking dele
select pg_temp.entrar('fc000000-0000-0000-0000-0000000000b1');
set local role authenticated;
select lives_ok($$ select public.entrar_no_ranking() $$, 'aluno da outra turma entra');
reset role;

-- Ranking da semana: a1 (30, sem o "a confirmar") na frente de a2 (20, sem o evento antigo)
select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select results_eq($$ select posicao, apelido, xp, eh_voce from public.ranking_da_turma(pg_temp.turma('1º INFO M'), 'semana') $$,
  $$ values (1, 'Cometa Curioso'::text, 30, true), (2, 'Estrela Veloz'::text, 20, false) $$,
  'semana: só XP confirmado da semana, na ordem certa');
select results_eq($$ select apelido, xp from public.ranking_da_turma(pg_temp.turma('1º INFO M'), 'geral') $$,
  $$ values ('Estrela Veloz'::text, 120), ('Cometa Curioso'::text, 30) $$,
  'geral: XP confirmado de sempre');
select is((select count(*) from public.ranking_da_turma(pg_temp.turma('1º INFO M'), 'semana') where apelido = 'Pulsar Atento'), 0::bigint,
  'quem não entrou não aparece (pendente)');
select is((select count(*) from public.ranking_da_turma(pg_temp.turma('1º INFO M'), 'semana') where apelido = 'Quasar Calmo'), 0::bigint,
  'outra turma não aparece');
select throws_ok($$ select * from public.ranking_da_turma(pg_temp.turma('3º INFO M'), 'semana') $$, '42501', null,
  'aluno não vê o ranking de outra turma');
select throws_ok($$ select * from public.ranking_da_turma(pg_temp.turma('1º INFO M'), 'mes') $$, '22023', null, 'período inválido');
select ok(not (select proargnames && array['nome', 'email', 'turno'] from pg_proc where proname = 'ranking_da_turma'),
  'a resposta não tem coluna de nome, e-mail nem turno');
select is((select count(*) from public.ranking_participantes), 1::bigint, 'colega só lê a própria linha da tabela');
select throws_ok($$ select * from public.ranking_da_turma_professor(pg_temp.turma('1º INFO M')) $$, '42501', null,
  'aluno não usa a visão do professor');
-- Sair vale na hora
select lives_ok($$ select public.sair_do_ranking() $$, 'aluno sai do ranking');
reset role;
select pg_temp.entrar('fc000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select is((select count(*) from public.ranking_da_turma(pg_temp.turma('1º INFO M'), 'semana') where apelido = 'Cometa Curioso'), 0::bigint,
  'quem saiu some para os colegas');
reset role;

-- Limite de 10 linhas, mesmo com empate (todos com 0 XP na turma da tarde)
do $$
declare
  v_id uuid;
begin
  for i in 1..12 loop
    v_id := ('fd000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid;
    perform pg_temp.aluno(v_id, 'Fictício Empate ' || i, 'empate' || i || '.rank@academico.ifpb.edu.br', '1º INFO V');
    update public.perfis set apelido = privado.apelido_livre() where id = v_id;
    insert into public.ranking_participantes (aluno_id) values (v_id);
  end loop;
end;
$$;
select pg_temp.entrar('fd000000-0000-0000-0000-000000000012');
set local role authenticated;
-- (o apelido é sorteado: a própria linha pode cair entre as 10 primeiras ou vir à parte)
select ok((select count(*) from public.ranking_da_turma(pg_temp.turma('1º INFO V'), 'semana')) between 10 and 11,
  'com 12 empatados, o aluno recebe 10 linhas (+ a própria, se ficou de fora)');
select is((select count(*) from public.ranking_da_turma(pg_temp.turma('1º INFO V'), 'semana') where eh_voce), 1::bigint,
  'a própria linha vem uma vez só');
select ok((select bool_and(posicao = 1) from public.ranking_da_turma(pg_temp.turma('1º INFO V'), 'semana')), 'empatados dividem a 1ª posição');
reset role;

-- Professor vê tudo e tira aluno
select pg_temp.entrar('fc000000-0000-0000-0000-00000000000f');
set local role authenticated;
select is((select nome from public.ranking_da_turma_professor(pg_temp.turma('1º INFO M'), 'geral') limit 1), 'Draco Rank',
  'professor vê o nome real de quem está no ranking');
select lives_ok($$ select public.tirar_do_ranking('fc000000-0000-0000-0000-0000000000a2') $$, 'professor tira um aluno');
select is((select count(*) from public.ranking_da_turma_professor(pg_temp.turma('1º INFO M'), 'geral')), 0::bigint, 'ranking da turma vazio');
reset role;

set local role anon;
select throws_ok($$ select * from public.ranking_da_turma(1, 'semana') $$, '42501', null, 'visitante não vê o ranking');
reset role;

select * from finish();
rollback;
