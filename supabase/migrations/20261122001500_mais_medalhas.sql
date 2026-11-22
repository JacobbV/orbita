-- Mais tipos de medalhas: estudo, laboratório, Hangar e coleção (16 no total).
--
-- As medalhas de código contam só entregas que acertaram todos os testes
-- visíveis e ocultos e que o professor não marcou como "não confere".

insert into public.medalhas (codigo, nome, descricao, ordem) values
  ('explorador', 'Explorador', 'Abriu 10 aulas diferentes.', 5),
  ('incansavel', 'Incansável', 'Estudou em 10 dias seguidos.', 6),
  ('disciplina-completa', 'Missão Cumprida', 'Abriu todas as aulas de uma disciplina.', 7),
  ('estilista', 'Estilista Espacial', 'Montou o próprio boneco no Hangar.', 8),
  ('primeiro-codigo', 'Primeiro Código', 'Acertou todos os testes de um exercício.', 9),
  ('nota-dez', 'Nota Dez', 'Acertou de primeira 5 exercícios diferentes.', 10),
  ('cacador-de-bugs', 'Caçador de Bugs', 'Acertou um exercício depois de errar 3 vezes ou mais.', 11),
  ('mestre-dos-lacos', 'Mestre dos Laços', 'Resolveu 5 exercícios diferentes usando for ou while.', 12),
  ('programador-de-bordo', 'Programador de Bordo', 'Resolveu 10 exercícios diferentes.', 13),
  ('destaque-triplo', 'Coroa de Estrelas', 'Recebeu XP do professor por participação em 3 dias diferentes.', 14),
  ('estrela-em-ascensao', 'Estrela em Ascensão', 'Juntou 500 XP.', 15),
  ('colecionador', 'Colecionador', 'Ganhou 8 outras medalhas.', 16)
on conflict (codigo) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;

create or replace function privado.conferir_medalhas(p_aluno_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novas text[];
  v_colecao text[];
begin
  with
  -- Entregas que acertaram tudo e não foram recusadas na reconferência.
  certas as (
    select en.exercicio_id, en.tentativa, en.codigo
    from public.entregas en
    where en.aluno_id = p_aluno_id and en.testes_total > 0 and en.testes_certos = en.testes_total
      and en.situacao <> 'nao_confere'
  ),
  merecidas as (
    select 'primeira-aula' as codigo
    where exists (select 1 from public.xp_eventos where aluno_id = p_aluno_id and motivo = 'aula')
    union all
    select 'maratonista'
    where exists (select 1 from public.xp_eventos where aluno_id = p_aluno_id and motivo = 'sequencia')
    union all
    select 'destaque'
    where exists (select 1 from public.xp_eventos where aluno_id = p_aluno_id and motivo = 'professor')
    union all
    select 'unidade-completa'
    where exists (
      select 1
      from public.unidades u
      where exists (select 1 from public.aulas a where a.unidade_id = u.id)
        and not exists (
          select 1 from public.aulas a
          where a.unidade_id = u.id
            and not exists (
              select 1 from public.xp_eventos e
              where e.aluno_id = p_aluno_id and e.motivo = 'aula' and e.aula_id = a.id
            )
        )
    )
    union all
    select 'explorador'
    where (select count(distinct aula_id) from public.xp_eventos where aluno_id = p_aluno_id and motivo = 'aula') >= 10
    union all
    select 'incansavel'
    where exists (
      select 1 from public.xp_eventos
      where aluno_id = p_aluno_id and motivo = 'sequencia'
        and coalesce(substring(descricao from '^([0-9]+) dias'), '0')::integer >= 10
    )
    union all
    select 'disciplina-completa'
    where exists (
      select 1
      from public.disciplinas d
      where exists (select 1 from public.unidades u join public.aulas a on a.unidade_id = u.id where u.disciplina_id = d.id)
        and not exists (
          select 1 from public.unidades u
          join public.aulas a on a.unidade_id = u.id
          where u.disciplina_id = d.id
            and not exists (
              select 1 from public.xp_eventos e
              where e.aluno_id = p_aluno_id and e.motivo = 'aula' and e.aula_id = a.id
            )
        )
    )
    union all
    select 'estilista'
    where exists (select 1 from public.avatares where perfil_id = p_aluno_id)
    union all
    select 'primeiro-codigo'
    where exists (select 1 from certas)
    union all
    select 'nota-dez'
    where (select count(distinct exercicio_id) from certas where tentativa = 1) >= 5
    union all
    select 'cacador-de-bugs'
    where exists (select 1 from certas where tentativa >= 4)
    union all
    -- Laço em Python: for ou while como palavra (fora de comentários é o mais comum).
    select 'mestre-dos-lacos'
    where (select count(distinct exercicio_id) from certas where codigo ~ '\m(for|while)\M') >= 5
    union all
    select 'programador-de-bordo'
    where (select count(distinct exercicio_id) from certas) >= 10
    union all
    select 'destaque-triplo'
    where (
      select count(distinct (criado_em at time zone 'America/Fortaleza')::date)
      from public.xp_eventos where aluno_id = p_aluno_id and motivo = 'professor'
    ) >= 3
    union all
    select 'estrela-em-ascensao'
    where privado.xp_total(p_aluno_id) >= 500
  ),
  inseridas as (
    insert into public.medalhas_ganhas (aluno_id, medalha)
    select p_aluno_id, codigo from merecidas
    on conflict do nothing
    returning medalha
  )
  select coalesce(array_agg(medalha), '{}') into v_novas from inseridas;

  -- Colecionador: conta depois das outras, para valer na mesma hora.
  insert into public.medalhas_ganhas (aluno_id, medalha)
  select p_aluno_id, 'colecionador'
  where (select count(*) from public.medalhas_ganhas where aluno_id = p_aluno_id and medalha <> 'colecionador') >= 8
  on conflict do nothing
  returning array[medalha] into v_colecao;

  return v_novas || coalesce(v_colecao, '{}');
end;
$$;

revoke all on function privado.conferir_medalhas(uuid) from public;

create or replace function public.salvar_avatar(p_escolhas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil uuid := (select auth.uid());
  v_papel text;
  v_xp integer;
  v_camada text;
  v_peca text;
  v_ok boolean;
begin
  select papel into v_papel from public.perfis where id = v_perfil;
  if v_papel is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '42501';
  end if;
  if p_escolhas is null or jsonb_typeof(p_escolhas) <> 'object' then
    raise exception 'Avatar inválido.' using errcode = '22023';
  end if;
  v_xp := case when v_papel = 'professor' then 2147483647 else privado.xp_total(v_perfil) end;

  for v_camada, v_peca in select key, value #>> '{}' from jsonb_each(p_escolhas) loop
    select exists (
      select 1 from public.pecas
      where id = v_peca and camada = v_camada
        and (para = 'todos' or para = v_papel)
        and xp_minimo <= v_xp
    ) into v_ok;
    if not v_ok then
      raise exception 'Peça indisponível: %.', coalesce(v_peca, v_camada) using errcode = '22023';
    end if;
  end loop;

  insert into public.avatares (perfil_id, escolhas) values (v_perfil, p_escolhas)
  on conflict (perfil_id) do update set escolhas = excluded.escolhas, atualizado_em = now();
  -- Montar o boneco dá a medalha Estilista Espacial (só para aluno).
  if v_papel = 'aluno' then
    perform privado.conferir_medalhas(v_perfil);
  end if;
end;
$$;

revoke all on function public.salvar_avatar(jsonb) from public, anon;
grant execute on function public.salvar_avatar(jsonb) to authenticated;
