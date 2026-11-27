-- Testes dos novos tipos de medalha. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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

create function pg_temp.tem(p_medalha text) returns boolean language sql as $$
  select exists (select 1 from public.medalhas_ganhas
                 where aluno_id = 'fb000000-0000-0000-0000-0000000000a1' and medalha = p_medalha);
$$;

grant execute on function pg_temp.entrar(text) to authenticated;

select is((select count(*) from public.medalhas), 20::bigint, 'catálogo com 20 medalhas');

select pg_temp.criar_conta('fb000000-0000-0000-0000-00000000000f', 'docente.medalhas@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'fb000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('fb000000-0000-0000-0000-0000000000a1', 'orion.medalhas@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Órion Medalhas', 'turma_disciplina_id', pg_temp.oferta('1º INFO V', 'ALG')::text,
    'quem_e_voce', 'Órion Medalhas, 1º INFO V, tarde'));
update public.matriculas set status = 'aprovado' where aluno_id = 'fb000000-0000-0000-0000-0000000000a1';
delete from public.liberacoes where turma_disciplina_id = pg_temp.oferta('1º INFO V', 'ALG');
insert into public.liberacoes (turma_disciplina_id, aula_id) values (pg_temp.oferta('1º INFO V', 'ALG'), pg_temp.aula('ALG', 2, 1));

create temp table ex (nome text primary key, id bigint);
grant all on ex to authenticated;

-- Entrega única: para entregar de novo, o professor devolve. Ajudante que devolve as entregas abertas.
create function pg_temp.devolver_abertas() returns void language sql security definer as $$
  update public.entregas set devolvida_em = now() where devolvida_em is null;
$$;
grant execute on function pg_temp.devolver_abertas() to authenticated;
with i as (insert into public.exercicios (aula_id, titulo, enunciado) values (pg_temp.aula('ALG', 2, 1), 'Medalha A', 'x') returning id)
insert into ex select 'a', id from i;
with i as (insert into public.exercicios (aula_id, titulo, enunciado) values (pg_temp.aula('ALG', 2, 1), 'Medalha B', 'x') returning id)
insert into ex select 'b', id from i;
insert into public.testes (exercicio_id, tipo, saida_esperada) select id, 'visivel', '1' from ex;

-- Aluno: monta o boneco e entrega exercícios.
select pg_temp.entrar('fb000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select public.salvar_avatar('{"cabelo": "cabelo-curto"}');
select public.entregar((select id from ex where nome = 'a'), 'print(1)', 1);
select public.entregar((select id from ex where nome = 'b'), 'print(0)', 0);
select pg_temp.devolver_abertas();
select public.entregar((select id from ex where nome = 'b'), 'print(0)', 0);
select pg_temp.devolver_abertas();
select public.entregar((select id from ex where nome = 'b'), 'print(0)', 0);
select pg_temp.devolver_abertas();
reset role;

select ok(pg_temp.tem('estilista'), 'montar o boneco dá Estilista Espacial');
select ok(pg_temp.tem('primeiro-codigo'), 'acertar um exercício dá Primeiro Código');
select ok(not pg_temp.tem('cacador-de-bugs'), 'errar 3 vezes ainda não dá Caçador de Bugs');

select pg_temp.entrar('fb000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is(public.entregar((select id from ex where nome = 'b'), 'print(1)', 1) -> 'medalhas', '["cacador-de-bugs"]'::jsonb,
  'acertar na quarta tentativa dá Caçador de Bugs, e o aviso mostra');
reset role;

-- Professor deu XP em 3 dias diferentes.
insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, dado_por, criado_em)
select 'fb000000-0000-0000-0000-0000000000a1', 5, 'professor', 'Participação', 'fb000000-0000-0000-0000-00000000000f', now() - (d || ' days')::interval
from generate_series(0, 1) d;
select privado.conferir_medalhas('fb000000-0000-0000-0000-0000000000a1');
select ok(not pg_temp.tem('destaque-triplo'), 'XP do professor em 2 dias ainda não dá Coroa de Estrelas');
insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, dado_por, criado_em)
values ('fb000000-0000-0000-0000-0000000000a1', 5, 'professor', 'Participação', 'fb000000-0000-0000-0000-00000000000f', now() - interval '5 days');
select privado.conferir_medalhas('fb000000-0000-0000-0000-0000000000a1');
select ok(pg_temp.tem('destaque-triplo'), 'em 3 dias dá Coroa de Estrelas');

