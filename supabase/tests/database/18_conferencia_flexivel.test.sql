-- Conferência flexível da saída: as funções do banco dão o mesmo resultado do
-- site (web/src/lab/correcao.test.ts usa os mesmos casos). Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

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
grant execute on function pg_temp.aula(text, int, int), pg_temp.entrar(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Funções da conferência (mesmos casos do site)
-- ---------------------------------------------------------------------------
select is(privado.fichas($$Lista de nomes: ['Ána', "BIA"]$$), array['lista', 'de', 'nomes', 'ana', 'bia'],
  'fichas: sem maiúsculas, acentos, aspas, colchetes e dois-pontos');
select is(privado.fichas('12.0 2.50 -3 x1 [1, 2]'), array['12', '2.5', '-3', 'x', '1', '1', '2'],
  'fichas: 12.0 vale 12 e 2.50 vale 2.5');
select is(privado.fichas(E'João, ÇÉU e café'), array['joao', 'ceu', 'e', 'cafe'], 'fichas: acentos compostos também saem');
select is(privado.forma_conferida($$Lista de nomes: ['Ana', 'Bia']$$, E'Ana\nBia', '', 'valores'), 'ana bia',
  'valores: só os nomes que vieram da entrada');
select is(privado.forma_conferida('Resultado: 12.0', E'7\n5', '', 'valores'), '12', 'valores: o texto em volta do número não conta');
select is(privado.forma_conferida('Nota 7: APROVADO!', '7', 'aprovado, par', 'valores'), '7 aprovado',
  'valores: palavras marcadas pelo professor contam');
select is(privado.forma_conferida('Olá, Mundo!', '', '', 'texto'), 'ola mundo', 'texto: todas as palavras, sem pontuação');
select is(privado.forma_conferida(E'Soma: 3  \r\n\n', '', '', 'exato'), 'Soma: 3', 'exato: como antes');
select is(privado.modo_do_teste('Olá, mundo!', '', 'valores', ''), 'texto',
  'valores sem nenhum valor na saída esperada vira texto flexível');
select is(privado.modo_do_teste('Soma: 7', E'3\n4', 'valores', ''), 'valores', 'valores com número continua valores');
select is(privado.impressao_conferida($$Lista de nomes: ['Ana', 'Bia']$$, E'Ana\nBia', 'valores', ''),
  '531f8d402b3cb81e5746cd84976640f5334e2477760cf7e023eec49596b2eb11', 'impressão digital = SHA-256 de "ana bia", igual à do site');
select is(privado.impressao_conferida('Soma: 7', E'3\n4', 'valores', ''), encode(sha256('7'), 'hex'),
  'impressão digital do valor 7');

-- ---------------------------------------------------------------------------
-- Exercícios: padrão "valores", professor escolhe, aluno recebe o modo
-- ---------------------------------------------------------------------------
select pg_temp.criar_conta('fb000000-0000-0000-0000-00000000000f', 'docente.conferencia@academico.ifpb.edu.br');
update public.perfis set papel = 'professor' where id = 'fb000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('fb000000-0000-0000-0000-0000000000a1', 'vega.conferencia@academico.ifpb.edu.br',
  jsonb_build_object('nome', 'Vega Conferência', 'turma_disciplina_id', pg_temp.oferta('1º INFO M', 'ALG')::text,
    'quem_e_voce', 'Vega Conferência, 1º INFO M, manhã'));
update public.matriculas set status = 'aprovado' where aluno_id = 'fb000000-0000-0000-0000-0000000000a1';
delete from public.liberacoes where turma_disciplina_id = pg_temp.oferta('1º INFO M', 'ALG');
insert into public.liberacoes (turma_disciplina_id, aula_id) values (pg_temp.oferta('1º INFO M', 'ALG'), pg_temp.aula('ALG', 4, 1));

create temp table ids (nome text primary key, id bigint);
grant all on ids to authenticated;

select pg_temp.entrar('fb000000-0000-0000-0000-00000000000f');
set local role authenticated;

