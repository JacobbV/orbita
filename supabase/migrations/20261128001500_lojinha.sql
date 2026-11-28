-- Lojinha com moedinhas.
--
-- XP e moedinha são coisas separadas:
-- - XP é a evolução do aluno: dá a patente e abre sozinho as peças do uniforme.
-- - Moedinha é rara e se gasta na Loja do Hangar (e, mais tarde, nos jogos).
--
-- De onde vêm as moedas:
-- - 5 de boas-vindas, uma vez, quando o aluno é aprovado numa turma
--   (quem já estava aprovado recebe agora);
-- - 10 por prova com nota máxima, quando o professor publica as notas;
-- - 3 quando todos os exercícios de uma aula estão corretos e corrigidos;
-- - 5 quando todos os exercícios de uma unidade estão corretos e corrigidos;
-- - de 1 a 10 dadas pelo professor (ele também pode tirar, com motivo);
-- - troca de XP por moedas, escolha do aluno: 50 XP = 1 moeda. O XP trocado
--   sai do total, e a patente pode descer.
--
-- A prova passa a dar XP: até 50, conforme a nota (nota x 5), quando o
-- professor publica as notas.
--
-- Nada aqui tem ligação com dinheiro real. Todas as contas são feitas no banco.

-- -----------------------------------------------------------------------------
-- Peças da loja: preço e se está à venda
-- -----------------------------------------------------------------------------
alter table public.pecas
  add column preco integer check (preco is null or preco between 1 and 9999),
  add column na_loja boolean not null default false;

comment on column public.pecas.preco is 'Preço em moedinhas. Null = peça que não é da loja (grátis ou aberta por XP).';
comment on column public.pecas.na_loja is 'A peça está à venda. Quem já comprou continua com ela se sair da loja.';

-- As peças que abriam por XP passam para a loja, menos as 5 do uniforme da
-- nave (para = 'aluno'), que continuam abrindo sozinhas pela patente.
-- Preços: 100 XP -> 15 moedas (comum), 250 -> 40 (rara), 500 -> 80 (épica).
update public.pecas
set preco = case xp_minimo when 100 then 15 when 250 then 40 else 80 end,
    na_loja = true,
    xp_minimo = 0
where xp_minimo > 0 and para = 'todos';

-- -----------------------------------------------------------------------------
-- Moedas ganhas (e tiradas) e compras
-- -----------------------------------------------------------------------------
create table public.moedas_eventos (
  id bigint generated always as identity primary key,
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  -- Positivo = ganhou; negativo = o professor tirou.
  quantidade integer not null check (quantidade between -100 and 1000 and quantidade <> 0),
  motivo text not null check (motivo in ('boas-vindas', 'prova', 'aula-completa', 'unidade-completa', 'professor', 'troca')),
  descricao text not null check (char_length(trim(descricao)) between 1 and 200),
  prova_id bigint references public.provas (id) on delete set null,
  aula_id bigint references public.aulas (id) on delete set null,
  unidade_id bigint references public.unidades (id) on delete set null,
  -- XP gasto na troca (motivo 'troca'): sai do total de XP.
  xp_trocado integer not null default 0 check (xp_trocado >= 0),
  dado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  check ((motivo = 'troca') = (xp_trocado > 0)),
  check (motivo = 'professor' or quantidade > 0)
);

comment on table public.moedas_eventos is 'Cada ganho (ou retirada) de moedinhas de um aluno.';

-- Cada prêmio, uma vez só.
create unique index moedas_boas_vindas_uma_vez on public.moedas_eventos (aluno_id) where motivo = 'boas-vindas';
create unique index moedas_prova_uma_vez on public.moedas_eventos (aluno_id, prova_id) where motivo = 'prova';
create unique index moedas_aula_uma_vez on public.moedas_eventos (aluno_id, aula_id) where motivo = 'aula-completa';
create unique index moedas_unidade_uma_vez on public.moedas_eventos (aluno_id, unidade_id) where motivo = 'unidade-completa';
create index on public.moedas_eventos (aluno_id, criado_em desc);

