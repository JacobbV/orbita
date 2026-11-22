-- =============================================================================
-- Apelidos sorteados
-- -----------------------------------------------------------------------------
-- * Cada conta pode ter um apelido feito de um nome + um adjetivo, os dois
--   tirados de listas aprovadas (ex.: "Cometa Veloz", "Estrela Curiosa").
-- * Não existe campo livre: o apelido só nasce do sorteio, então ninguém
--   consegue escrever nome ofensivo ou o próprio nome real.
-- * Nunca há dois apelidos iguais (índice único, sem diferenciar maiúsculas).
-- * O professor pode apagar ou sortear de novo o apelido de qualquer aluno.
-- * Alunos não veem os apelidos uns dos outros (não há ranking).
-- =============================================================================

create table privado.apelido_nomes (
  palavra text primary key check (char_length(palavra) between 2 and 20),
  genero char(1) not null check (genero in ('m', 'f'))
);

create table privado.apelido_adjetivos (
  masculino text primary key check (char_length(masculino) between 2 and 20),
  feminino text not null unique check (char_length(feminino) between 2 and 20)
);

comment on table privado.apelido_nomes is
  'Primeira palavra dos apelidos (espaço, natureza, animais, ciência), com o gênero para a concordância.';
comment on table privado.apelido_adjetivos is
  'Segunda palavra dos apelidos, nas formas masculina e feminina.';

