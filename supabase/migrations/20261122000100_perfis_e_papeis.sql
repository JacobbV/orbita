-- =============================================================================
-- Perfis, papéis e a regra do e-mail acadêmico
-- -----------------------------------------------------------------------------
-- * Toda conta nova ganha um perfil com papel 'aluno'.
-- * O papel 'professor' só pode ser dado por SQL (painel do Supabase), nunca
--   pelo formulário nem pelo domínio do e-mail.
-- * O servidor recusa qualquer e-mail que não termine em @academico.ifpb.edu.br,
--   mesmo que alguém pule a validação do site.
-- =============================================================================

-- Funções internas ficam num esquema que a API do Supabase não expõe.
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Regra do e-mail (mesma lógica de web/src/lib/email.ts)
-- -----------------------------------------------------------------------------
create or replace function privado.email_academico_valido(p_email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    lower(trim(p_email)) ~ '^[a-z0-9_%+-]+(\.[a-z0-9_%+-]+)*@academico\.ifpb\.edu\.br$',
    false
  );
$$;

comment on function privado.email_academico_valido(text) is
  'true só para e-mails que terminam em @academico.ifpb.edu.br, sem ponto nas pontas da parte antes do @.';

-- -----------------------------------------------------------------------------
-- Tabela de perfis: o mínimo de dados (nome, e-mail acadêmico, papel)
-- -----------------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 2 and 120),
  email text not null unique check (privado.email_academico_valido(email)),
  papel text not null default 'aluno' check (papel in ('aluno', 'professor')),
  criado_em timestamptz not null default now()
);

comment on table public.perfis is
  'Um perfil por conta. Guarda só nome, e-mail acadêmico e papel (LGPD: dados de menores, nada de foto).';

alter table public.perfis enable row level security;

-- -----------------------------------------------------------------------------
-- Quem é professor? (usada pelas políticas de todas as tabelas)
-- security definer: lê perfis sem cair na própria política (evita recursão).
-- -----------------------------------------------------------------------------
create or replace function privado.eh_professor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'professor'
  );
$$;

revoke all on function privado.eh_professor() from public;
grant execute on function privado.eh_professor() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Permissões e políticas de perfis
-- -----------------------------------------------------------------------------
revoke all on public.perfis from anon, authenticated;
grant select on public.perfis to authenticated;
-- O aluno só pode mudar o próprio nome. Papel e e-mail ficam travados.
grant update (nome) on public.perfis to authenticated;

create policy "perfis: cada um lê o seu"
  on public.perfis for select to authenticated
  using (id = (select auth.uid()));

create policy "perfis: professor lê todos"
  on public.perfis for select to authenticated
  using ((select privado.eh_professor()));

create policy "perfis: cada um edita o próprio nome"
  on public.perfis for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Barreira no cadastro: e-mail fora do domínio não cria conta
-- (vale também para troca de e-mail depois do cadastro)
-- -----------------------------------------------------------------------------
create or replace function privado.barrar_email_nao_academico()
returns trigger
language plpgsql
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

create trigger barrar_email_nao_academico
  before insert or update of email on auth.users
  for each row execute function privado.barrar_email_nao_academico();

-- -----------------------------------------------------------------------------
-- Ao criar a conta: cria o perfil (sempre como aluno)
-- O pedido de matrícula feito no cadastro é tratado na migration de matrículas.
-- -----------------------------------------------------------------------------
create or replace function privado.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := nullif(trim(new.raw_user_meta_data ->> 'nome'), '');
begin
  insert into public.perfis (id, nome, email, papel)
  values (
    new.id,
    -- Conta criada pelo painel pode vir sem nome: usa a parte antes do @.
    coalesce(left(v_nome, 120), split_part(new.email, '@', 1)),
    lower(trim(new.email)),
    'aluno' -- nunca vem do formulário
  );
  return new;
end;
$$;

-- O Postgres roda os gatilhos em ordem alfabética do nome. O prefixo "a1_" garante
-- que o perfil nasce antes do pedido de matrícula (gatilho "a2_", em outra migration).
create trigger a1_criar_perfil
  after insert on auth.users
  for each row execute function privado.criar_perfil();

-- Mantém o e-mail do perfil igual ao da conta.
create or replace function privado.sincronizar_email_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfis set email = lower(trim(new.email)) where id = new.id;
  return new;
end;
$$;

create trigger sincronizar_email_perfil
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function privado.sincronizar_email_perfil();
