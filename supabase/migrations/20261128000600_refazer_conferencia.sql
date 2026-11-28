-- =============================================================================
-- Refazer a conferência de entregas já feitas
-- -----------------------------------------------------------------------------
-- A conferência flexível (migration 20261128000200) vale para entregas novas.
-- Quem entregou antes, com a regra de letra por letra, ficou com menos testes
-- certos, sem XP, ou com o XP retirado numa reconferência feita com o texto
-- esperado de outra época.
--
-- Esta função é chamada pelo navegador do professor, que roda de novo todos os
-- testes (inclusive os secretos) no código de cada entrega com a regra de agora
-- e manda o resultado. Ela só melhora, nunca piora:
-- * se a nota dos testes subiu, atualiza testes certos e nota (a nota ajustada
--   pelo professor, se existir, continua valendo);
-- * se agora acerta tudo e os secretos também, confirma a entrega e dá o XP do
--   exercício que faltava (ou devolve o que tinha sido retirado).
-- Cada exercício rende XP uma vez por aluno, como sempre.
-- =============================================================================

create or replace function public.refazer_conferencia(
  p_entrega_id bigint,
  p_testes_certos integer,
  p_secretos_ok boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entrega public.entregas%rowtype;
  v_exercicio public.exercicios%rowtype;
  v_total integer;
  v_acertou_tudo boolean;
  v_subiu boolean;
  v_falta_xp boolean;
  v_xp integer := 0;
  v_id bigint;
begin
  perform privado.exigir_professor();

  select * into v_entrega from public.entregas where id = p_entrega_id;
  if v_entrega.id is null then
    raise exception 'Entrega não encontrada.' using errcode = 'P0002';
  end if;
  select * into v_exercicio from public.exercicios where id = v_entrega.exercicio_id;

  select count(*) into v_total from public.testes
  where exercicio_id = v_entrega.exercicio_id and tipo in ('visivel', 'oculto');
  if p_testes_certos is null or p_testes_certos < 0 or p_testes_certos > v_total or p_secretos_ok is null then
    raise exception 'Resultado dos testes inválido.' using errcode = '22023';
  end if;

  v_acertou_tudo := v_total > 0 and p_testes_certos = v_total and p_secretos_ok;
  -- Compara as proporções (os testes do exercício podem ter mudado de quantidade).
  v_subiu := v_total > 0 and v_entrega.testes_total > 0
    and p_testes_certos * v_entrega.testes_total > v_entrega.testes_certos * v_total;

  v_falta_xp := v_acertou_tudo and not exists (
    select 1 from public.xp_eventos
    where aluno_id = v_entrega.aluno_id and exercicio_id = v_entrega.exercicio_id
      and motivo = 'exercicio' and situacao <> 'retirado'
  );

  if not v_subiu and not v_falta_xp and not (v_acertou_tudo and v_entrega.situacao <> 'confirmada') then
    return jsonb_build_object('mudou', false, 'xp', 0, 'nota', v_entrega.nota);
  end if;

  if v_subiu or v_entrega.testes_total = 0 then
    update public.entregas
    set testes_certos = p_testes_certos,
        testes_total = v_total,
        nota = case when v_total = 0 then 0 else round(10.0 * p_testes_certos / v_total, 1) end,
        conferida_em = now()
    where id = p_entrega_id
    returning * into v_entrega;
  end if;

  if v_acertou_tudo then
    update public.entregas set situacao = 'confirmada', conferida_em = now() where id = p_entrega_id;

    -- XP do exercício: uma vez por aluno. Devolve o retirado ou dá o que faltava.
    if v_falta_xp then
      update public.xp_eventos
      set situacao = 'confirmado'
      where id = (
        select id from public.xp_eventos
        where aluno_id = v_entrega.aluno_id and exercicio_id = v_entrega.exercicio_id
          and motivo = 'exercicio' and situacao = 'retirado'
        order by criado_em desc
        limit 1
      )
      returning quantidade into v_xp;

      if not found then
        v_xp := case v_exercicio.dificuldade when 1 then 20 when 2 then 35 else 50 end;
        insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, exercicio_id, aula_id, situacao)
        values (v_entrega.aluno_id, v_xp, 'exercicio', 'Resolveu ' || v_exercicio.titulo,
                v_entrega.exercicio_id, v_exercicio.aula_id, 'confirmado')
        returning id into v_id;
      end if;
    end if;
  end if;

  perform privado.conferir_medalhas(v_entrega.aluno_id);

  return jsonb_build_object('mudou', true, 'xp', v_xp, 'nota', v_entrega.nota);
end;
$$;

revoke all on function public.refazer_conferencia(bigint, integer, boolean) from public, anon;
grant execute on function public.refazer_conferencia(bigint, integer, boolean) to authenticated;
