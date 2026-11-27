-- Testes do Hangar novo: grupos novos, bonecos antigos migrados e cor livre. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select is((select camada from public.pecas where id = 'acessorio-bone'), 'acessorio-cabeca', 'boné foi para acessórios de cabeça');
select is((select camada from public.pecas where id = 'acessorio-oculos-redondos'), 'acessorio-rosto', 'óculos foram para acessórios de rosto');
select is((select camada from public.pecas where id = 'acessorio-caneca'), 'acessorio-corpo', 'caneca foi para acessórios de corpo');
select is((select count(*) from public.pecas where camada = 'acessorio'), 0::bigint, 'não sobrou peça no grupo antigo');
select is((select para from public.pecas where id = 'roupa-farda-if'), 'todos', 'farda do IF serve para todos');

-- Conversão dos bonecos antigos
select is(privado.migrar_escolhas_hangar_novo('{"corpo": "corpo-largo", "roupa": "roupa-uniforme", "acessorio": "acessorio-bone"}'),
  '{"base": "base-masculina", "altura": "altura-media", "parte-de-baixo": "baixo-calca-marinho", "pes": "pes-tenis-branco",
    "corpo": "corpo-largo", "roupa": "roupa-uniforme", "acessorio-cabeca": "acessorio-bone"}'::jsonb,
  'boneco antigo ganha base, altura, calça e tênis de antes, e o acessório vai para o grupo certo');
select is(privado.migrar_escolhas_hangar_novo('{"base": "base-feminina", "pes": "pes-bota"}'),
  '{"base": "base-feminina", "altura": "altura-media", "parte-de-baixo": "baixo-calca-marinho", "pes": "pes-bota"}'::jsonb,
  'o que já foi escolhido não é trocado');
select is(privado.migrar_escolhas_hangar_novo(null), null, 'boneco ninja vazio continua vazio');

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a1700000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'lyra.hangar@academico.ifpb.edu.br', '{}', now(), now());
select set_config('request.jwt.claims', '{"sub": "a1700000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.salvar_avatar('{"base": "base-feminina", "altura": "altura-alta", "corpo": "corpo-gordinho",
  "pele": "pele-10", "rosto": "rosto-cilios", "cabelo": "cabelo-moicano", "cor-do-cabelo": "cabelo-cor-livre",
  "cor-livre": "#22aa88", "roupa": "roupa-farda-if", "parte-de-baixo": "baixo-jeans-preta", "pes": "pes-tenis-branco",
  "acessorio-rosto": "acessorio-oculos-quadrados", "acessorio-corpo": "acessorio-mochila"}') $$,
  'aluno novo salva um boneco com as peças novas e cor livre');
select throws_ok($$ select public.salvar_avatar('{"cor-livre": "vermelho"}') $$, '22023', 'Cor inválida.', 'cor livre só no formato #rrggbb');
select throws_ok($$ select public.salvar_avatar('{"cor-livre": "#22AA88\"; drop"}') $$, '22023', 'Cor inválida.', 'cor livre não aceita texto');
select throws_ok($$ select public.salvar_avatar('{"acessorio": "acessorio-bone"}') $$, '22023', null, 'o grupo antigo de acessório não existe mais');
select throws_ok($$ select public.salvar_avatar('{"acessorio-cabeca": "acessorio-chapeu-viking"}') $$, '22023', null, 'chapéu viking precisa de XP');
select throws_ok($$ select public.salvar_avatar('{"acessorio-cabeca": "acessorio-mochila"}') $$, '22023', null, 'peça no grupo errado');
reset role;

select * from finish();
rollback;
