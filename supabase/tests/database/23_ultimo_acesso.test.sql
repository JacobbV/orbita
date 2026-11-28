-- Último acesso: só aluno registra, só professor lê. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create function pg_temp.criar_conta(p_id uuid, p_email text, p_meta jsonb default '{}')
returns void language sql as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, p_meta, now(), now());
$$;

create function pg_temp.entrar(p_id text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.entrar(text) to authenticated;

select pg_temp.criar_conta('fa000000-0000-0000-0000-00000000000f', 'docente.acesso@academico.ifpb.edu.br', '{"nome": "Prof. Fictício Acesso"}');
update public.perfis set papel = 'professor' where id = 'fa000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('fa000000-0000-0000-0000-0000000000a1', 'nina.acesso@academico.ifpb.edu.br', '{"nome": "Nina Acesso"}');
select pg_temp.criar_conta('fa000000-0000-0000-0000-0000000000a2', 'otto.acesso@academico.ifpb.edu.br', '{"nome": "Otto Acesso"}');

-- Aluno registra o próprio acesso.
select pg_temp.entrar('fa000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select lives_ok('select public.registrar_acesso()', 'aluno registra o acesso');
select is((select count(*) from public.acessos), 0::bigint, 'aluno não enxerga a tabela de acessos, nem a própria linha');
reset role;
select is((select count(*) from public.acessos where perfil_id = 'fa000000-0000-0000-0000-0000000000a1'), 1::bigint, 'o acesso ficou guardado');

-- Registrar de novo logo em seguida não mexe na hora (menos de 1 minuto).
update public.acessos set ultimo_acesso = now() - interval '30 seconds' where perfil_id = 'fa000000-0000-0000-0000-0000000000a1';
select pg_temp.entrar('fa000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select public.registrar_acesso();
reset role;
select ok((select ultimo_acesso < now() - interval '20 seconds' from public.acessos where perfil_id = 'fa000000-0000-0000-0000-0000000000a1'),
  'dentro de 1 minuto não regrava');

update public.acessos set ultimo_acesso = now() - interval '10 minutes' where perfil_id = 'fa000000-0000-0000-0000-0000000000a1';
select pg_temp.entrar('fa000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select public.registrar_acesso();
reset role;
select ok((select ultimo_acesso > now() - interval '1 minute' from public.acessos where perfil_id = 'fa000000-0000-0000-0000-0000000000a1'),
  'depois de 1 minuto atualiza');

-- O professor não entra na lista.
select pg_temp.entrar('fa000000-0000-0000-0000-00000000000f');
set local role authenticated;
select public.registrar_acesso();
select is((select count(*) from public.acessos), 1::bigint, 'professor lê todos os acessos');
reset role;
select is((select count(*) from public.acessos where perfil_id = 'fa000000-0000-0000-0000-00000000000f'), 0::bigint, 'professor não é registrado');

-- Aluno não escreve direto na tabela.
select pg_temp.entrar('fa000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select throws_ok(
  $$insert into public.acessos (perfil_id) values ('fa000000-0000-0000-0000-0000000000a2')$$,
  '42501', null, 'ninguém grava direto na tabela');
reset role;

select * from finish();
rollback;
