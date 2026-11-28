-- =============================================================================
-- Modo Ninja: prova de treino
-- -----------------------------------------------------------------------------
-- O professor, no Modo Ninja, faz qualquer prova como treino. As questões saem
-- no mesmo formato que o aluno recebe (visíveis completos, ocultos só com a
-- impressão digital, secretos nunca), mas sem tentativa: nada é gravado, não
-- cria tentativa, resposta, saída da aba, nota nem XP. Só o professor chama.
-- =============================================================================

create or replace function public.questoes_da_prova_ninja(p_prova_id bigint)
returns table (
  questao_id bigint,
  titulo text,
  enunciado text,
  linguagem text,
  codigo_inicial text,
  peso numeric,
  testes jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select privado.eh_professor()) then
    raise exception 'A prova de treino é só do Modo Ninja do professor.' using errcode = '42501';
  end if;
  return query
    select q.id, e.titulo, e.enunciado, e.linguagem, e.codigo_inicial, q.peso,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', t.id, 'tipo', t.tipo, 'entrada', t.entrada,
          'saida_esperada', case when t.tipo = 'visivel' then t.saida_esperada end,
          'saida_hash', privado.impressao_conferida(t.saida_esperada, t.entrada, e.conferencia, e.palavras_extras),
          'conferencia', privado.modo_do_teste(t.saida_esperada, t.entrada, e.conferencia, e.palavras_extras),
          'palavras', e.palavras_extras
        ) order by t.tipo desc, t.ordem, t.id)
        from public.testes t
        where t.exercicio_id = e.id and t.tipo in ('visivel', 'oculto')
      ), '[]'::jsonb)
    from public.prova_questoes q
    join public.exercicios e on e.id = q.exercicio_id
    where q.prova_id = p_prova_id
    order by q.ordem, q.id;
end;
$$;

revoke all on function public.questoes_da_prova_ninja(bigint) from public, anon;
grant execute on function public.questoes_da_prova_ninja(bigint) to authenticated;
