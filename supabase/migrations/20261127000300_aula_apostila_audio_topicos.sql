-- =============================================================================
-- Tela da aula: tópicos "Nesta aula", apostila em HTML e áudio da aula
-- -----------------------------------------------------------------------------
-- * aulas.topicos: de 0 a 5 tópicos curtos, escritos pelo professor.
-- * materiais passa a aceitar o tipo 'apostila' (arquivo .html, como os slides)
--   e o tipo 'audio' (arquivo .mp3). Ficam no mesmo bucket privado e valem as
--   mesmas regras de leitura dos slides.
-- * Uma aula tem no máximo uma apostila e um áudio; enviar outro substitui.
-- * Ouvir o áudio até o fim dá 10 XP, uma vez por aula (motivo 'audio').
-- =============================================================================

alter table public.aulas
  add column topicos text[] not null default '{}'
    check (cardinality(topicos) <= 5 and array_position(topicos, null) is null);

comment on column public.aulas.topicos is 'Tópicos do cartão "Nesta aula" (até 5), escritos pelo professor.';

alter table public.materiais drop constraint if exists materiais_tipo_check;
alter table public.materiais
  add constraint materiais_tipo_check check (tipo in ('link', 'slide', 'apostila', 'pdf', 'audio', 'video'));

update storage.buckets
set allowed_mime_types = array['text/html', 'audio/mpeg']
where id = 'materiais';

-- ---------------------------------------------------------------------------
-- Tópicos
-- ---------------------------------------------------------------------------
create or replace function public.definir_topicos_da_aula(p_aula_id bigint, p_topicos text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_limpos text[];
begin
  perform privado.exigir_professor();
  select coalesce(array_agg(t order by n), '{}')
    into v_limpos
  from (
    select nullif(trim(x), '') as t, n from unnest(coalesce(p_topicos, '{}')) with ordinality as u(x, n)
  ) s
  where t is not null;
  if cardinality(v_limpos) > 5 then
    raise exception 'Use no máximo 5 tópicos.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_limpos) t where char_length(t) > 120) then
    raise exception 'Cada tópico pode ter até 120 letras.' using errcode = '22023';
  end if;
  update public.aulas set topicos = v_limpos where id = p_aula_id;
  if not found then
    raise exception 'Aula não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Apostila e áudio
-- ---------------------------------------------------------------------------
create or replace function public.definir_material_da_aula(p_aula_id bigint, p_tipo text, p_caminho text, p_titulo text default null)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_anterior text;
  v_extensao text;
begin
  perform privado.exigir_professor();
  if p_tipo not in ('apostila', 'audio') then
    raise exception 'Tipo de material inválido.' using errcode = '22023';
  end if;
  v_extensao := case p_tipo when 'apostila' then 'html' else 'mp3' end;
  if p_caminho is null or p_caminho !~ ('^aulas/' || p_aula_id || '/[A-Za-z0-9._-]+\.' || v_extensao || '$') then
    raise exception 'Caminho do arquivo inválido.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.aulas where id = p_aula_id) then
    raise exception 'Aula não encontrada.' using errcode = 'P0002';
  end if;

  delete from public.materiais
  where aula_id = p_aula_id and tipo = p_tipo
  returning caminho_storage into v_anterior;

  insert into public.materiais (aula_id, tipo, titulo, caminho_storage, ordem)
  values (
    p_aula_id, p_tipo,
    coalesce(nullif(trim(p_titulo), ''), case p_tipo when 'apostila' then 'Apostila da aula' else 'Áudio da aula' end),
    p_caminho, 0
  );

  return nullif(v_anterior, p_caminho);
end;
$$;

create or replace function public.remover_material_da_aula(p_aula_id bigint, p_tipo text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caminho text;
begin
  perform privado.exigir_professor();
  if p_tipo not in ('apostila', 'audio') then
    raise exception 'Tipo de material inválido.' using errcode = '22023';
  end if;
  delete from public.materiais
  where aula_id = p_aula_id and tipo = p_tipo
  returning caminho_storage into v_caminho;
  return v_caminho;
end;
$$;

revoke all on function public.definir_topicos_da_aula(bigint, text[]) from public, anon;
revoke all on function public.definir_material_da_aula(bigint, text, text, text) from public, anon;
revoke all on function public.remover_material_da_aula(bigint, text) from public, anon;
grant execute on function public.definir_topicos_da_aula(bigint, text[]) to authenticated;
grant execute on function public.definir_material_da_aula(bigint, text, text, text) to authenticated;
grant execute on function public.remover_material_da_aula(bigint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- XP por ouvir o áudio até o fim (10 XP, uma vez por aula)
-- ---------------------------------------------------------------------------
do $$
declare
  v_nome text;
begin
  for v_nome in
    select conname from pg_constraint
    where conrelid = 'public.xp_eventos'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%ARRAY[''aula''::text%'
  loop
    execute format('alter table public.xp_eventos drop constraint %I', v_nome);
  end loop;
end;
$$;

alter table public.xp_eventos
  add constraint xp_eventos_motivo_check check (motivo in ('aula', 'sequencia', 'professor', 'exercicio', 'audio'));

create unique index xp_uma_vez_por_audio on public.xp_eventos (aluno_id, aula_id) where motivo = 'audio';

create or replace function privado.xp_evento_com_origem()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.motivo in ('aula', 'audio') and new.aula_id is null then
    raise exception 'XP de aula precisa da aula.' using errcode = '23514';
  end if;
  if new.motivo = 'exercicio' and new.exercicio_id is null then
    raise exception 'XP de exercício precisa do exercício.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.registrar_audio_ouvido(p_aula_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aluno uuid := (select auth.uid());
  v_titulo text;
  v_id bigint;
  v_patente_antes text;
  v_ganhos jsonb := '[]';
begin
  if v_aluno is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '42501';
  end if;
  if privado.eh_professor() then
    return jsonb_build_object('xp', 0, 'ganhos', v_ganhos, 'medalhas', '[]'::jsonb, 'nova_patente', null);
  end if;
  if not exists (
    select 1
    from public.liberacoes l
    join public.matriculas m on m.turma_disciplina_id = l.turma_disciplina_id
    where l.aula_id = p_aula_id and m.aluno_id = v_aluno and m.status = 'aprovado'
  ) then
    raise exception 'Esta aula ainda não foi liberada para a sua turma.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.materiais where aula_id = p_aula_id and tipo = 'audio') then
    raise exception 'Esta aula não tem áudio.' using errcode = 'P0002';
  end if;

  select titulo into v_titulo from public.aulas where id = p_aula_id;
  v_patente_antes := privado.patente_de(privado.xp_total(v_aluno));

  insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, aula_id)
  values (v_aluno, 10, 'audio', 'Ouviu o áudio da aula ' || v_titulo, p_aula_id)
  on conflict do nothing
  returning id into v_id;
  if v_id is not null then
    v_ganhos := jsonb_build_array(jsonb_build_object('quantidade', 10, 'descricao', 'Ouviu o áudio da aula'));
  end if;

  return jsonb_build_object(
    'xp', case when v_id is null then 0 else 10 end,
    'ganhos', v_ganhos,
    'medalhas', to_jsonb(privado.conferir_medalhas(v_aluno)),
    'nova_patente', nullif(privado.patente_de(privado.xp_total(v_aluno)), v_patente_antes)
  );
end;
$$;

revoke all on function public.registrar_audio_ouvido(bigint) from public, anon;
grant execute on function public.registrar_audio_ouvido(bigint) to authenticated;
