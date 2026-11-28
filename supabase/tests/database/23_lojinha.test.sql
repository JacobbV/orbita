-- Testes da lojinha: moedas separadas do XP, compra, troca de XP, prêmios
-- automáticos (boas-vindas, exercícios e prova) e ações do professor.
-- Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(50);

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

create function pg_temp.saldo(p_id uuid) returns integer language sql as $$ select privado.saldo_de_moedas(p_id) $$;

-- Professor, dois alunos de ALG 1º INFO M (um aprovado, um pendente).
select pg_temp.criar_conta('1b000000-0000-0000-0000-00000000000f', 'docente.loja@academico.ifpb.edu.br', '{"nome": "Prof. Fictício Loja"}');
update public.perfis set papel = 'professor' where id = '1b000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('1b000000-0000-0000-0000-0000000000a1', 'orion.loja@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Órion Loja', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text, 'quem_e_voce', 'Órion Loja, 1º INFO M, manhã'));
select pg_temp.criar_conta('1b000000-0000-0000-0000-0000000000a2', 'lira.loja@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Lira Loja', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text, 'quem_e_voce', 'Lira Loja, 1º INFO M, manhã'));

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------
select is((select count(*) from public.pecas where preco is not null), 26::bigint, '26 peças na loja');
select is((select count(*) from public.pecas where xp_minimo > 0), 5::bigint, 'só as 5 do uniforme continuam por XP');
select is((select preco from public.pecas where id = 'acessorio-chapeu-viking'), 80, 'chapéu viking custa 80');
select is((select preco from public.pecas where id = 'cabelo-rosa'), 15, 'cabelo rosa custa 15');
select is((select preco from public.pecas where id = 'acessorio-chifres'), 40, 'chifres custam 40');

-- ---------------------------------------------------------------------------
-- Boas-vindas
-- ---------------------------------------------------------------------------
select is(pg_temp.saldo('1b000000-0000-0000-0000-0000000000a1'), 0, 'pedido pendente ainda não tem moedas');
update public.matriculas set status = 'aprovado' where aluno_id = '1b000000-0000-0000-0000-0000000000a1';
select is(pg_temp.saldo('1b000000-0000-0000-0000-0000000000a1'), 5, 'aprovado ganha 5 de boas-vindas');
update public.matriculas set status = 'aprovado' where aluno_id = '1b000000-0000-0000-0000-0000000000a1';
select is(pg_temp.saldo('1b000000-0000-0000-0000-0000000000a1'), 5, 'boas-vindas só uma vez');

-- XP não vira moeda sozinho.
insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, dado_por)
values ('1b000000-0000-0000-0000-0000000000a1', 100, 'professor', 'Participação', '1b000000-0000-0000-0000-00000000000f'),
       ('1b000000-0000-0000-0000-0000000000a1', 60, 'professor', 'Participação', '1b000000-0000-0000-0000-00000000000f');
select is(pg_temp.saldo('1b000000-0000-0000-0000-0000000000a1'), 5, 'ganhar XP não dá moedas');

