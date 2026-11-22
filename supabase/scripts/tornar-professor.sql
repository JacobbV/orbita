-- =============================================================================
-- Dar o papel de professor a uma conta (rodar UMA vez, no SQL Editor do Supabase)
-- -----------------------------------------------------------------------------
-- Passo a passo:
-- 1. No painel do Supabase: Authentication > Users > Add user > Create new user.
--    Use o seu e-mail @academico.ifpb.edu.br, uma senha forte e marque
--    "Auto Confirm User".
-- 2. Abra SQL Editor > New query, cole este arquivo, troque o e-mail abaixo
--    pelo seu e clique em Run.
-- 3. O resultado deve mostrar uma linha com papel = professor.
--
-- O papel de professor nunca vem do formulário do site nem do domínio do e-mail:
-- só este comando, rodado por quem tem acesso ao painel, dá esse papel.
-- =============================================================================

update public.perfis
set papel = 'professor'
where email = lower(trim('SEU-EMAIL@academico.ifpb.edu.br'));

-- Se a conta tiver algum pedido de acesso de aluno, ele deixa de fazer sentido.
delete from public.matriculas
where aluno_id = (select id from public.perfis where email = lower(trim('SEU-EMAIL@academico.ifpb.edu.br')));

select id, nome, email, papel from public.perfis where papel = 'professor';
