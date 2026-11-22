-- =============================================================================
-- Slides HTML das aulas no armazenamento privado
-- -----------------------------------------------------------------------------
-- * Bucket privado "materiais": só arquivos .html de até 10 MB.
-- * Caminho de cada arquivo: aulas/<id da aula>/<nome>.html. A linha em
--   public.materiais (tipo 'slide') aponta para esse caminho.
-- * O professor envia, troca e apaga. O aluno só baixa o arquivo de uma aula
--   liberada para a turma em que está aprovado: a mesma regra dos links
--   (privado.pode_ver_aula), conferida pelo banco em cada download.
-- * Uma aula tem no máximo um arquivo de slides; enviar outro substitui.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materiais', 'materiais', false, 10485760, array['text/html'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Pode baixar este arquivo? Professor sempre; aluno só se a aula do material
-- estiver liberada para a turma dele.
create or replace function privado.pode_ler_arquivo(p_caminho text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.eh_professor()
    or exists (
      select 1
      from public.materiais m
      where m.caminho_storage = p_caminho
        and privado.pode_ver_aula(m.aula_id)
    );
$$;

revoke all on function privado.pode_ler_arquivo(text) from public;
grant execute on function privado.pode_ler_arquivo(text) to authenticated;

create policy "materiais (arquivos): quem vê a aula baixa"
  on storage.objects for select to authenticated
  using (bucket_id = 'materiais' and privado.pode_ler_arquivo(name));

create policy "materiais (arquivos): professor envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'materiais' and (select privado.eh_professor()));

create policy "materiais (arquivos): professor substitui"
  on storage.objects for update to authenticated
  using (bucket_id = 'materiais' and (select privado.eh_professor()))
  with check (bucket_id = 'materiais' and (select privado.eh_professor()));

create policy "materiais (arquivos): professor apaga"
  on storage.objects for delete to authenticated
  using (bucket_id = 'materiais' and (select privado.eh_professor()));

-- Registra o arquivo já enviado como os slides da aula. Devolve o caminho do
-- arquivo anterior (ou null), para o site apagá-lo do armazenamento.
create or replace function public.definir_slides_da_aula(p_aula_id bigint, p_caminho text, p_titulo text default null)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_anterior text;
begin
  perform privado.exigir_professor();
  if p_caminho is null or p_caminho !~ ('^aulas/' || p_aula_id || '/[A-Za-z0-9._-]+\.html$') then
    raise exception 'Caminho de slides inválido.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.aulas where id = p_aula_id) then
    raise exception 'Aula não encontrada.' using errcode = 'P0002';
  end if;

  delete from public.materiais
  where aula_id = p_aula_id and tipo = 'slide'
  returning caminho_storage into v_anterior;

  insert into public.materiais (aula_id, tipo, titulo, caminho_storage, ordem)
  values (p_aula_id, 'slide', coalesce(nullif(trim(p_titulo), ''), 'Slides da aula'), p_caminho, 0);

  return nullif(v_anterior, p_caminho);
end;
$$;

-- Tira os slides da aula. Devolve o caminho do arquivo para o site apagá-lo.
create or replace function public.remover_slides_da_aula(p_aula_id bigint)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caminho text;
begin
  perform privado.exigir_professor();
  delete from public.materiais
  where aula_id = p_aula_id and tipo = 'slide'
  returning caminho_storage into v_caminho;
  return v_caminho;
end;
$$;

revoke all on function public.definir_slides_da_aula(bigint, text, text) from public, anon;
revoke all on function public.remover_slides_da_aula(bigint) from public, anon;
grant execute on function public.definir_slides_da_aula(bigint, text, text) to authenticated;
grant execute on function public.remover_slides_da_aula(bigint) to authenticated;
