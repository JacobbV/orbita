-- O professor da nave, para os alunos: nome e boneco.
--
-- O aluno não lê os perfis dos outros (RLS). Esta função mostra só o nome e o
-- boneco do professor, e só para quem está aprovado em alguma turma (ou para o
-- próprio professor). Nenhum dado de aluno passa por aqui.
create or replace function public.professor_da_nave()
returns table (nome text, escolhas jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    (select privado.eh_professor())
    or exists (select 1 from public.matriculas where aluno_id = (select auth.uid()) and status = 'aprovado')
  ) then
    return;
  end if;
  return query
    select p.nome, a.escolhas
    from public.perfis p
    left join public.avatares a on a.perfil_id = p.id
    where p.papel = 'professor'
    order by p.criado_em
    limit 1;
end;
$$;

revoke all on function public.professor_da_nave() from public, anon;
grant execute on function public.professor_da_nave() to authenticated;