create table public.compras (
  id bigint generated always as identity primary key,
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  peca_id text not null references public.pecas (id) on delete cascade,
  -- Preço pago (0 = peça que o aluno já usava antes da loja).
  preco integer not null check (preco >= 0),
  comprada_em timestamptz not null default now(),
  -- Devolvida pelo professor: a peça sai e as moedas voltam.
  devolvida_em timestamptz,
  devolvida_por uuid references public.perfis (id) on delete set null
);

comment on table public.compras is 'Peças compradas na loja. Compra devolvida não conta.';

create unique index compras_uma_por_peca on public.compras (aluno_id, peca_id) where devolvida_em is null;
create index on public.compras (comprada_em desc);

alter table public.moedas_eventos enable row level security;
alter table public.compras enable row level security;
revoke all on public.moedas_eventos, public.compras from anon, authenticated;
grant select on public.moedas_eventos, public.compras to authenticated;

create policy "moedas: aluno lê as próprias, professor lê todas"
  on public.moedas_eventos for select to authenticated
  using (aluno_id = (select auth.uid()) or (select privado.eh_professor()));

create policy "compras: aluno lê as próprias, professor lê todas"
  on public.compras for select to authenticated
  using (aluno_id = (select auth.uid()) or (select privado.eh_professor()));

-- Quem já usa no boneco uma peça que foi para a loja fica com ela, de graça.
-- As outras peças da loja precisam ser compradas, mesmo por quem tinha XP.
insert into public.compras (aluno_id, peca_id, preco)
select distinct a.perfil_id, pc.id, 0
from public.avatares a
join public.perfis p on p.id = a.perfil_id and p.papel = 'aluno'
cross join lateral jsonb_each_text(a.escolhas) e(camada, peca)
join public.pecas pc on pc.id = e.peca and pc.camada = e.camada and pc.preco is not null;

-- -----------------------------------------------------------------------------
-- Contas
-- -----------------------------------------------------------------------------

