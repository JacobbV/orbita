-- =============================================================================
-- Entrega única, correção e devolução pelo professor
-- -----------------------------------------------------------------------------
-- * Cada exercício aceita uma entrega por aluno. Para entregar de novo, o
--   professor precisa devolver a entrega (o aluno refaz e entrega outra vez).
-- * O professor pode escrever um comentário e ajustar a nota de cada entrega.
--   O aluno vê o comentário, a nota e se a entrega foi devolvida.
-- * Entregas antigas (de quando dava para entregar várias vezes) continuam
--   guardadas; vale a regra nova daqui para frente.
-- =============================================================================

alter table public.entregas
  add column comentario text check (comentario is null or char_length(comentario) between 1 and 2000),
  add column nota_professor numeric(4, 1) check (nota_professor is null or nota_professor between 0 and 10),
  add column corrigida_em timestamptz,
  add column devolvida_em timestamptz;

comment on column public.entregas.comentario is 'Comentário do professor, visível ao aluno.';
comment on column public.entregas.nota_professor is 'Nota ajustada pelo professor. Quando existe, vale no lugar da nota dos testes.';
comment on column public.entregas.devolvida_em is 'Quando o professor devolveu a entrega para o aluno refazer.';

-- -----------------------------------------------------------------------------
-- Entregar: agora recusa uma segunda entrega enquanto a anterior não for
-- devolvida. O resto segue igual (nota pelos testes, XP a confirmar).
-- -----------------------------------------------------------------------------
create or replace function public.entregar(p_exercicio_id bigint, p_codigo text, p_testes_certos integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aluno uuid := (select auth.uid());
  v_exercicio public.exercicios%rowtype;
  v_total integer;
  v_tentativa integer;
  v_entrega bigint;
  v_xp integer := 0;
  v_ganhos jsonb := '[]';
  v_id bigint;
  v_patente_antes text;
begin
  if v_aluno is null or privado.eh_professor() then
    raise exception 'Só o aluno entrega exercícios.' using errcode = '42501';
  end if;
  select * into v_exercicio from public.exercicios where id = p_exercicio_id;
  if v_exercicio.id is null or not exists (
    select 1
    from public.liberacoes l
    join public.matriculas m on m.turma_disciplina_id = l.turma_disciplina_id
    where l.aula_id = v_exercicio.aula_id and m.aluno_id = v_aluno and m.status = 'aprovado'
  ) then
    raise exception 'Este exercício ainda não foi liberado para a sua turma.' using errcode = '42501';
  end if;
  if char_length(coalesce(p_codigo, '')) not between 1 and 20000 then
    raise exception 'Escreva o código antes de entregar (até 20 mil caracteres).' using errcode = '22023';
  end if;

  -- Duas entregas ao mesmo tempo (clique duplo, duas abas) esperam uma pela outra.
  perform pg_advisory_xact_lock(hashtextextended(p_exercicio_id::text || ':' || v_aluno::text, 0));

  if exists (
    select 1 from public.entregas
    where exercicio_id = p_exercicio_id and aluno_id = v_aluno and devolvida_em is null
  ) then
    raise exception 'Você já entregou este exercício. Só dá para entregar de novo se o professor devolver.'
      using errcode = '23505';
  end if;

  select count(*) into v_total from public.testes where exercicio_id = p_exercicio_id and tipo in ('visivel', 'oculto');
  if p_testes_certos is null or p_testes_certos < 0 or p_testes_certos > v_total then
    raise exception 'Resultado dos testes inválido.' using errcode = '22023';
  end if;

  v_patente_antes := privado.patente_de(privado.xp_total(v_aluno));

  select coalesce(max(tentativa), 0) + 1 into v_tentativa
  from public.entregas where exercicio_id = p_exercicio_id and aluno_id = v_aluno;

  insert into public.entregas (exercicio_id, aluno_id, codigo, testes_certos, testes_total, nota, tentativa)
  values (
    p_exercicio_id, v_aluno, p_codigo, p_testes_certos, v_total,
    case when v_total = 0 then 0 else round(10.0 * p_testes_certos / v_total, 1) end,
    v_tentativa
  )
  returning id into v_entrega;

  if v_total > 0 and p_testes_certos = v_total then
    v_xp := case v_exercicio.dificuldade when 1 then 20 when 2 then 35 else 50 end;
    insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, exercicio_id, aula_id, situacao)
    values (v_aluno, v_xp, 'exercicio', 'Resolveu ' || v_exercicio.titulo, p_exercicio_id, v_exercicio.aula_id, 'a_confirmar')
    on conflict do nothing
    returning id into v_id;
    if v_id is not null then
      v_ganhos := v_ganhos || jsonb_build_object('quantidade', v_xp, 'descricao', 'Exercício resolvido (a confirmar)');
    else
      v_xp := 0;
    end if;
  end if;

  return jsonb_build_object(
    'entrega_id', v_entrega,
    'tentativa', v_tentativa,
    'xp', v_xp,
    'ganhos', v_ganhos,
    'medalhas', to_jsonb(privado.conferir_medalhas(v_aluno)),
    'nova_patente', nullif(privado.patente_de(privado.xp_total(v_aluno)), v_patente_antes)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Corrigir: comentário e nota ajustada (nula = vale a nota dos testes)
-- -----------------------------------------------------------------------------
create or replace function public.corrigir_entrega(p_entrega_id bigint, p_nota numeric, p_comentario text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comentario text := nullif(trim(coalesce(p_comentario, '')), '');
begin
  perform privado.exigir_professor();
  if p_nota is not null and (p_nota < 0 or p_nota > 10) then
    raise exception 'A nota vai de 0 a 10.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_comentario, '')) > 2000 then
    raise exception 'O comentário pode ter até 2 mil caracteres.' using errcode = '22023';
  end if;
  update public.entregas
  set nota_professor = round(p_nota, 1), comentario = v_comentario, corrigida_em = now()
  where id = p_entrega_id;
  if not found then
    raise exception 'Entrega não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.corrigir_entrega(bigint, numeric, text) from public, anon;
grant execute on function public.corrigir_entrega(bigint, numeric, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Devolver: o aluno pode refazer e entregar de novo. O XP já ganho não muda.
-- -----------------------------------------------------------------------------
create or replace function public.devolver_entrega(p_entrega_id bigint, p_comentario text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entrega public.entregas%rowtype;
  v_comentario text := nullif(trim(coalesce(p_comentario, '')), '');
begin
  perform privado.exigir_professor();
  select * into v_entrega from public.entregas where id = p_entrega_id;
  if v_entrega.id is null then
    raise exception 'Entrega não encontrada.' using errcode = 'P0002';
  end if;
  if v_entrega.devolvida_em is not null then
    raise exception 'Esta entrega já foi devolvida.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_comentario, '')) > 2000 then
    raise exception 'O comentário pode ter até 2 mil caracteres.' using errcode = '22023';
  end if;
  update public.entregas
  set devolvida_em = now(), corrigida_em = now(), comentario = coalesce(v_comentario, comentario)
  where id = p_entrega_id;
end;
$$;

revoke all on function public.devolver_entrega(bigint, text) from public, anon;
grant execute on function public.devolver_entrega(bigint, text) to authenticated;
