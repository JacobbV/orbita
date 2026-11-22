-- =============================================================================
-- Modo Ninja do professor
-- -----------------------------------------------------------------------------
-- * O professor ganha um segundo boneco, o ninja, guardado ao lado do boneco
--   normal. Com ele o professor navega pela ponte como um aluno, em todas as
--   turmas, só para ver e testar: nada é entregue, ninguém ganha XP e o
--   professor não aparece em listas de alunos, XP ou relatórios (ele nunca tem
--   matrícula).
-- * Cinco peças novas, só para o ninja (arte original, todos os direitos
--   reservados, LICENCA-ARTE.md). O ninja pode usar também todas as outras.
-- =============================================================================

alter table public.pecas drop constraint pecas_para_check;
alter table public.pecas add constraint pecas_para_check
  check (para in ('aluno', 'professor', 'ninja', 'todos'));

insert into public.pecas (id, camada, nome, para, xp_minimo, ordem) values
  ('rosto-ninja-mascara', 'rosto', 'Máscara ninja', 'ninja', 0, 47),
  ('cabelo-capuz-ninja', 'cabelo', 'Capuz ninja', 'ninja', 0, 48),
  ('roupa-traje-ninja', 'roupa', 'Traje ninja', 'ninja', 0, 49),
  ('acessorio-faixa-ninja', 'acessorio', 'Faixa ninja', 'ninja', 0, 50),
  ('acessorio-estrela-ninja', 'acessorio', 'Estrela ninja', 'ninja', 0, 51);

-- O aluno não vê nem usa peças do ninja (o professor usa no boneco ninja).
alter table public.avatares add column escolhas_ninja jsonb
  check (escolhas_ninja is null or jsonb_typeof(escolhas_ninja) = 'object');

comment on column public.avatares.escolhas_ninja is
  'Boneco do Modo Ninja (só professor). Qualquer peça do catálogo vale.';

create or replace function public.salvar_avatar_ninja(p_escolhas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil uuid := (select auth.uid());
  v_camada text;
  v_peca text;
begin
  if not (select privado.eh_professor()) then
    raise exception 'O Modo Ninja é só do professor.' using errcode = '42501';
  end if;
  if p_escolhas is null or jsonb_typeof(p_escolhas) <> 'object' then
    raise exception 'Avatar inválido.' using errcode = '22023';
  end if;

  for v_camada, v_peca in select key, value #>> '{}' from jsonb_each(p_escolhas) loop
    if not exists (select 1 from public.pecas where id = v_peca and camada = v_camada) then
      raise exception 'Peça indisponível: %.', coalesce(v_peca, v_camada) using errcode = '22023';
    end if;
  end loop;

  -- O boneco normal continua como está (ou o padrão do professor, se nunca salvou).
  insert into public.avatares (perfil_id, escolhas, escolhas_ninja) values (v_perfil, '{}', p_escolhas)
  on conflict (perfil_id) do update set escolhas_ninja = excluded.escolhas_ninja, atualizado_em = now();
end;
$$;

revoke all on function public.salvar_avatar_ninja(jsonb) from public, anon;
grant execute on function public.salvar_avatar_ninja(jsonb) to authenticated;
