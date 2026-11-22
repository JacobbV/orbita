-- XP já ganho fica com o aluno quando a aula ou o exercício são removidos.
-- As chaves estrangeiras de xp_eventos usam "on delete set null", mas as
-- regras "motivo aula exige aula_id" e "motivo exercicio exige exercicio_id"
-- barravam a remoção de uma aula que algum aluno já tinha aberto.
-- A exigência passa a valer só para o evento novo (na inserção).

do $$
declare
  v_nome text;
begin
  for v_nome in
    select conname from pg_constraint
    where conrelid = 'public.xp_eventos'::regclass
      and contype = 'c'
      and (pg_get_constraintdef(oid) like '%''aula''::text) OR (aula_id IS NOT NULL)%'
        or pg_get_constraintdef(oid) like '%''exercicio''::text) OR (exercicio_id IS NOT NULL)%')
  loop
    execute format('alter table public.xp_eventos drop constraint %I', v_nome);
  end loop;
end;
$$;

create or replace function privado.xp_evento_com_origem()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.motivo = 'aula' and new.aula_id is null then
    raise exception 'XP de aula precisa da aula.' using errcode = '23514';
  end if;
  if new.motivo = 'exercicio' and new.exercicio_id is null then
    raise exception 'XP de exercício precisa do exercício.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger xp_evento_com_origem
before insert on public.xp_eventos
for each row execute function privado.xp_evento_com_origem();
