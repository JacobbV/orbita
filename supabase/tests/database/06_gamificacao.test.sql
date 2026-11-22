-- Testes da gamificação: XP ao abrir aula liberada, sequência de estudo,
-- patentes, medalhas, XP dado pelo professor e avatares. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

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

-- Estado limpo para a ALG no 1º INFO M e no 1º INFO V.
delete from public.liberacoes where turma_disciplina_id in (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.oferta('1º INFO V', 'ALG'));

select pg_temp.criar_conta('f0000000-0000-0000-0000-00000000000f', 'docente.ficticio@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'f0000000-0000-0000-0000-00000000000f';

select pg_temp.criar_conta('f0000000-0000-0000-0000-0000000000a1', 'andromeda.vega@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Andrômeda Vega', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Andrômeda Vega, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'f0000000-0000-0000-0000-0000000000a1';

select pg_temp.criar_conta('f0000000-0000-0000-0000-0000000000a2', 'sirius.altair@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Sírius Altair', 'turma_disciplina_id', pg_temp.oferta('1º INFO V', 'ALG')::text,
    'quem_e_voce', 'Sírius Altair, 1º INFO V, tarde'));
update public.matriculas set status = 'aprovado' where aluno_id = 'f0000000-0000-0000-0000-0000000000a2';

select pg_temp.criar_conta('f0000000-0000-0000-0000-0000000000a3', 'cassiopeia.rigel@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Cassiopeia Rigel', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Cassiopeia Rigel, 1º INFO M, manhã'));

-- Aulas I.1 e I.2 liberadas para o 1º INFO M.
insert into public.liberacoes (turma_disciplina_id, aula_id)
values (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 1, 1)),
       (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 1, 2));

-- ---------------------------------------------------------------------------
-- XP ao abrir aula
-- ---------------------------------------------------------------------------
select pg_temp.entrar('f0000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((public.registrar_abertura_da_aula(pg_temp.aula('ALG', 1, 1)) ->> 'xp')::int, 10,
  'primeira vez na aula liberada: +10 XP');
select is((public.registrar_abertura_da_aula(pg_temp.aula('ALG', 1, 1)) ->> 'xp')::int, 0,
  'abrir de novo não dá XP');
select is((public.meu_progresso() ->> 'xp')::int, 10, 'progresso soma o XP');
select is(public.meu_progresso() ->> 'patente', 'Cadete', 'com 10 XP é Cadete');
select is((public.meu_progresso() ->> 'xp_da_proxima')::int, 100, 'próxima patente com 100 XP');
select is((select count(*) from public.medalhas_ganhas where medalha = 'primeira-aula'), 1::bigint,
  'ganhou a medalha Primeira Aula');
select throws_ok($$ select public.registrar_abertura_da_aula(pg_temp.aula('ALG', 1, 3)) $$,
  '42501', 'Esta aula ainda não foi liberada para a sua turma.', 'aula bloqueada não dá XP');