insert into privado.apelido_nomes (palavra, genero) values
  ('Cometa', 'm'),
  ('Quasar', 'm'),
  ('Pulsar', 'm'),
  ('Meteoro', 'm'),
  ('Meteorito', 'm'),
  ('Asteroide', 'm'),
  ('Satélite', 'm'),
  ('Foguete', 'm'),
  ('Eclipse', 'm'),
  ('Órion', 'm'),
  ('Sirius', 'm'),
  ('Planeta', 'm'),
  ('Cosmo', 'm'),
  ('Astro', 'm'),
  ('Átomo', 'm'),
  ('Próton', 'm'),
  ('Nêutron', 'm'),
  ('Elétron', 'm'),
  ('Fóton', 'm'),
  ('Cristal', 'm'),
  ('Diamante', 'm'),
  ('Relâmpago', 'm'),
  ('Trovão', 'm'),
  ('Vulcão', 'm'),
  ('Oceano', 'm'),
  ('Tornado', 'm'),
  ('Ciclone', 'm'),
  ('Furacão', 'm'),
  ('Dragão', 'm'),
  ('Falcão', 'm'),
  ('Lince', 'm'),
  ('Lobo', 'm'),
  ('Tigre', 'm'),
  ('Leão', 'm'),
  ('Golfinho', 'm'),
  ('Polvo', 'm'),
  ('Tucano', 'm'),
  ('Jaguar', 'm'),
  ('Guepardo', 'm'),
  ('Panda', 'm'),
  ('Pinguim', 'm'),
  ('Corvo', 'm'),
  ('Condor', 'm'),
  ('Gavião', 'm'),
  ('Cervo', 'm'),
  ('Urso', 'm'),
  ('Castor', 'm'),
  ('Coala', 'm'),
  ('Camaleão', 'm'),
  ('Grifo', 'm'),
  ('Robô', 'm'),
  ('Androide', 'm'),
  ('Radar', 'm'),
  ('Sonar', 'm'),
  ('Laser', 'm'),
  ('Pixel', 'm'),
  ('Byte', 'm'),
  ('Código', 'm'),
  ('Algoritmo', 'm'),
  ('Circuito', 'm'),
  ('Chip', 'm'),
  ('Teclado', 'm'),
  ('Compasso', 'm'),
  ('Telescópio', 'm'),
  ('Astrolábio', 'm'),
  ('Sextante', 'm'),
  ('Farol', 'm'),
  ('Horizonte', 'm'),
  ('Zênite', 'm'),
  ('Equinócio', 'm'),
  ('Solstício', 'm'),
  ('Magneto', 'm'),
  ('Prisma', 'm'),
  ('Espectro', 'm'),
  ('Bumerangue', 'm'),
  ('Origami', 'm'),
  ('Enigma', 'm'),
  ('Labirinto', 'm'),
  ('Mosaico', 'm'),
  ('Cacto', 'm'),
  ('Bambu', 'm'),
  ('Carvalho', 'm'),
  ('Ipê', 'm'),
  ('Baobá', 'm'),
  ('Girassol', 'm'),
  ('Trevo', 'm'),
  ('Coral', 'm'),
  ('Granito', 'm'),
  ('Quartzo', 'm'),
  ('Rubi', 'm'),
  ('Topázio', 'm'),
  ('Ônix', 'm'),
  ('Âmbar', 'm'),
  ('Titânio', 'm'),
  ('Cobalto', 'm'),
  ('Mercúrio', 'm'),
  ('Netuno', 'm'),
  ('Saturno', 'm'),
  ('Júpiter', 'm'),
  ('Urano', 'm'),
  ('Plutão', 'm'),
  ('Marte', 'm'),
  ('Vento', 'm'),
  ('Raio', 'm'),
  ('Sol', 'm'),
  ('Cometário', 'm'),
  ('Gêiser', 'm'),
  ('Iceberg', 'm'),
  ('Arquipélago', 'm'),
  ('Cânion', 'm'),
  ('Penhasco', 'm'),
  ('Riacho', 'm'),
  ('Bosque', 'm'),
  ('Pomar', 'm'),
  ('Jardim', 'm'),
  ('Trenó', 'm'),
  ('Balão', 'm'),
  ('Dirigível', 'm'),
  ('Planador', 'm'),
  ('Submarino', 'm'),
  ('Veleiro', 'm'),
  ('Catamarã', 'm'),
  ('Caiaque', 'm'),
  ('Mapa', 'm'),
  ('Globo', 'm'),
  ('Mosquetão', 'm'),
  ('Cronômetro', 'm'),
  ('Relógio', 'm'),
  ('Pêndulo', 'm'),
  ('Ímã', 'm'),
  ('Microscópio', 'm'),
  ('Foguetinho', 'm'),
  ('Tamanduá', 'm'),
  ('Quati', 'm'),
  ('Tatu', 'm'),
  ('Mico', 'm'),
  ('Sabiá', 'm'),
  ('Bem-te-vi', 'm'),
  ('Beija-flor', 'm'),
  ('Canário', 'm'),
  ('Pavão', 'm'),
  ('Flamingo', 'm'),
  ('Albatroz', 'm'),
  ('Pelicano', 'm'),
  ('Tubarão', 'm'),
  ('Cavalo-marinho', 'm'),
  ('Caranguejo', 'm'),
  ('Ouriço', 'm'),
  ('Esquilo', 'm'),
  ('Texugo', 'm'),
  ('Lêmure', 'm'),
  ('Ornitorrinco', 'm'),
  ('Nebulosa', 'f'),
  ('Galáxia', 'f'),
  ('Estrela', 'f'),
  ('Lua', 'f'),
  ('Aurora', 'f'),
  ('Órbita', 'f'),
  ('Vega', 'f'),
  ('Andrômeda', 'f'),
  ('Constelação', 'f'),
  ('Supernova', 'f'),
  ('Via-Láctea', 'f'),
  ('Cassiopeia', 'f'),
  ('Lyra', 'f'),
  ('Fênix', 'f'),
  ('Coruja', 'f'),
  ('Raposa', 'f'),
  ('Lontra', 'f'),
  ('Águia', 'f'),
  ('Arara', 'f'),
  ('Gazela', 'f'),
  ('Pantera', 'f'),
  ('Onça', 'f'),
  ('Tartaruga', 'f'),
  ('Libélula', 'f'),
  ('Joaninha', 'f'),
  ('Borboleta', 'f'),
  ('Abelha', 'f'),
  ('Formiga', 'f'),
  ('Salamandra', 'f'),
  ('Água-viva', 'f'),
  ('Orca', 'f'),
  ('Lhama', 'f'),
  ('Zebra', 'f'),
  ('Girafa', 'f'),
  ('Capivara', 'f'),
  ('Ariranha', 'f'),
  ('Jaguatirica', 'f'),
  ('Seriema', 'f'),
  ('Gaivota', 'f'),
  ('Andorinha', 'f'),
  ('Cigarra', 'f'),
  ('Faísca', 'f'),
  ('Centelha', 'f'),
  ('Chama', 'f'),
  ('Brisa', 'f'),
  ('Onda', 'f'),
  ('Maré', 'f'),
  ('Cascata', 'f'),
  ('Cachoeira', 'f'),
  ('Geleira', 'f'),
  ('Montanha', 'f'),
  ('Ilha', 'f'),
  ('Floresta', 'f'),
  ('Savana', 'f'),
  ('Duna', 'f'),
  ('Pérola', 'f'),
  ('Esmeralda', 'f'),
  ('Safira', 'f'),
  ('Ametista', 'f'),
  ('Turmalina', 'f'),
  ('Bússola', 'f'),
  ('Lanterna', 'f'),
  ('Antena', 'f'),
  ('Engrenagem', 'f'),
  ('Turbina', 'f'),
  ('Hélice', 'f'),
  ('Bateria', 'f'),
  ('Matriz', 'f'),
  ('Variável', 'f'),
  ('Função', 'f'),
  ('Lógica', 'f'),
  ('Equação', 'f'),
  ('Fórmula', 'f'),
  ('Espiral', 'f'),
  ('Pirâmide', 'f'),
  ('Esfera', 'f'),
  ('Elipse', 'f'),
  ('Parábola', 'f'),
  ('Sinfonia', 'f'),
  ('Melodia', 'f'),
  ('Harmonia', 'f'),
  ('Odisseia', 'f'),
  ('Jornada', 'f'),
  ('Missão', 'f'),
  ('Expedição', 'f'),
  ('Vênus', 'f'),
  ('Terra', 'f'),
  ('Ceres', 'f'),
  ('Europa', 'f'),
  ('Titânia', 'f'),
  ('Calipso', 'f'),
  ('Nave', 'f'),
  ('Sonda', 'f'),
  ('Cápsula', 'f'),
  ('Estação', 'f'),
  ('Lagoa', 'f'),
  ('Nascente', 'f'),
  ('Clareira', 'f'),
  ('Orquídea', 'f'),
  ('Bromélia', 'f'),
  ('Vitória-régia', 'f'),
  ('Sequoia', 'f'),
  ('Palmeira', 'f'),
  ('Acácia', 'f'),
  ('Magnólia', 'f'),
  ('Tulipa', 'f'),
  ('Hortênsia', 'f'),
  ('Lótus', 'f'),
  ('Pipa', 'f'),
  ('Bicicleta', 'f'),
  ('Locomotiva', 'f'),
  ('Catapulta', 'f'),
  ('Ampulheta', 'f'),
  ('Luneta', 'f'),
  ('Lupa', 'f'),
  ('Bigorna', 'f'),
  ('Flecha', 'f'),
  ('Bandeira', 'f'),
  ('Coroa', 'f'),
  ('Tocha', 'f'),
  ('Tempestade', 'f'),
  ('Neblina', 'f'),
  ('Garoa', 'f'),
  ('Nevasca', 'f'),
  ('Avalanche', 'f'),
  ('Erupção', 'f'),
  ('Rocha', 'f'),
  ('Pedra-lua', 'f'),
  ('Mariposa', 'f'),
  ('Gralha', 'f'),
  ('Garça', 'f'),
  ('Cegonha', 'f'),
  ('Ema', 'f'),
  ('Toupeira', 'f'),
  ('Doninha', 'f'),
  ('Marmota', 'f'),
  ('Chinchila', 'f'),
  ('Iguana', 'f'),
  ('Lagartixa', 'f'),
  ('Jiboia', 'f'),
  ('Arraia', 'f'),
  ('Sardinha', 'f');

