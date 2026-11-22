-- Testes dos apelidos sorteados. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

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

select pg_temp.criar_conta('fa000000-0000-0000-0000-00000000000f', 'docente.apelido@academico.ifpb.edu.br', '{"nome": "Prof. Fictício Apelido"}');
update public.perfis set papel = 'professor' where id = 'fa000000-0000-0000-0000-00000000000f';
select pg_temp.criar_conta('fa000000-0000-0000-0000-0000000000a1', 'lyra.apelido@academico.ifpb.edu.br', '{"nome": "Lyra Apelido"}');
select pg_temp.criar_conta('fa000000-0000-0000-0000-0000000000a2', 'draco.apelido@academico.ifpb.edu.br', '{"nome": "Draco Apelido"}');

-- Listas grandes
select ok((select count(*) from privado.apelido_nomes) >= 250, 'lista de nomes com pelo menos 250 palavras');
select ok((select count(*) from privado.apelido_adjetivos) >= 150, 'lista de adjetivos com pelo menos 150 palavras');
select ok((select count(*) from privado.apelidos_possiveis) >= 40000, 'mais de 40 mil combinações');
select is((select count(*) from (select lower(apelido) from privado.apelidos_possiveis group by 1 having count(*) > 1) d),
  0::bigint, 'nenhuma combinação repetida');
select ok(exists (select 1 from privado.apelidos_possiveis where apelido = 'Estrela Veloz'), 'concordância: "Estrela Veloz"');
select ok(exists (select 1 from privado.apelidos_possiveis where apelido = 'Cometa Curioso'), 'concordância: "Cometa Curioso"');
select ok(not exists (select 1 from privado.apelidos_possiveis where apelido = 'Estrela Curioso'), 'sem erro de concordância');

-- Aluno sorteia e escolhe
select pg_temp.entrar('fa000000-0000-0000-0000-0000000000a1');
set local role authenticated;
create temp table sorteado as select public.sortear_apelido() as apelido;
select is(public.escolher_apelido('Cometa Curioso'), 'Cometa Curioso', 'aluno escolhe um apelido sorteado');
select is((select apelido from public.perfis where id = 'fa000000-0000-0000-0000-0000000000a1'), 'Cometa Curioso', 'apelido gravado no perfil');
select throws_ok($$ select public.escolher_apelido('Rei do Bairro') $$, '23514', null, 'apelido fora da lista é recusado');
select throws_ok($$ update public.perfis set apelido = 'Estrela Veloz' where id = 'fa000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'ninguém muda o apelido por update direto');
reset role;
select ok((select apelido from sorteado) in (select apelido from privado.apelidos_possiveis), 'sorteio devolve combinação da lista');

select pg_temp.entrar('fa000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select throws_ok($$ select public.escolher_apelido('Cometa Curioso') $$, '23505', null, 'apelido já usado não repete');
select isnt(public.sortear_apelido('Cometa Curioso'), 'Cometa Curioso', 'sorteio não devolve apelido em uso');
select throws_ok($$ select public.apagar_apelido('fa000000-0000-0000-0000-0000000000a1') $$, '42501', null,
  'aluno não apaga apelido de outro');
reset role;

-- Professor troca e apaga
select pg_temp.entrar('fa000000-0000-0000-0000-00000000000f');
set local role authenticated;
select isnt(public.sortear_apelido_do_aluno('fa000000-0000-0000-0000-0000000000a1'), 'Cometa Curioso', 'professor sorteia outro apelido para o aluno');
select lives_ok($$ select public.apagar_apelido('fa000000-0000-0000-0000-0000000000a1') $$, 'professor apaga o apelido');
select is((select apelido from public.perfis where id = 'fa000000-0000-0000-0000-0000000000a1'), null, 'apelido apagado');
reset role;

set local role anon;
select throws_ok($$ select public.sortear_apelido() $$, '42501', null, 'quem não entrou não sorteia');
reset role;

select * from finish();
rollback;
