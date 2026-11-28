-- =============================================================================
-- Presença na escola virtual: XP por tempo sentado
-- -----------------------------------------------------------------------------
-- * O navegador manda um sinal por minuto enquanto o aluno está sentado numa
--   sala de estudo. Quem conta o tempo é o banco: cada sinal vale no máximo
--   90 s desde o sinal anterior, então sinal falso ou em rajada não rende.
-- * A cada 15 min contados, 5 XP; no máximo 4 pagamentos (20 XP) por dia.
-- * Professor e Modo Ninja não ganham nada.
-- =============================================================================

alter table public.xp_eventos drop constraint xp_eventos_motivo_check;
alter table public.xp_eventos
  add constraint xp_eventos_motivo_check check (motivo in ('aula', 'sequencia', 'professor', 'exercicio', 'audio', 'presenca'));

create table public.presencas_escola (
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  dia date not null,
  segundos integer not null default 0 check (segundos >= 0),
  pagamentos smallint not null default 0 check (pagamentos between 0 and 4),
  ultimo_sinal timestamptz not null default now(),
  primary key (aluno_id, dia)
);

comment on table public.presencas_escola is 'Tempo sentado em sala de estudo na escola virtual, por aluno e por dia.';

alter table public.presencas_escola enable row level security;
revoke all on public.presencas_escola from anon, authenticated;
grant select on public.presencas_escola to authenticated;
create policy "presenca: aluno lê a sua, professor lê todas" on public.presencas_escola
  for select to authenticated
  using (aluno_id = (select auth.uid()) or (select privado.eh_professor()));

create or replace function public.registrar_presenca_escola(p_sala text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aluno uuid := (select auth.uid());
  v_dia date := privado.hoje();
  v_antes timestamptz;
  v_segundos integer;
  v_pagos smallint;
  v_devidos integer;
  v_patente_antes text;
  v_ganhos jsonb := '[]';
  v_xp integer := 0;
begin
  if v_aluno is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '42501';
  end if;
  if privado.eh_professor() then
    return jsonb_build_object('xp', 0, 'ganhos', v_ganhos, 'medalhas', '[]'::jsonb, 'nova_patente', null);
  end if;
  if p_sala is null or p_sala not in ('sala-7', 'sala-8', 'lab-1', 'lab-2', 'lab-cad', 'biblioteca') then
    raise exception 'Sala inválida.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.matriculas where aluno_id = v_aluno and status = 'aprovado') then
    raise exception 'Você ainda não foi aprovado em uma turma.' using errcode = '42501';
  end if;

  -- A primeira linha do dia só marca o início; nenhum tempo é contado ainda.
  insert into public.presencas_escola (aluno_id, dia) values (v_aluno, v_dia)
  on conflict do nothing;

  select ultimo_sinal, segundos, pagamentos into v_antes, v_segundos, v_pagos
  from public.presencas_escola where aluno_id = v_aluno and dia = v_dia for update;

  -- Sinal que chega antes de 45 s do anterior não conta (limita rajadas).
  if now() - v_antes >= interval '45 seconds' then
    v_segundos := v_segundos + least(90, extract(epoch from now() - v_antes)::integer);
  else
    return jsonb_build_object('xp', 0, 'ganhos', v_ganhos, 'medalhas', '[]'::jsonb, 'nova_patente', null);
  end if;

  v_devidos := least(4, v_segundos / 900) - v_pagos;
  v_patente_antes := privado.patente_de(privado.xp_total(v_aluno));
  if v_devidos > 0 then
    for i in 1..v_devidos loop
      insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, referencia_dia)
      values (v_aluno, 5, 'presenca', 'Tempo de estudo na escola', v_dia);
      v_xp := v_xp + 5;
      v_ganhos := v_ganhos || jsonb_build_array(jsonb_build_object('quantidade', 5, 'descricao', 'Tempo de estudo na escola'));
    end loop;
  end if;

  update public.presencas_escola
  set segundos = v_segundos, pagamentos = v_pagos + greatest(v_devidos, 0), ultimo_sinal = now()
  where aluno_id = v_aluno and dia = v_dia;

  return jsonb_build_object(
    'xp', v_xp,
    'ganhos', v_ganhos,
    'medalhas', case when v_xp > 0 then to_jsonb(privado.conferir_medalhas(v_aluno)) else '[]'::jsonb end,
    'nova_patente', case when v_xp > 0 then nullif(privado.patente_de(privado.xp_total(v_aluno)), v_patente_antes) end
  );
end;
$$;

revoke all on function public.registrar_presenca_escola(text) from public, anon;
grant execute on function public.registrar_presenca_escola(text) to authenticated;