insert into privado.apelido_adjetivos (masculino, feminino) values
  ('Veloz', 'Veloz'),
  ('Curioso', 'Curiosa'),
  ('Brilhante', 'Brilhante'),
  ('Cósmico', 'Cósmica'),
  ('Estelar', 'Estelar'),
  ('Lunar', 'Lunar'),
  ('Solar', 'Solar'),
  ('Galáctico', 'Galáctica'),
  ('Radiante', 'Radiante'),
  ('Luminoso', 'Luminosa'),
  ('Ágil', 'Ágil'),
  ('Sábio', 'Sábia'),
  ('Valente', 'Valente'),
  ('Corajoso', 'Corajosa'),
  ('Destemido', 'Destemida'),
  ('Audaz', 'Audaz'),
  ('Astuto', 'Astuta'),
  ('Esperto', 'Esperta'),
  ('Engenhoso', 'Engenhosa'),
  ('Criativo', 'Criativa'),
  ('Gentil', 'Gentil'),
  ('Sereno', 'Serena'),
  ('Tranquilo', 'Tranquila'),
  ('Alegre', 'Alegre'),
  ('Feliz', 'Feliz'),
  ('Animado', 'Animada'),
  ('Sonhador', 'Sonhadora'),
  ('Aventureiro', 'Aventureira'),
  ('Explorador', 'Exploradora'),
  ('Navegante', 'Navegante'),
  ('Errante', 'Errante'),
  ('Misterioso', 'Misteriosa'),
  ('Secreto', 'Secreta'),
  ('Invisível', 'Invisível'),
  ('Silencioso', 'Silenciosa'),
  ('Ligeiro', 'Ligeira'),
  ('Rápido', 'Rápida'),
  ('Elétrico', 'Elétrica'),
  ('Magnético', 'Magnética'),
  ('Atômico', 'Atômica'),
  ('Quântico', 'Quântica'),
  ('Digital', 'Digital'),
  ('Binário', 'Binária'),
  ('Lógico', 'Lógica'),
  ('Infinito', 'Infinita'),
  ('Eterno', 'Eterna'),
  ('Lendário', 'Lendária'),
  ('Épico', 'Épica'),
  ('Heroico', 'Heroica'),
  ('Nobre', 'Nobre'),
  ('Leal', 'Leal'),
  ('Fiel', 'Fiel'),
  ('Atento', 'Atenta'),
  ('Focado', 'Focada'),
  ('Determinado', 'Determinada'),
  ('Persistente', 'Persistente'),
  ('Paciente', 'Paciente'),
  ('Calmo', 'Calma'),
  ('Vibrante', 'Vibrante'),
  ('Dourado', 'Dourada'),
  ('Prateado', 'Prateada'),
  ('Azul', 'Azul'),
  ('Verde', 'Verde'),
  ('Violeta', 'Violeta'),
  ('Escarlate', 'Escarlate'),
  ('Turquesa', 'Turquesa'),
  ('Carmesim', 'Carmesim'),
  ('Cintilante', 'Cintilante'),
  ('Reluzente', 'Reluzente'),
  ('Fulgurante', 'Fulgurante'),
  ('Flamejante', 'Flamejante'),
  ('Gélido', 'Gélida'),
  ('Polar', 'Polar'),
  ('Tropical', 'Tropical'),
  ('Selvagem', 'Selvagem'),
  ('Livre', 'Livre'),
  ('Voador', 'Voadora'),
  ('Saltitante', 'Saltitante'),
  ('Dançante', 'Dançante'),
  ('Risonho', 'Risonha'),
  ('Sorridente', 'Sorridente'),
  ('Brincalhão', 'Brincalhona'),
  ('Inventivo', 'Inventiva'),
  ('Genial', 'Genial'),
  ('Incansável', 'Incansável'),
  ('Imparável', 'Imparável'),
  ('Invencível', 'Invencível'),
  ('Supersônico', 'Supersônica'),
  ('Noturno', 'Noturna'),
  ('Matinal', 'Matinal'),
  ('Celeste', 'Celeste'),
  ('Sideral', 'Sideral'),
  ('Orbital', 'Orbital'),
  ('Interestelar', 'Interestelar'),
  ('Intergaláctico', 'Intergaláctica'),
  ('Mágico', 'Mágica'),
  ('Encantado', 'Encantada'),
  ('Lúcido', 'Lúcida'),
  ('Firme', 'Firme'),
  ('Forte', 'Forte'),
  ('Resiliente', 'Resiliente'),
  ('Generoso', 'Generosa'),
  ('Amigável', 'Amigável'),
  ('Simpático', 'Simpática'),
  ('Carismático', 'Carismática'),
  ('Divertido', 'Divertida'),
  ('Pensativo', 'Pensativa'),
  ('Observador', 'Observadora'),
  ('Sagaz', 'Sagaz'),
  ('Perspicaz', 'Perspicaz'),
  ('Visionário', 'Visionária'),
  ('Pioneiro', 'Pioneira'),
  ('Original', 'Original'),
  ('Único', 'Única'),
  ('Raro', 'Rara'),
  ('Precioso', 'Preciosa'),
  ('Cristalino', 'Cristalina'),
  ('Colorido', 'Colorida'),
  ('Furtivo', 'Furtiva'),
  ('Discreto', 'Discreta'),
  ('Organizado', 'Organizada'),
  ('Cuidadoso', 'Cuidadosa'),
  ('Dedicado', 'Dedicada'),
  ('Estudioso', 'Estudiosa'),
  ('Atencioso', 'Atenciosa'),
  ('Ventoso', 'Ventosa'),
  ('Estrelado', 'Estrelada'),
  ('Iluminado', 'Iluminada'),
  ('Ensolarado', 'Ensolarada'),
  ('Brilhoso', 'Brilhosa'),
  ('Faiscante', 'Faiscante'),
  ('Saltador', 'Saltadora'),
  ('Mergulhador', 'Mergulhadora'),
  ('Escalador', 'Escaladora'),
  ('Corredor', 'Corredora'),
  ('Construtor', 'Construtora'),
  ('Programador', 'Programadora'),
  ('Calculista', 'Calculista'),
  ('Matemático', 'Matemática'),
  ('Musical', 'Musical'),
  ('Poético', 'Poética'),
  ('Artístico', 'Artística'),
  ('Harmonioso', 'Harmoniosa'),
  ('Valoroso', 'Valorosa'),
  ('Triunfante', 'Triunfante'),
  ('Campeão', 'Campeã'),
  ('Primeiro', 'Primeira'),
  ('Supremo', 'Suprema'),
  ('Sereníssimo', 'Sereníssima'),
  ('Andarilho', 'Andarilha'),
  ('Viajado', 'Viajada'),
  ('Desbravador', 'Desbravadora'),
  ('Inquieto', 'Inquieta'),
  ('Esperançoso', 'Esperançosa'),
  ('Otimista', 'Otimista');