-- XP total = XP ganho menos o XP trocado por moedas (nunca abaixo de 0).
create or replace function privado.xp_total(p_aluno_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(0,
    coalesce((select sum(quantidade) from public.xp_eventos where aluno_id = p_aluno_id and situacao <> 'retirado'), 0)
    - coalesce((select sum(xp_trocado) from public.moedas_eventos where aluno_id = p_aluno_id), 0)
  )::integer;
$$;

revoke all on function privado.xp_total(uuid) from public;

-- Saldo = moedas ganhas menos as compras que não foram devolvidas.
create or replace function privado.saldo_de_moedas(p_aluno_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (
    coalesce((select sum(quantidade) from public.moedas_eventos where aluno_id = p_aluno_id), 0)
    - coalesce((select sum(preco) from public.compras where aluno_id = p_aluno_id and devolvida_em is null), 0)
  )::integer;
$$;

revoke all on function privado.saldo_de_moedas(uuid) from public;

-- Dá um prêmio automático (uma vez só, pelos índices únicos). true = deu agora.
create or replace function privado.premiar_moedas(
  p_aluno_id uuid, p_quantidade integer, p_motivo text, p_descricao text,
  p_prova_id bigint default null, p_aula_id bigint default null, p_unidade_id bigint default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not exists (select 1 from public.perfis where id = p_aluno_id and papel = 'aluno') then
    return false;
  end if;
  insert into public.moedas_eventos (aluno_id, quantidade, motivo, descricao, prova_id, aula_id, unidade_id)
  values (p_aluno_id, p_quantidade, p_motivo, left(p_descricao, 200), p_prova_id, p_aula_id, p_unidade_id)
  on conflict do nothing
  returning id into v_id;
  return v_id is not null;
end;
$$;

revoke all on function privado.premiar_moedas(uuid, integer, text, text, bigint, bigint, bigint) from public;

-- Peça que o aluno pode usar agora? (papel, XP da patente e compra)
create or replace function privado.pode_usar_peca(p_peca public.pecas, p_aluno_id uuid, p_papel text, p_xp integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (p_peca.para = 'todos' or p_peca.para = p_papel)
    and p_peca.xp_minimo <= p_xp
    and (p_peca.preco is null or p_papel = 'professor'
         or exists (select 1 from public.compras c
                    where c.aluno_id = p_aluno_id and c.peca_id = p_peca.id and c.devolvida_em is null));
$$;

revoke all on function privado.pode_usar_peca(public.pecas, uuid, text, integer) from public;

-- Conferência do boneco, agora também com as compras da loja.
-- p_papel null = Modo Ninja (qualquer peça vale).
create or replace function privado.conferir_escolhas(p_escolhas jsonb, p_papel text, p_xp integer, p_perfil uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_camada text;
  v_peca text;
  v_linha public.pecas%rowtype;
begin
  if p_escolhas is null or jsonb_typeof(p_escolhas) <> 'object' then
    raise exception 'Avatar inválido.' using errcode = '22023';
  end if;
  for v_camada, v_peca in select key, value #>> '{}' from jsonb_each(p_escolhas) loop
    if v_camada = 'cor-livre' then
      if v_peca is null or v_peca !~ '^#[0-9a-f]{6}$' then
        raise exception 'Cor inválida.' using errcode = '22023';
      end if;
      continue;
    end if;
    select * into v_linha from public.pecas where id = v_peca and camada = v_camada;
    if v_linha.id is null
       or (p_papel is not null and not privado.pode_usar_peca(v_linha, p_perfil, p_papel, p_xp)) then
      raise exception 'Peça indisponível: %.', coalesce(v_peca, v_camada) using errcode = '22023';
    end if;
  end loop;
end;
$$;

revoke all on function privado.conferir_escolhas(jsonb, text, integer, uuid) from public;

create or replace function public.salvar_avatar(p_escolhas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil uuid := (select auth.uid());
  v_papel text;
  v_xp integer;
begin
  select papel into v_papel from public.perfis where id = v_perfil;
  if v_papel is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '42501';
  end if;
  v_xp := case when v_papel = 'professor' then 2147483647 else privado.xp_total(v_perfil) end;
  perform privado.conferir_escolhas(p_escolhas, v_papel, v_xp, v_perfil);

  insert into public.avatares (perfil_id, escolhas) values (v_perfil, p_escolhas)
  on conflict (perfil_id) do update set escolhas = excluded.escolhas, atualizado_em = now();
  -- Montar o boneco dá a medalha Estilista Espacial (só para aluno).
  if v_papel = 'aluno' then
    perform privado.conferir_medalhas(v_perfil);
  end if;
end;
$$;

revoke all on function public.salvar_avatar(jsonb) from public, anon;
grant execute on function public.salvar_avatar(jsonb) to authenticated;

create or replace function public.salvar_avatar_ninja(p_escolhas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil uuid := (select auth.uid());
begin
  if not (select privado.eh_professor()) then
    raise exception 'O Modo Ninja é só do professor.' using errcode = '42501';
  end if;
  perform privado.conferir_escolhas(p_escolhas, null, 0, v_perfil);
  insert into public.avatares (perfil_id, escolhas, escolhas_ninja) values (v_perfil, '{}', p_escolhas)
  on conflict (perfil_id) do update set escolhas_ninja = excluded.escolhas_ninja, atualizado_em = now();
end;
$$;

revoke all on function public.salvar_avatar_ninja(jsonb) from public, anon;
grant execute on function public.salvar_avatar_ninja(jsonb) to authenticated;

drop function privado.conferir_escolhas(jsonb, text, integer);

-- Tira do boneco salvo as peças que o aluno não pode mais usar (depois de uma
-- troca que baixou a patente ou de uma compra devolvida). Camada obrigatória
-- volta para a peça padrão do aluno.
create or replace function privado.tirar_pecas_trancadas(p_aluno_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_escolhas jsonb;
  v_novas jsonb;
  v_xp integer := privado.xp_total(p_aluno_id);
  v_padrao constant jsonb := '{"pele": "pele-3", "rosto": "rosto-sorridente", "cabelo": "cabelo-curto",
    "cor-do-cabelo": "cabelo-castanho", "roupa": "roupa-uniforme", "pes": "pes-tenis-branco"}';
begin
  select escolhas into v_escolhas from public.avatares where perfil_id = p_aluno_id;
  if v_escolhas is null then
    return;
  end if;
  select coalesce(jsonb_object_agg(e.key,
           case when pc.id is null or privado.pode_usar_peca(pc, p_aluno_id, 'aluno', v_xp) then e.value
                else v_padrao -> e.key end)
         filter (where pc.id is null or privado.pode_usar_peca(pc, p_aluno_id, 'aluno', v_xp) or v_padrao ? e.key),
         '{}')
  into v_novas
  from jsonb_each(v_escolhas) e
  left join public.pecas pc on pc.id = e.value #>> '{}' and pc.camada = e.key;
  if v_novas is distinct from v_escolhas then
    update public.avatares set escolhas = v_novas, atualizado_em = now() where perfil_id = p_aluno_id;
  end if;
end;
$$;

revoke all on function privado.tirar_pecas_trancadas(uuid) from public;

-- XP, patente e moedas do aluno (a ponte e o Hangar leem daqui).
create or replace function public.meu_progresso()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with total as (select privado.xp_total((select auth.uid())) as xp)
  select jsonb_build_object(
    'xp', t.xp,
    'nivel', atual.nivel,
    'patente', atual.nome,
    'xp_da_patente', atual.xp_minimo,
    'proxima', proxima.nome,
    'xp_da_proxima', proxima.xp_minimo,
    'moedas', privado.saldo_de_moedas((select auth.uid()))
  )
  from total t
  cross join lateral (
    select nivel, nome, xp_minimo from public.patentes where xp_minimo <= t.xp order by xp_minimo desc limit 1
  ) atual
  left join lateral (
    select nome, xp_minimo from public.patentes where xp_minimo > t.xp order by xp_minimo limit 1
  ) proxima on true;
$$;

revoke all on function public.meu_progresso() from public, anon;
grant execute on function public.meu_progresso() to authenticated;

-- -----------------------------------------------------------------------------
-- Boas-vindas: 5 moedas na primeira aprovação
-- -----------------------------------------------------------------------------
create or replace function privado.moedas_de_boas_vindas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'aprovado' then
    perform privado.premiar_moedas(new.aluno_id, 5, 'boas-vindas', 'Boas-vindas à nave');
  end if;
  return new;
end;
$$;

revoke all on function privado.moedas_de_boas_vindas() from public;

create trigger moedas_de_boas_vindas
  after insert or update of status on public.matriculas
  for each row execute function privado.moedas_de_boas_vindas();

-- Quem já estava aprovado recebe agora.
select privado.premiar_moedas(aluno_id, 5, 'boas-vindas', 'Boas-vindas à nave')
from (select distinct aluno_id from public.matriculas where status = 'aprovado') m;

-- -----------------------------------------------------------------------------
-- Exercícios: aula e unidade completas (tudo certo e corrigido)
-- -----------------------------------------------------------------------------

-- O exercício está certo e corrigido? Vale a última entrega: não devolvida, com
-- nota 10 dada pelo professor ou conferida (confirmada) com nota 10 nos testes.
create or replace function privado.exercicio_certo(p_aluno_id uuid, p_exercicio_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select e.devolvida_em is null
      and case when e.nota_professor is not null then e.nota_professor = 10
               else e.situacao = 'confirmada' and e.nota = 10 end
    from public.entregas e
    where e.aluno_id = p_aluno_id and e.exercicio_id = p_exercicio_id
    order by e.tentativa desc
    limit 1
  ), false);
$$;

revoke all on function privado.exercicio_certo(uuid, bigint) from public;

create or replace function privado.premiar_exercicios(p_aluno_id uuid, p_aula_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aula record;
begin
  select a.id, a.titulo, a.unidade_id, u.numero as unidade
  into v_aula
  from public.aulas a join public.unidades u on u.id = a.unidade_id
  where a.id = p_aula_id;
  if v_aula.id is null then
    return;
  end if;

  if exists (select 1 from public.exercicios where aula_id = p_aula_id)
     and not exists (select 1 from public.exercicios x where x.aula_id = p_aula_id
                     and not privado.exercicio_certo(p_aluno_id, x.id)) then
    perform privado.premiar_moedas(p_aluno_id, 3, 'aula-completa',
      'Todos os exercícios certos: ' || v_aula.titulo, null, p_aula_id, null);
  end if;

  if exists (select 1 from public.exercicios x join public.aulas a on a.id = x.aula_id where a.unidade_id = v_aula.unidade_id)
     and not exists (select 1 from public.exercicios x join public.aulas a on a.id = x.aula_id
                     where a.unidade_id = v_aula.unidade_id and not privado.exercicio_certo(p_aluno_id, x.id)) then
    perform privado.premiar_moedas(p_aluno_id, 5, 'unidade-completa',
      'Todos os exercícios certos da unidade ' || v_aula.unidade, null, null, v_aula.unidade_id);
  end if;
end;
$$;

revoke all on function privado.premiar_exercicios(uuid, bigint) from public;

create or replace function privado.moedas_da_entrega()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aula bigint;
begin
  select aula_id into v_aula from public.exercicios where id = new.exercicio_id;
  if v_aula is not null then
    perform privado.premiar_exercicios(new.aluno_id, v_aula);
  end if;
  return new;
end;
$$;

revoke all on function privado.moedas_da_entrega() from public;

create trigger moedas_da_entrega
  after insert or update of situacao, nota, nota_professor, devolvida_em on public.entregas
  for each row execute function privado.moedas_da_entrega();

-- -----------------------------------------------------------------------------
-- Provas: XP conforme a nota e moedas pela nota máxima, ao publicar as notas
-- -----------------------------------------------------------------------------
alter table public.xp_eventos add column prova_id bigint references public.provas (id) on delete set null;

alter table public.xp_eventos drop constraint xp_eventos_motivo_check;

alter table public.xp_eventos
  add constraint xp_eventos_motivo_check
  check (motivo in ('aula', 'sequencia', 'professor', 'exercicio', 'audio', 'prova'));

alter table public.xp_eventos
  add constraint xp_eventos_prova_com_prova check (motivo <> 'prova' or prova_id is not null);

create unique index xp_uma_vez_por_prova on public.xp_eventos (aluno_id, prova_id) where motivo = 'prova';

-- Premia quem terminou a prova e já teve todas as respostas conferidas. Quem
-- ainda tem resposta a conferir (ou fez a segunda chamada depois) recebe quando
-- o professor publicar de novo. Cada prêmio sai uma vez só.
create or replace function privado.premiar_prova(p_prova_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titulo text;
  v_t record;
  v_nota numeric;
  v_xp integer;
begin
  select titulo into v_titulo from public.provas where id = p_prova_id;
  for v_t in
    select t.id, t.aluno_id
    from public.prova_tentativas t
    join public.perfis p on p.id = t.aluno_id and p.papel = 'aluno'
    where t.prova_id = p_prova_id
      and (t.entregue_em is not null or t.termina_em <= now())
      and not exists (select 1 from public.prova_respostas r where r.tentativa_id = t.id and r.situacao = 'a_confirmar')
  loop
    v_nota := privado.nota_da_tentativa(v_t.id);
    v_xp := round(coalesce(v_nota, 0) * 5)::integer;
    if v_xp > 0 then
      insert into public.xp_eventos (aluno_id, quantidade, motivo, descricao, prova_id)
      values (v_t.aluno_id, v_xp, 'prova', left('Prova: ' || v_titulo, 200), p_prova_id)
      on conflict do nothing;
    end if;
    if v_nota >= 10 then
      perform privado.premiar_moedas(v_t.aluno_id, 10, 'prova', 'Nota máxima na prova: ' || v_titulo, p_prova_id);
    end if;
  end loop;
end;
$$;

revoke all on function privado.premiar_prova(bigint) from public;

create or replace function public.publicar_notas(p_prova_id bigint, p_publicar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  update public.provas
  set notas_publicadas_em = case when p_publicar then now() end
  where id = p_prova_id;
  if not found then
    raise exception 'Prova não encontrada.' using errcode = 'P0002';
  end if;
  if p_publicar then
    perform privado.fechar_se_acabou(t.id) from public.prova_tentativas t where t.prova_id = p_prova_id;
    perform privado.premiar_prova(p_prova_id);
  end if;
end;
$$;

revoke all on function public.publicar_notas(bigint, boolean) from public, anon;
grant execute on function public.publicar_notas(bigint, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Aluno: comprar e trocar XP
-- -----------------------------------------------------------------------------
create or replace function privado.exigir_aluno()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := (select auth.uid());
begin
  if v_id is null or not exists (select 1 from public.perfis where id = v_id and papel = 'aluno') then
    raise exception 'A loja é só para alunos.' using errcode = '42501';
  end if;
  return v_id;
end;
$$;

revoke all on function privado.exigir_aluno() from public;

create or replace function public.comprar_peca(p_peca_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aluno uuid := privado.exigir_aluno();
  v_peca public.pecas%rowtype;
  v_saldo integer;
begin
  -- Uma compra por vez para o mesmo aluno (evita gastar a mesma moeda duas vezes).
  perform 1 from public.perfis where id = v_aluno for update;
  select * into v_peca from public.pecas where id = p_peca_id;
  if v_peca.id is null or v_peca.preco is null or not v_peca.na_loja or v_peca.para not in ('todos', 'aluno') then
    raise exception 'Esta peça não está à venda.' using errcode = '22023';
  end if;
  if exists (select 1 from public.compras where aluno_id = v_aluno and peca_id = p_peca_id and devolvida_em is null) then
    raise exception 'Você já tem esta peça.' using errcode = '22023';
  end if;
  v_saldo := privado.saldo_de_moedas(v_aluno);
  if v_saldo < v_peca.preco then
    raise exception 'Faltam % moedas para esta peça.', v_peca.preco - v_saldo using errcode = '22023';
  end if;
  insert into public.compras (aluno_id, peca_id, preco) values (v_aluno, p_peca_id, v_peca.preco);
  return jsonb_build_object('moedas', v_saldo - v_peca.preco);
end;
$$;

revoke all on function public.comprar_peca(text) from public, anon;
grant execute on function public.comprar_peca(text) to authenticated;

create or replace function public.trocar_xp_por_moedas(p_moedas integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aluno uuid := privado.exigir_aluno();
  v_xp integer;
begin
  perform 1 from public.perfis where id = v_aluno for update;
  if p_moedas is null or p_moedas < 1 or p_moedas > 1000 then
    raise exception 'Escolha quantas moedas quer receber.' using errcode = '22023';
  end if;
  v_xp := privado.xp_total(v_aluno);
  if v_xp < p_moedas * 50 then
    raise exception 'Cada moeda custa 50 XP. Você tem % XP.', v_xp using errcode = '22023';
  end if;
  insert into public.moedas_eventos (aluno_id, quantidade, motivo, descricao, xp_trocado)
  values (v_aluno, p_moedas, 'troca', 'Trocou ' || (p_moedas * 50) || ' XP', p_moedas * 50);
  -- A patente pode ter descido: as peças do uniforme dela voltam a trancar.
  perform privado.tirar_pecas_trancadas(v_aluno);
  return jsonb_build_object(
    'moedas', privado.saldo_de_moedas(v_aluno),
    'xp', privado.xp_total(v_aluno),
    'patente', privado.patente_de(privado.xp_total(v_aluno))
  );
end;
$$;

revoke all on function public.trocar_xp_por_moedas(integer) from public, anon;
grant execute on function public.trocar_xp_por_moedas(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Professor: preços, moedas e compras
-- -----------------------------------------------------------------------------
create or replace function public.definir_peca_da_loja(p_peca_id text, p_preco integer, p_na_loja boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  if p_preco is null or p_preco < 1 or p_preco > 9999 then
    raise exception 'O preço vai de 1 a 9999 moedas.' using errcode = '22023';
  end if;
  update public.pecas set preco = p_preco, na_loja = coalesce(p_na_loja, false)
  where id = p_peca_id and preco is not null;
  if not found then
    raise exception 'Esta peça não é da loja.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.definir_peca_da_loja(text, integer, boolean) from public, anon;
grant execute on function public.definir_peca_da_loja(text, integer, boolean) to authenticated;

-- Dar (1 a 10) ou tirar (até 100, sem passar do saldo) moedas, com motivo.
create or replace function public.dar_moedas(p_aluno_id uuid, p_quantidade integer, p_descricao text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_descricao text := trim(coalesce(p_descricao, ''));
  v_saldo integer;
begin
  perform privado.exigir_professor();
  if not exists (select 1 from public.perfis where id = p_aluno_id and papel = 'aluno') then
    raise exception 'Aluno não encontrado.' using errcode = 'P0002';
  end if;
  if p_quantidade is null or p_quantidade = 0 or p_quantidade > 10 or p_quantidade < -100 then
    raise exception 'Dê de 1 a 10 moedas (ou tire até 100).' using errcode = '22023';
  end if;
  if char_length(v_descricao) not between 1 and 200 then
    raise exception 'Escreva o motivo (até 200 caracteres).' using errcode = '22023';
  end if;
  perform 1 from public.perfis where id = p_aluno_id for update;
  v_saldo := privado.saldo_de_moedas(p_aluno_id);
  if p_quantidade < 0 and v_saldo + p_quantidade < 0 then
    raise exception 'O aluno tem só % moedas.', v_saldo using errcode = '22023';
  end if;
  insert into public.moedas_eventos (aluno_id, quantidade, motivo, descricao, dado_por)
  values (p_aluno_id, p_quantidade, 'professor', v_descricao, (select auth.uid()));
  return v_saldo + p_quantidade;
end;
$$;

revoke all on function public.dar_moedas(uuid, integer, text) from public, anon;
grant execute on function public.dar_moedas(uuid, integer, text) to authenticated;

-- Desfazer uma compra: a peça sai do aluno (e do boneco) e as moedas voltam.
create or replace function public.devolver_compra(p_compra_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aluno uuid;
begin
  perform privado.exigir_professor();
  update public.compras set devolvida_em = now(), devolvida_por = (select auth.uid())
  where id = p_compra_id and devolvida_em is null
  returning aluno_id into v_aluno;
  if v_aluno is null then
    raise exception 'Compra não encontrada.' using errcode = 'P0002';
  end if;
  perform privado.tirar_pecas_trancadas(v_aluno);
end;
$$;

revoke all on function public.devolver_compra(bigint) from public, anon;
grant execute on function public.devolver_compra(bigint) to authenticated;

-- Moedas dos alunos aprovados de uma turma (só o professor).
create or replace function public.moedas_da_turma(p_turma_disciplina_id bigint)
returns table (aluno_id uuid, nome text, apelido text, moedas integer, ganhas integer, gastas integer, xp integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  return query
    select p.id, p.nome, p.apelido, privado.saldo_de_moedas(p.id),
      coalesce((select sum(me.quantidade) from public.moedas_eventos me where me.aluno_id = p.id and me.quantidade > 0), 0)::integer,
      coalesce((select sum(c.preco) from public.compras c where c.aluno_id = p.id and c.devolvida_em is null), 0)::integer,
      privado.xp_total(p.id)
    from public.matriculas m
    join public.perfis p on p.id = m.aluno_id
    where m.turma_disciplina_id = p_turma_disciplina_id and m.status = 'aprovado'
    order by p.nome;
end;
$$;

revoke all on function public.moedas_da_turma(bigint) from public, anon;
grant execute on function public.moedas_da_turma(bigint) to authenticated;

-- Últimas compras de todos os alunos (só o professor).
create or replace function public.historico_da_loja(p_limite integer)
returns table (
  compra_id bigint, aluno_id uuid, nome text, apelido text, peca_id text, peca text,
  preco integer, comprada_em timestamptz, devolvida_em timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  return query
    select c.id, p.id, p.nome, p.apelido, pc.id, pc.nome, c.preco, c.comprada_em, c.devolvida_em
    from public.compras c
    join public.perfis p on p.id = c.aluno_id
    join public.pecas pc on pc.id = c.peca_id
    where c.preco > 0
    order by c.comprada_em desc
    limit least(greatest(coalesce(p_limite, 50), 1), 500);
end;
$$;

revoke all on function public.historico_da_loja(integer) from public, anon;
grant execute on function public.historico_da_loja(integer) to authenticated;
