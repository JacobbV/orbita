-- =============================================================================
-- Permissões para o serviço de login (Supabase Auth)
-- -----------------------------------------------------------------------------
-- O cadastro de verdade é feito pelo serviço de login, que entra no banco com o
-- papel "supabase_auth_admin". Os gatilhos em auth.users rodavam com esse papel,
-- que não podia usar o esquema "privado", e o cadastro falhava com erro 500.
-- Correção:
-- * o gatilho que confere o e-mail passa a rodar com as permissões do dono
--   (security definer), como os outros gatilhos do cadastro;
-- * o serviço de login ganha só o uso do esquema e a execução da regra do e-mail.
-- =============================================================================

grant usage on schema privado to supabase_auth_admin;
grant execute on function privado.email_academico_valido(text) to supabase_auth_admin;

create or replace function privado.barrar_email_nao_academico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.email_academico_valido(new.email) then
    raise exception 'Use o seu e-mail @academico.ifpb.edu.br.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function privado.barrar_email_nao_academico() from public, anon, authenticated;