-- -----------------------------------------------------------------------------
-- Todas as combinações possíveis (nome + adjetivo na concordância certa)
-- -----------------------------------------------------------------------------
create view privado.apelidos_possiveis as
  select n.palavra || ' ' || case n.genero when 'f' then a.feminino else a.masculino end as apelido
  from privado.apelido_nomes n
  cross join privado.apelido_adjetivos a;

-- -----------------------------------------------------------------------------
-- O apelido mora no perfil
-- -----------------------------------------------------------------------------
alter table public.perfis add column apelido text;

create unique index perfis_apelido_unico on public.perfis (lower(apelido));

comment on column public.perfis.apelido is
  'Apelido sorteado (lista aprovada). Só muda pelas funções de apelido, nunca por update direto.';

-- Rede de segurança: mesmo por SQL, só entra apelido que vem das listas.
create or replace function privado.apelido_da_lista()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.apelido is not null and not exists (
    select 1 from privado.apelidos_possiveis where apelido = new.apelido
  ) then
    raise exception 'Esse apelido não está na lista aprovada.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger apelido_da_lista
  before insert or update of apelido on public.perfis
  for each row execute function privado.apelido_da_lista();

-- -----------------------------------------------------------------------------
-- Sorteio: uma combinação que ninguém usa
-- Primeiro tenta algumas vezes ao acaso (rápido); se a sorte não ajudar,
-- procura entre as livres. Devolve null só se a lista inteira estiver usada.
-- -----------------------------------------------------------------------------
create or replace function privado.apelido_livre(p_evitar text default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_apelido text;
begin
  for i in 1..20 loop
    select n.palavra || ' ' || case n.genero when 'f' then a.feminino else a.masculino end
      into v_apelido
      from (select * from privado.apelido_nomes order by random() limit 1) n
      cross join (select * from privado.apelido_adjetivos order by random() limit 1) a;
    if v_apelido is distinct from p_evitar
       and not exists (select 1 from public.perfis where lower(apelido) = lower(v_apelido)) then
      return v_apelido;
    end if;
  end loop;

  select p.apelido into v_apelido
    from privado.apelidos_possiveis p
    where p.apelido is distinct from p_evitar
      and not exists (select 1 from public.perfis u where lower(u.apelido) = lower(p.apelido))
    order by random()
    limit 1;
  return v_apelido;
end;
$$;

revoke all on function privado.apelido_livre(text) from public;

-- Sugere um apelido livre (não grava nada). O aluno sorteia quantas vezes quiser.
create or replace function public.sortear_apelido(p_evitar text default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para sortear um apelido.'
      using errcode = 'insufficient_privilege';
  end if;
  return privado.apelido_livre(p_evitar);
end;
$$;

revoke all on function public.sortear_apelido(text) from public, anon;
grant execute on function public.sortear_apelido(text) to authenticated;

-- Grava o apelido escolhido entre os sorteados. Só aceita combinações da lista.
create or replace function public.escolher_apelido(p_apelido text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_apelido text := trim(p_apelido);
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para escolher um apelido.'
      using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from privado.apelidos_possiveis where apelido = v_apelido) then
    raise exception 'Esse apelido não está na lista. Use o botão Sortear.'
      using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.perfis
    where lower(apelido) = lower(v_apelido) and id <> (select auth.uid())
  ) then
    raise exception 'Alguém acabou de pegar esse apelido. Sorteie outro.'
      using errcode = 'unique_violation';
  end if;

  update public.perfis set apelido = v_apelido where id = (select auth.uid());
  return v_apelido;
exception
  when unique_violation then
    raise exception 'Alguém acabou de pegar esse apelido. Sorteie outro.'
      using errcode = 'unique_violation';
end;
$$;

revoke all on function public.escolher_apelido(text) from public, anon;
grant execute on function public.escolher_apelido(text) to authenticated;

-- Professor: sorteia um apelido novo para um aluno (troca o atual).
create or replace function public.sortear_apelido_do_aluno(p_perfil uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atual text;
  v_novo text;
begin
  if not (select privado.eh_professor()) then
    raise exception 'Só o professor pode trocar o apelido de um aluno.'
      using errcode = 'insufficient_privilege';
  end if;
  select apelido into v_atual from public.perfis where id = p_perfil;
  if not found then
    raise exception 'Conta não encontrada.' using errcode = 'no_data_found';
  end if;
  v_novo := privado.apelido_livre(v_atual);
  update public.perfis set apelido = v_novo where id = p_perfil;
  return v_novo;
end;
$$;

revoke all on function public.sortear_apelido_do_aluno(uuid) from public, anon;
grant execute on function public.sortear_apelido_do_aluno(uuid) to authenticated;

-- Professor: apaga o apelido de um aluno (ele pode sortear outro depois).
create or replace function public.apagar_apelido(p_perfil uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select privado.eh_professor()) then
    raise exception 'Só o professor pode apagar o apelido de um aluno.'
      using errcode = 'insufficient_privilege';
  end if;
  update public.perfis set apelido = null where id = p_perfil;
  if not found then
    raise exception 'Conta não encontrada.' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke all on function public.apagar_apelido(uuid) from public, anon;
grant execute on function public.apagar_apelido(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- O cartão "Comandante da nave" passa a mostrar o apelido do professor
-- -----------------------------------------------------------------------------
drop function public.professor_da_nave();

create function public.professor_da_nave()
returns table (nome text, apelido text, escolhas jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    (select privado.eh_professor())
    or exists (select 1 from public.matriculas where aluno_id = (select auth.uid()) and status = 'aprovado')
  ) then
    return;
  end if;
  return query
    select p.nome, p.apelido, a.escolhas
    from public.perfis p
    left join public.avatares a on a.perfil_id = p.id
    where p.papel = 'professor'
    order by p.criado_em
    limit 1;
end;
$$;

revoke all on function public.professor_da_nave() from public, anon;
grant execute on function public.professor_da_nave() to authenticated;

-- -----------------------------------------------------------------------------
-- XP da turma (painel do professor) passa a trazer o apelido de cada aluno
-- -----------------------------------------------------------------------------
drop function public.xp_da_turma(bigint);

create function public.xp_da_turma(p_turma_disciplina_id bigint)
returns table (aluno_id uuid, nome text, apelido text, xp integer, patente text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_professor();
  return query
    select p.id, p.nome, p.apelido, privado.xp_total(p.id),
      privado.patente_de(privado.xp_total(p.id))
    from public.matriculas m
    join public.perfis p on p.id = m.aluno_id
    where m.turma_disciplina_id = p_turma_disciplina_id and m.status = 'aprovado'
    order by p.nome;
end;
$$;

revoke all on function public.xp_da_turma(bigint) from public, anon;
grant execute on function public.xp_da_turma(bigint) to authenticated;
