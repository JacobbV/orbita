-- Testes do catálogo de peças do avatar (primeiro lote). Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is((select count(*) from public.pecas where id not like 'teste-%' and para <> 'ninja'), 46::bigint, 'catálogo com as 46 peças do primeiro lote');
select is((select count(*) from public.pecas where para = 'professor'), 7::bigint, 'sete peças só do professor');

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a8000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'vega.pecas@academico.ifpb.edu.br', '{}', now(), now());
select set_config('request.jwt.claims', '{"sub": "a8000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.salvar_avatar('{"corpo": "corpo-medio", "pele": "pele-3", "rosto": "rosto-sorridente",
  "cabelo": "cabelo-curto", "cor-do-cabelo": "cabelo-castanho", "roupa": "roupa-uniforme"}') $$,
  'aluno novo salva o boneco padrão');
select throws_ok($$ select public.salvar_avatar('{"roupa": "roupa-cardiga"}') $$, '22023', null,
  'aluno não usa a roupa do professor');
reset role;

select * from finish();
rollback;
