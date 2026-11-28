-- =============================================================================
-- Escola virtual ao vivo: canal privado "escola" do Realtime
-- -----------------------------------------------------------------------------
-- Os alunos veem os colegas andando no mapa. O navegador manda a posição por
-- Broadcast no canal privado "escola"; só quem está logado pode ouvir e falar
-- nele. Nada é gravado no banco, e a mensagem leva só o apelido, as cores do
-- boneco e a posição (nunca nome ou e-mail).
-- =============================================================================

create policy "escola: logados ouvem" on realtime.messages
  for select to authenticated
  using ((select realtime.topic()) = 'escola');

create policy "escola: logados falam" on realtime.messages
  for insert to authenticated
  with check ((select realtime.topic()) = 'escola');
