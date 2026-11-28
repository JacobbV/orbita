-- Progresso das medalhas de contagem. Nomes inventados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

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

select pg_temp.criar_conta('fb000000-0000-0000-0000-0000000000a1', 'rita.medalha@academico.ifpb.edu.br', '{"nome": "Rita Medalha"}');
select pg_temp.criar_conta('fb000000-0000-0000-0000-0000000000a2', 'caio.medalha@academico.ifpb.edu.br', '{"nome": "Caio Medalha"}');

insert into public.exercicios (aula_id, titulo, enunciado, linguagem)
select null, 'Python ' || n, 'x', 'python' from generate_series(1, 4) n;

-- Rita acertou tudo de 2 exercícios em Python (um deles com laço), na primeira tentativa.
insert into public.entregas (exercicio_id, aluno_id, codigo, testes_certos, testes_total, nota, tentativa, situacao)
select e.id, 'fb000000-0000-0000-0000-0000000000a1', case when e.titulo = 'Python 1' then 'for i in range(3): print(i)' else 'print(1)' end,
  1, 1, 10, 1, 'confirmada'
from public.exercicios e where e.titulo in ('Python 1', 'Python 2');
-- Caio errou: não conta.
insert into public.entregas (exercicio_id, aluno_id, codigo, testes_certos, testes_total, nota, tentativa, situacao)
select e.id, 'fb000000-0000-0000-0000-0000000000a2', 'x', 0, 1, 0, 1, 'nao_confere'
from public.exercicios e where e.titulo = 'Python 1';

select pg_temp.entrar('fb000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((select atual from public.progresso_das_medalhas() where medalha = 'cobra-criada'), 2, 'cobra-criada: 2 exercícios em Python');
select is((select meta from public.progresso_das_medalhas() where medalha = 'cobra-criada'), 15, 'cobra-criada: meta 15');
select is((select atual from public.progresso_das_medalhas() where medalha = 'cobrinha'), 2, 'cobrinha: 2 de 3');
select is((select atual from public.progresso_das_medalhas() where medalha = 'mestre-dos-lacos'), 1, 'um exercício com laço');
reset role;

select pg_temp.entrar('fb000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select is((select atual from public.progresso_das_medalhas() where medalha = 'cobra-criada'), 0, 'entrega que não confere não conta');
select is((select count(*) from public.progresso_das_medalhas()), 11::bigint, 'onze medalhas de contagem');
reset role;

select * from finish();
rollback;