insert into ids select 'nomes', public.salvar_exercicio(null, pg_temp.aula('ALG', 4, 1), 'Lista de nomes', 'Leia dois nomes e mostre a lista.', 1, '',
  $j$[{"tipo": "visivel", "entrada": "Ana\nBia", "saida_esperada": "Lista de nomes: ['Ana', 'Bia']"},
      {"tipo": "oculto", "entrada": "Caio\nDara", "saida_esperada": "Lista de nomes: ['Caio', 'Dara']"}]$j$);
select is((select conferencia from public.exercicios where id = (select id from ids where nome = 'nomes')), 'valores',
  'exercício novo começa em "só os valores"');

insert into ids select 'nota', public.salvar_exercicio(null, pg_temp.aula('ALG', 4, 1), 'Aprovado ou não', 'Leia a nota.', 1, '',
  '[{"tipo": "oculto", "entrada": "7", "saida_esperada": "7 aprovado"}]', 'python', 'valores', '  aprovado reprovado  ');
select is((select palavras_extras from public.exercicios where id = (select id from ids where nome = 'nota')), 'aprovado reprovado',
  'guarda as palavras extras sem espaços nas pontas');

select lives_ok($$ select public.salvar_exercicio((select id from ids where nome = 'nota'), pg_temp.aula('ALG', 4, 1), 'Aprovado ou não', 'Leia a nota.', 1, '',
  '[{"tipo": "oculto", "entrada": "7", "saida_esperada": "7 aprovado"}]') $$, 'editar sem mandar o modo (site antigo) funciona');
select is((select conferencia || '|' || palavras_extras from public.exercicios where id = (select id from ids where nome = 'nota')),
  'valores|aprovado reprovado', 'editar sem mandar o modo mantém o modo e as palavras');

select lives_ok($$ select public.salvar_exercicio((select id from ids where nome = 'nota'), pg_temp.aula('ALG', 4, 1), 'Aprovado ou não', 'Leia a nota.', 1, '',
  '[{"tipo": "oculto", "entrada": "7", "saida_esperada": "7 aprovado"}]', 'python', 'exato') $$, 'professor troca para texto exato');
select is((select conferencia from public.exercicios where id = (select id from ids where nome = 'nota')), 'exato', 'modo trocado');

select throws_ok($$ select public.salvar_exercicio(null, pg_temp.aula('ALG', 4, 1), 'x', 'y', 1, '',
  '[{"tipo": "visivel", "entrada": "", "saida_esperada": "1"}]', 'python', 'quase') $$,
  '22023', 'Escolha como conferir a saída: só os valores, texto flexível ou texto exato.', 'recusa modo desconhecido');
select throws_ok($$ select public.salvar_exercicio(null, pg_temp.aula('ALG', 4, 1), 'x', 'y', 1, '',
  '[{"tipo": "visivel", "entrada": "", "saida_esperada": "1"}]', 'python', 'valores', repeat('a', 501)) $$,
  '22023', 'Use até 500 letras nas palavras que também contam.', 'recusa palavras extras grandes demais');
reset role;

select pg_temp.entrar('fb000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((select saida_hash from public.testes_do_exercicio((select id from ids where nome = 'nomes')) where tipo = 'oculto'),
  encode(sha256('caio dara'), 'hex'), 'oculto chega ao aluno com a impressão digital do que é conferido');
select is((select conferencia || '|' || palavras from public.testes_do_exercicio((select id from ids where nome = 'nomes')) where tipo = 'oculto'),
  'valores|', 'oculto chega com o modo e as palavras extras');
select is((select saida_esperada from public.testes_do_exercicio((select id from ids where nome = 'nomes')) where tipo = 'oculto'),
  null, 'oculto continua sem a resposta');
select is((select saida_hash from public.testes_do_exercicio((select id from ids where nome = 'nota'))),
  encode(sha256('7 aprovado'), 'hex'), 'no modo exato, a impressão digital é a de antes');
reset role;

select * from finish();
rollback;