select throws_ok($$ insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, dado_por)
  values ('f0000000-0000-0000-0000-0000000000a1', 500, 'professor', 'trapaça', 'f0000000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'aluno não cria XP direto na tabela');
select throws_ok($$ select public.dar_xp('f0000000-0000-0000-0000-0000000000a1', 50, 'eu mesmo') $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não se dá XP');
select throws_ok($$ select * from public.xp_da_turma(pg_temp.oferta('1º INFO M', 'ALG')) $$,
  '42501', 'Só o professor pode fazer isso.', 'aluno não vê o XP da turma (sem ranking)');
reset role;

-- Outra turma e aluno pendente não ganham XP com a aula do 1º INFO M.
select pg_temp.entrar('f0000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select throws_ok($$ select public.registrar_abertura_da_aula(pg_temp.aula('ALG', 1, 1)) $$,
  '42501', null, 'aluno de outra turma não ganha XP');
select is((select count(*) from public.xp_eventos), 0::bigint, 'aluno não enxerga o XP dos colegas');
select is((select count(*) from public.medalhas_ganhas), 0::bigint, 'nem as medalhas dos colegas');
reset role;

select pg_temp.entrar('f0000000-0000-0000-0000-0000000000a3');
set local role authenticated;
select throws_ok($$ select public.registrar_abertura_da_aula(pg_temp.aula('ALG', 1, 1)) $$,
  '42501', null, 'aluno pendente não ganha XP');
reset role;

set local role anon;
select throws_ok($$ select public.meu_progresso() $$, '42501', null, 'visitante não chama o progresso');
reset role;

-- Professor abre aula sem ganhar XP.
select pg_temp.entrar('f0000000-0000-0000-0000-00000000000f');
set local role authenticated;
select is((public.registrar_abertura_da_aula(pg_temp.aula('ALG', 1, 3)) ->> 'xp')::int, 0, 'professor não ganha XP');
reset role;

-- ---------------------------------------------------------------------------
-- Sequência de 5 dias
-- ---------------------------------------------------------------------------
insert into public.dias_de_estudo (aluno_id, dia)
select 'f0000000-0000-0000-0000-0000000000a1', privado.hoje() - n from generate_series(1, 4) n;

select pg_temp.entrar('f0000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((public.registrar_abertura_da_aula(pg_temp.aula('ALG', 1, 2)) ->> 'xp')::int, 40,
  'quinto dia seguido: +10 da aula e +30 da sequência');
select is((select count(*) from public.medalhas_ganhas where medalha = 'maratonista'), 1::bigint,
  'ganhou a medalha Maratonista');
select is((public.registrar_abertura_da_aula(pg_temp.aula('ALG', 1, 2)) ->> 'xp')::int, 0,
  'a sequência é premiada uma vez por dia');
reset role;

-- ---------------------------------------------------------------------------
-- Unidade completa
-- ---------------------------------------------------------------------------
insert into public.liberacoes (turma_disciplina_id, aula_id)
select pg_temp.oferta('1º INFO M', 'ALG'), a.id
from public.aulas a join public.unidades u on u.id = a.unidade_id join public.disciplinas d on d.id = u.disciplina_id
where d.sigla = 'ALG' and u.numero = 1 and a.numero >= 3;

select pg_temp.entrar('f0000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select public.registrar_abertura_da_aula(a.id)
from public.aulas a join public.unidades u on u.id = a.unidade_id join public.disciplinas d on d.id = u.disciplina_id
where d.sigla = 'ALG' and u.numero = 1 and a.numero between 3 and 5;
select is((select count(*) from public.medalhas_ganhas where medalha = 'unidade-completa'), 0::bigint,
  'faltando uma aula, ainda não completa a unidade');
select ok(public.registrar_abertura_da_aula(pg_temp.aula('ALG', 1, 6)) -> 'medalhas' ? 'unidade-completa',
  'abriu todas as aulas da unidade: medalha Unidade Completa');
reset role;

-- ---------------------------------------------------------------------------
-- XP dado pelo professor
-- ---------------------------------------------------------------------------
select pg_temp.entrar('f0000000-0000-0000-0000-00000000000f');
set local role authenticated;
select throws_ok($$ select public.dar_xp('f0000000-0000-0000-0000-0000000000a1', 500, 'demais') $$,
  '22023', 'Escolha de 1 a 100 XP.', 'professor dá no máximo 100 XP por vez');
select lives_ok($$ select public.dar_xp('f0000000-0000-0000-0000-0000000000a1', 20, 'Participação na aula') $$,
  'professor dá XP por participação');
select is((select xp from public.xp_da_turma(pg_temp.oferta('1º INFO M', 'ALG'))
  where aluno_id = 'f0000000-0000-0000-0000-0000000000a1'), 110,
  'professor vê o XP do aluno: 6 aulas + sequência + participação');
select is((select patente from public.xp_da_turma(pg_temp.oferta('1º INFO M', 'ALG'))
  where aluno_id = 'f0000000-0000-0000-0000-0000000000a1'), 'Piloto', 'com 110 XP é Piloto');
select is((select count(*) from public.medalhas_ganhas
  where aluno_id = 'f0000000-0000-0000-0000-0000000000a1' and medalha = 'destaque'), 1::bigint,
  'XP do professor dá a medalha Destaque da Aula');
reset role;

-- ---------------------------------------------------------------------------
-- Avatares
-- ---------------------------------------------------------------------------
insert into public.pecas (id, camada, nome, para, xp_minimo) values
  ('teste-corpo', 'corpo', 'Corpo de teste', 'todos', 0),
  ('teste-barba', 'acessorio', 'Barba de teste', 'professor', 0),
  ('teste-capacete', 'acessorio', 'Capacete de teste', 'todos', 900);

select pg_temp.entrar('f0000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select lives_ok($$ select public.salvar_avatar('{"corpo": "teste-corpo"}') $$, 'aluno salva o avatar');
select throws_ok($$ select public.salvar_avatar('{"acessorio": "teste-barba"}') $$,
  '22023', 'Peça indisponível: teste-barba.', 'peça de professor não serve para aluno');
select throws_ok($$ select public.salvar_avatar('{"acessorio": "teste-capacete"}') $$,
  '22023', 'Peça indisponível: teste-capacete.', 'peça trancada por XP');
select throws_ok($$ select public.salvar_avatar('{"cabelo": "teste-corpo"}') $$,
  '22023', null, 'peça na camada errada');
select throws_ok($$ insert into public.avatares (perfil_id, escolhas) values (auth.uid(), '{"acessorio": "teste-barba"}') $$,
  '42501', null, 'aluno não grava o avatar direto na tabela');
reset role;

select pg_temp.entrar('f0000000-0000-0000-0000-00000000000f');
set local role authenticated;
select public.salvar_avatar('{"corpo": "teste-corpo", "acessorio": "teste-barba"}');
reset role;

select pg_temp.entrar('f0000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select is((select count(*) from public.avatares), 1::bigint,
  'aluno vê o avatar do professor, mas não o dos colegas');
reset role;

select * from finish();
rollback;
