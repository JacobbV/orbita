-- Testes do boneco do Modo Ninja. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('fb000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'docente.ninja@academico.ifpb.edu.br', '{"nome": "Prof. Fictício Ninja"}', now(), now()),
  ('fb000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'orion.ninja@academico.ifpb.edu.br', '{"nome": "Orion Ninja"}', now(), now());
update public.perfis set papel = 'professor' where id = 'fb000000-0000-0000-0000-00000000000f';

create function pg_temp.entrar(p_id text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.entrar(text) to authenticated;

select is((select count(*) from public.pecas where para = 'ninja'), 5::bigint, 'cinco peças do ninja');

select pg_temp.entrar('fb000000-0000-0000-0000-00000000000f');
set local role authenticated;
select lives_ok($$ select public.salvar_avatar('{"rosto": "rosto-barba"}') $$, 'professor salva o boneco normal');
select lives_ok($$ select public.salvar_avatar_ninja('{"rosto": "rosto-ninja-mascara", "cabelo": "cabelo-arrepiado",
  "roupa": "roupa-traje-ninja", "acessorio-cabeca": "acessorio-capacete"}') $$, 'ninja usa peças ninja e qualquer outra');
select is((select escolhas from public.avatares where perfil_id = 'fb000000-0000-0000-0000-00000000000f'),
  '{"rosto": "rosto-barba"}'::jsonb, 'boneco normal fica como estava');
reset role;

select pg_temp.entrar('fb000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select throws_ok($$ select public.salvar_avatar_ninja('{"rosto": "rosto-ninja-mascara"}') $$, '42501', null, 'aluno não tem Modo Ninja');
select throws_ok($$ select public.salvar_avatar('{"rosto": "rosto-ninja-mascara"}') $$, '22023', null, 'aluno não usa peça do ninja');
reset role;

select * from finish();
rollback;
