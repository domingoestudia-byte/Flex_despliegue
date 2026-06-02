-- =============================================================
-- TABLAS FALTANTES PARA CONECTAR TODO A SUPABASE
-- =============================================================

-- EVENTOS
create table if not exists public.eventos (
  id          serial primary key,
  titulo      text not null,
  fecha       text not null,
  hora        text,
  lugar       text,
  genero      text,
  precio      text,
  destacado   boolean not null default false,
  creado_en   timestamptz not null default now()
);

-- CANCIONES
create table if not exists public.canciones (
  id          serial primary key,
  titulo      text not null,
  artista     text not null,
  votos       int not null default 0,
  portada_url text,
  estado      text not null default 'cola'
              check (estado in ('sonando', 'cola', 'votacion')),
  creado_en   timestamptz not null default now()
);

-- VOTOS de usuarios a canciones
create table if not exists public.votos_canciones (
  id          bigserial primary key,
  cancion_id  int not null references public.canciones(id) on delete cascade,
  usuario_id  uuid references auth.users(id),
  creado_en   timestamptz not null default now(),
  unique (cancion_id, usuario_id)
);

-- ACTIVIDADES
create table if not exists public.actividades (
  id              serial primary key,
  titulo          text not null,
  descripcion     text,
  hora_inicio     text not null,
  participantes   int not null default 0,
  max_participantes int,
  estado          text not null default 'activo'
                  check (estado in ('activo', 'proximo', 'completado')),
  icono           text not null default 'Mic2',
  destacada       boolean not null default false,
  creado_en       timestamptz not null default now()
);

-- PARTICIPANTES de actividades
create table if not exists public.participantes_actividades (
  id            bigserial primary key,
  actividad_id  int not null references public.actividades(id) on delete cascade,
  usuario_id    uuid references auth.users(id),
  creado_en     timestamptz not null default now(),
  unique (actividad_id, usuario_id)
);

-- ENTRADAS de usuarios
create table if not exists public.entradas (
  id            serial primary key,
  usuario_id    uuid references public.perfiles(id),
  evento        text not null,
  fecha         text not null,
  tipo          text not null default 'General',
  precio        numeric(8,2) not null,
  codigo        text unique not null,
  estado        text not null default 'activa'
                check (estado in ('activa', 'usada', 'cancelada')),
  creado_en     timestamptz not null default now()
);

-- NOTIFICACIONES
create table if not exists public.notificaciones (
  id            bigserial primary key,
  usuario_id    uuid references public.perfiles(id),
  titulo        text not null,
  descripcion   text,
  icono         text not null default 'Bell',
  leida         boolean not null default false,
  creado_en     timestamptz not null default now()
);

-- CONFIGURACIÓN de usuario
create table if not exists public.configuracion_usuario (
  id                  uuid primary key references public.perfiles(id) on delete cascade,
  notificaciones_push boolean not null default true,
  modo_vip            boolean not null default false,
  dark_mode           boolean not null default true,
  marketing           boolean not null default false,
  actualizado_en      timestamptz not null default now()
);

-- =============================================================
-- DATOS DE PRUEBA
-- =============================================================

-- EVENTOS
insert into public.eventos (titulo, fecha, hora, lugar, genero, precio, destacado) values
  ('Jazz Nights', 'Sábado, 25 de mayo', '22:00 - 04:00h', 'Flex Principal', null, null, true);

insert into public.eventos (titulo, fecha, genero, precio) values
  ('Jazz Nights', '25 mayo', 'Jazz / Blues', 'Desde 15 EUR'),
  ('Soul & Blues', '31 mayo', 'Soul / R&B', 'Desde 12 EUR'),
  ('Latin Jazz', '07 jun', 'Latin / Fusion', 'Desde 10 EUR');

-- CANCIONES
insert into public.canciones (titulo, artista, votos, estado) values
  ('Midnight Groove', 'Soul District', 128, 'votacion'),
  ('Deep Velvet', 'Nova Jazz', 96, 'votacion'),
  ('Electric Nights', 'Lounge Avenue', 74, 'votacion'),
  ('Golden Lights', 'The Midnight Club', 52, 'votacion');

insert into public.canciones (titulo, artista, estado) values
  ('Jazz Lounge', 'Miles Carter', 'sonando'),
  ('After Midnight', 'Soul Avenue', 'cola'),
  ('Night Drive', 'Velvet Noise', 'cola'),
  ('City Lights', 'Nova', 'cola');

-- ACTIVIDADES
insert into public.actividades (titulo, descripcion, hora_inicio, participantes, max_participantes, estado, icono, destacada) values
  ('Karaoke Night', 'Sube al escenario y canta tus canciones favoritas frente al club.', '22:30', 18, 30, 'activo', 'Mic2', true),
  ('Beer Pong Tournament', 'Compite en el torneo semanal y gana consumiciones VIP.', '23:15', 24, 32, 'activo', 'Trophy', false),
  ('Retro Arcade', 'Zona arcade abierta toda la noche con ranking en vivo.', '21:00', 12, 20, 'activo', 'Gamepad2', false);

-- ENTRADAS de prueba
insert into public.entradas (usuario_id, evento, fecha, tipo, precio, codigo, estado) values
  (null, 'Jazz Nights', 'Sáb, 25 mayo - 22:00h', 'Pista Principal', 15.00, 'FLEX-2C7B', 'activa');

-- NOTIFICACIONES de prueba
insert into public.notificaciones (usuario_id, titulo, descripcion, icono, leida) values
  (null, 'Tu bebida está lista', 'Puedes recoger tu pedido en la barra principal.', 'Wine', false),
  (null, 'Nueva actividad disponible', 'Karaoke Night acaba de abrir nuevas plazas.', 'Sparkles', false),
  (null, 'Tu canción fue añadida', 'El DJ agregó tu canción a la cola de reproducción.', 'Music2', true),
  (null, 'Reserva VIP confirmada', 'Tu sala VIP estará disponible a las 23:00.', 'Ticket', true);

-- CONFIGURACIÓN por defecto
insert into public.configuracion_usuario (id, notificaciones_push, modo_vip, dark_mode, marketing) values
  (null, true, true, true, false);

-- =============================================================
-- POLÍTICAS RLS
-- =============================================================
ALTER TABLE public.eventos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canciones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_select_anon" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "canciones_select_anon" ON public.canciones FOR SELECT USING (true);
CREATE POLICY "actividades_select_anon" ON public.actividades FOR SELECT USING (true);
CREATE POLICY "entradas_select_anon" ON public.entradas FOR SELECT USING (true);
CREATE POLICY "notificaciones_select_anon" ON public.notificaciones FOR SELECT USING (true);
CREATE POLICY "config_select_anon" ON public.configuracion_usuario FOR SELECT USING (true);