-- 10 aulas abertas e 500 XP.
insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, aula_id)
select 'fb000000-0000-0000-0000-0000000000a1', 50, 'aula', 'Abriu', a.id
from public.aulas a join public.unidades u on u.id = a.unidade_id join public.disciplinas d on d.id = u.disciplina_id
where d.sigla = 'ALG' order by u.numero, a.numero limit 10;
select ok(not pg_temp.tem('explorador'), 'antes de conferir, nada');
select privado.conferir_medalhas('fb000000-0000-0000-0000-0000000000a1');
select ok(pg_temp.tem('explorador') and pg_temp.tem('estrela-em-ascensao'), '10 aulas dão Explorador e 500 XP dão Estrela em Ascensão');
select ok(pg_temp.tem('colecionador'), 'com 8 outras medalhas vem o Colecionador');

-- Mestre dos Laços: 5 exercícios resolvidos com for ou while.
with novos as (
  insert into public.exercicios (aula_id, titulo, enunciado)
  select pg_temp.aula('ALG', 2, 1), 'Laço ' || i, 'x' from generate_series(1, 5) i returning id
)
insert into public.entregas (exercicio_id, aluno_id, codigo, testes_certos, testes_total, nota, tentativa)
select id, 'fb000000-0000-0000-0000-0000000000a1',
  case when row_number() over () = 5 then 'print(1)' else 'for i in range(3):' || E'\n' || '    print(i)' end, 1, 1, 10, 1
from novos;
select privado.conferir_medalhas('fb000000-0000-0000-0000-0000000000a1');
select ok(not pg_temp.tem('mestre-dos-lacos'), '4 exercícios com laço ainda não dão Mestre dos Laços');
update public.entregas set codigo = 'n = 3' || E'\n' || 'while n > 0:' || E'\n' || '    n -= 1'
where aluno_id = 'fb000000-0000-0000-0000-0000000000a1' and codigo = 'print(1)'
  and exercicio_id in (select id from public.exercicios where titulo like 'Laço %');
select privado.conferir_medalhas('fb000000-0000-0000-0000-0000000000a1');
select ok(pg_temp.tem('mestre-dos-lacos'), 'o quinto, com while, dá Mestre dos Laços');

-- Série da cobra: os 5 exercícios com laço também são Python (e 2 da primeira parte).
select ok(pg_temp.tem('cobrinha'), '3 exercícios em Python dão Cobrinha');
select ok(not pg_temp.tem('ninho-de-cobras'), 'tudo no mesmo dia ainda não dá Ninho de Cobras');
update public.entregas set criado_em = now() - (tentativa * 0 + (exercicio_id % 5)) * interval '1 day'
where aluno_id = 'fb000000-0000-0000-0000-0000000000a1'
  and exercicio_id in (select id from public.exercicios where titulo like 'Laço %');
select privado.conferir_medalhas('fb000000-0000-0000-0000-0000000000a1');
select ok(pg_temp.tem('ninho-de-cobras'), 'Python em 5 dias diferentes dá Ninho de Cobras');
update public.exercicios set dificuldade = 3 where titulo like 'Laço %';
select privado.conferir_medalhas('fb000000-0000-0000-0000-0000000000a1');
select ok(pg_temp.tem('encantador-de-serpentes'), '3 difíceis de primeira dão Encantador de Serpentes');

-- Sequência de 10 dias.
insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, referencia_dia)
values ('fb000000-0000-0000-0000-0000000000a1', 30, 'sequencia', '10 dias seguidos estudando', current_date);
select privado.conferir_medalhas('fb000000-0000-0000-0000-0000000000a1');
select ok(pg_temp.tem('incansavel'), '10 dias seguidos dão Incansável');

select * from finish();
rollback;