-- ---------------------------------------------------------------------------
-- Aluno: progresso, compra e troca
-- ---------------------------------------------------------------------------
select pg_temp.entrar('1b000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((public.meu_progresso() ->> 'moedas')::integer, 5, 'progresso mostra as moedas');
select is((public.meu_progresso() ->> 'xp')::integer, 160, 'progresso mostra o XP');
select throws_ok($$ select public.salvar_avatar('{"cor-do-cabelo": "cabelo-rosa"}') $$, '22023', null,
  'peça da loja não comprada não entra no boneco, mesmo com XP');
select throws_ok($$ select public.comprar_peca('cabelo-rosa') $$, '22023', 'Faltam 10 moedas para esta peça.', 'sem moedas, não compra');
select throws_ok($$ select public.comprar_peca('acessorio-capacete') $$, '22023', null, 'peça do uniforme não se compra');
select throws_ok($$ select public.comprar_peca('roupa-cardiga') $$, '22023', null, 'peça do professor não se compra');
select throws_ok($$ select public.trocar_xp_por_moedas(4) $$, '22023', null, 'troca precisa de 50 XP por moeda');
select is((public.trocar_xp_por_moedas(2) ->> 'moedas')::integer, 7, 'troca 100 XP por 2 moedas');
select is((public.meu_progresso() ->> 'xp')::integer, 60, 'o XP trocado sai do total');
select is(public.meu_progresso() ->> 'patente', 'Cadete', 'a patente pode descer com a troca');
select is((select count(*) from public.moedas_eventos), 2::bigint, 'aluno lê os próprios eventos de moedas');
reset role;
update public.moedas_eventos set quantidade = quantidade + 10
where aluno_id = '1b000000-0000-0000-0000-0000000000a1' and motivo = 'boas-vindas';
select pg_temp.entrar('1b000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((public.comprar_peca('cabelo-rosa') ->> 'moedas')::integer, 2, 'compra desconta o preço');
select throws_ok($$ select public.comprar_peca('cabelo-rosa') $$, '22023', 'Você já tem esta peça.', 'não compra a mesma peça duas vezes');
select lives_ok($$ select public.salvar_avatar('{"cor-do-cabelo": "cabelo-rosa"}') $$, 'peça comprada entra no boneco');
select is((select count(*) from public.compras), 1::bigint, 'aluno lê as próprias compras');
select throws_ok($$ insert into public.compras (aluno_id, peca_id, preco) values ('1b000000-0000-0000-0000-0000000000a1', 'pele-estelar', 0) $$,
  '42501', null, 'aluno não grava compra direto na tabela');
select throws_ok($$ insert into public.moedas_eventos (aluno_id, quantidade, motivo, descricao) values ('1b000000-0000-0000-0000-0000000000a1', 99, 'professor', 'x') $$,
  '42501', null, 'aluno não grava moedas direto na tabela');
select throws_ok($$ select public.dar_moedas('1b000000-0000-0000-0000-0000000000a1', 5, 'eu mesmo') $$, '42501', null, 'aluno não dá moedas');
select throws_ok($$ select * from public.moedas_da_turma(1) $$, '42501', null, 'aluno não vê as moedas da turma');
reset role;

-- Outro aluno não vê as compras do primeiro.
select pg_temp.entrar('1b000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select is((select count(*) from public.compras where aluno_id = '1b000000-0000-0000-0000-0000000000a1'), 0::bigint, 'aluno não vê compras dos outros');
select throws_ok($$ select public.comprar_peca('cabelo-rosa') $$, '22023', null, 'pendente começa sem moedas');
reset role;

-- ---------------------------------------------------------------------------
-- Professor
-- ---------------------------------------------------------------------------
select pg_temp.entrar('1b000000-0000-0000-0000-00000000000f');
set local role authenticated;
select lives_ok($$ select public.salvar_avatar('{"acessorio-cabeca": "acessorio-chapeu-viking"}') $$, 'professor usa qualquer peça da loja');
select throws_ok($$ select public.dar_moedas('1b000000-0000-0000-0000-0000000000a1', 11, 'Participação') $$, '22023', null, 'professor dá no máximo 10');
select throws_ok($$ select public.dar_moedas('1b000000-0000-0000-0000-0000000000a1', -50, 'Engano') $$, '22023', null, 'não tira mais que o saldo');
select is(public.dar_moedas('1b000000-0000-0000-0000-0000000000a1', 10, 'Participação na aula'), 12, 'professor dá 10 moedas');
select is((select moedas from public.moedas_da_turma(pg_temp.oferta('1º INFO M', 'ALG')) where nome = 'Órion Loja'), 12, 'professor vê o saldo da turma');
select is((select count(*) from public.historico_da_loja(10)), 1::bigint, 'histórico mostra a compra');
select lives_ok($$ select public.definir_peca_da_loja('cabelo-rosa', 20, false) $$, 'professor muda o preço e tira da loja');
select throws_ok($$ select public.definir_peca_da_loja('cabelo-curto', 20, true) $$, 'P0002', null, 'peça grátis não vira peça da loja');
select lives_ok($$ select public.devolver_compra((select compra_id from public.historico_da_loja(1))) $$, 'professor devolve a compra');
reset role;
select is(pg_temp.saldo('1b000000-0000-0000-0000-0000000000a1'), 27, 'as moedas voltam com a devolução');
select is((select escolhas ->> 'cor-do-cabelo' from public.avatares where perfil_id = '1b000000-0000-0000-0000-0000000000a1'),
  'cabelo-castanho', 'a peça devolvida sai do boneco');

-- Peça fora da loja não se compra.
select pg_temp.entrar('1b000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select throws_ok($$ select public.comprar_peca('cabelo-rosa') $$, '22023', 'Esta peça não está à venda.', 'peça fora da loja não se compra');
reset role;

-- ---------------------------------------------------------------------------
-- Exercícios: aula completa (3) e unidade completa (5)
-- ---------------------------------------------------------------------------
create temp table ids (nome text primary key, valor bigint);
grant all on ids to authenticated;
insert into public.unidades (disciplina_id, numero, titulo)
select id, 19, 'Unidade de teste' from public.disciplinas where sigla = 'ALG';
insert into public.aulas (unidade_id, numero, titulo)
select u.id, 1, 'Aula de teste' from public.unidades u join public.disciplinas d on d.id = u.disciplina_id
where d.sigla = 'ALG' and u.numero = 19;
insert into ids select 'aula', a.id from public.aulas a where a.titulo = 'Aula de teste';
insert into public.exercicios (aula_id, titulo, enunciado) values
  ((select valor from ids where nome = 'aula'), 'Um', 'Primeiro.'),
  ((select valor from ids where nome = 'aula'), 'Dois', 'Segundo.');
insert into public.entregas (exercicio_id, aluno_id, codigo, testes_certos, testes_total, nota, tentativa, situacao)
select id, '1b000000-0000-0000-0000-0000000000a1', 'print(1)', 2, 2, 10, 1, 'a_confirmar'
from public.exercicios where aula_id = (select valor from ids where nome = 'aula');
select is(pg_temp.saldo('1b000000-0000-0000-0000-0000000000a1'), 27, 'entrega sem correção ainda não dá moedas');
update public.entregas set situacao = 'confirmada'
where exercicio_id = (select id from public.exercicios where titulo = 'Um' and aula_id = (select valor from ids where nome = 'aula'));
select is(pg_temp.saldo('1b000000-0000-0000-0000-0000000000a1'), 27, 'um exercício certo de dois não dá moedas');
update public.entregas set nota_professor = 10
where exercicio_id = (select id from public.exercicios where titulo = 'Dois' and aula_id = (select valor from ids where nome = 'aula'));
select is(pg_temp.saldo('1b000000-0000-0000-0000-0000000000a1'), 35, 'tudo certo dá 3 da aula e 5 da unidade');
update public.entregas set nota_professor = 10 where aluno_id = '1b000000-0000-0000-0000-0000000000a1';
select is(pg_temp.saldo('1b000000-0000-0000-0000-0000000000a1'), 35, 'prêmio de exercícios só uma vez');

-- ---------------------------------------------------------------------------
-- Prova: XP conforme a nota e 10 moedas pela nota máxima, ao publicar
-- ---------------------------------------------------------------------------
insert into public.exercicios (aula_id, titulo, enunciado) values (null, 'Questão da prova', 'Mostre 1.');
insert into public.provas (turma_disciplina_id, titulo, abre_em, fecha_em, duracao_min)
values (pg_temp.oferta('1º INFO M', 'ALG'), 'Prova da loja', now() - interval '2 hours', now() - interval '1 hour', 30);
insert into ids select 'prova', id from public.provas where titulo = 'Prova da loja';
insert into public.prova_questoes (prova_id, exercicio_id)
values ((select valor from ids where nome = 'prova'), (select id from public.exercicios where titulo = 'Questão da prova'));
insert into public.prova_tentativas (prova_id, aluno_id, comecou_em, termina_em, entregue_em, encerrada_por)
values ((select valor from ids where nome = 'prova'), '1b000000-0000-0000-0000-0000000000a1',
        now() - interval '2 hours', now() - interval '90 minutes', now() - interval '100 minutes', 'aluno');
insert into public.prova_respostas (tentativa_id, questao_id, codigo, testes_certos, testes_total, nota, situacao)
select t.id, q.id, 'print(1)', 1, 1, 10, 'confirmada'
from public.prova_tentativas t join public.prova_questoes q on q.prova_id = t.prova_id
where t.prova_id = (select valor from ids where nome = 'prova');

select pg_temp.entrar('1b000000-0000-0000-0000-00000000000f');
set local role authenticated;
select lives_ok($$ select public.publicar_notas((select valor from ids where nome = 'prova'), true) $$, 'professor publica as notas');
select lives_ok($$ select public.publicar_notas((select valor from ids where nome = 'prova'), true) $$, 'publicar de novo não dá erro');
reset role;
select is((select sum(quantidade) from public.xp_eventos where aluno_id = '1b000000-0000-0000-0000-0000000000a1' and motivo = 'prova'),
  50::bigint, 'nota 10 dá 50 XP, uma vez só');
select is(pg_temp.saldo('1b000000-0000-0000-0000-0000000000a1'), 45, 'nota máxima dá 10 moedas, uma vez só');

select * from finish();
rollback;
