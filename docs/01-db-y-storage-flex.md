# 01 — Base de Datos y Storage en Supabase

> **Proyecto Flex** · Stack: Next.js · Supabase · Zustand · Stripe  
> Nivel: Principiante-Intermedio

---

## Introducción: qué vamos a hacer en esta primera parte

Antes de escribir una sola línea de Next, necesitamos resolver la pregunta más importante de cualquier aplicación: **¿cómo y dónde viven los datos?**

En este apunte vamos a:

1. Levantar Supabase en tu máquina local usando Docker, para poder desarrollar sin depender de internet ni de una cuenta de pago.
2. Diseñar el esquema completo de la base de datos de Flex: qué tablas necesitamos, qué columnas tienen, y cómo se relacionan entre sí.
3. Entender a fondo cada decisión de diseño: por qué usamos ciertos tipos de datos, por qué ponemos ciertas restricciones, y qué pasaría si no lo hiciéramos.
4. Configurar Supabase Storage para gestionar imágenes, y aprender cómo guardar la URL de esas imágenes en la base de datos para poder mostrarlas desde el frontend.

Al final del apunte tendrás la base de datos completamente operativa en local, lista para conectar con Next.js en los siguientes apuntes.

---

## 1. Supabase en local con Docker (Windows)

### ¿Por qué trabajar en local?

Cuando trabajamos en local, los cambios en la base de datos son instantáneos, gratuitos y no afectan a ningún usuario real. Es el entorno perfecto para experimentar, romper cosas y aprender sin consecuencias.

Supabase tiene una CLI oficial que levanta **toda la plataforma en tu máquina** dentro de contenedores Docker: la base de datos PostgreSQL, el sistema de autenticación, el servidor de Storage, el panel de administración… todo.

### Requisitos previos

Necesitas tener instalado:

- **Docker Desktop para Windows** — [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)  
  Durante la instalación, asegúrate de activar la opción **"Use WSL 2 based engine"** si te la ofrece. Es más rápido y estable.
- **Node.js 18 o superior** — [nodejs.org](https://nodejs.org)

Verifica que Docker está funcionando abriendo una terminal y ejecutando:

```bash
docker --version
# Docker version 24.x.x, build ...
```

Si ves la versión, Docker está listo.

### Usar la CLI de Supabase con `npx`

No necesitamos instalar nada de forma global. Usamos `npx`, que viene incluido con Node.js y ejecuta la CLI de Supabase directamente desde internet sin instalarla permanentemente en tu máquina.

```bash
# npx descarga y ejecuta la CLI en el momento. La primera vez tarda un poco.
npx supabase --version
# 1.x.x
```

> Todos los comandos de Supabase los ejecutaremos con el prefijo `npx`. Si en alguna documentación oficial ves `supabase start`, en nuestro caso será `npx supabase start`.

### Inicializar Supabase en el proyecto

Crea una carpeta para el proyecto y, dentro de ella:

```bash
# Esto crea la carpeta supabase/ con la configuración inicial
npx supabase init
```

Verás que se crea una carpeta `supabase/` con esta estructura:

```
supabase/
  config.toml      ← configuración del proyecto local
  seed.sql         ← datos iniciales (lo rellenaremos después)
  migrations/      ← aquí irán los archivos SQL con los cambios de la DB
```

### Arrancar Supabase en local

```bash
npx supabase start
```

Este comando descarga las imágenes Docker la primera vez (puede tardar varios minutos) y levanta todos los servicios. Cuando termine, verás algo así en la terminal:

```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
  S3 Storage URL: http://localhost:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Guarda estos valores. Ahora mismo son los más importantes:

| Valor | Para qué sirve |
|---|---|
| `API URL` | La URL base de Supabase (va a `.env.local`) |
| `anon key` | La clave pública (va a `.env.local`) |
| `service_role key` | La clave de admin, **solo en el servidor** |
| `Studio URL` | El panel visual de la DB (como phpMyAdmin pero mejor) |

### Posible error en Windows: puerto ocupado

En Windows es frecuente que `npx supabase start` falle con un error similar a:

```
Error: failed to start docker container: ... port is already allocated
```

o bien que algún servicio no arranque porque el puerto ya está en uso por otro proceso del sistema.

**Causa:** Windows tiene varios servicios propios (Hyper-V, IIS, SQL Server, etc.) que pueden ocupar los puertos por defecto de Supabase (54321, 54322, 54323…).

**Solución:** cambiar los puertos en `supabase/config.toml`. Busca las líneas `port =` de cada servicio y asígnales valores distintos. Por ejemplo:

```toml
# supabase/config.toml

[api]
port = 57321      # cambia 54321 → 57321 (o cualquier puerto libre)

[db]
port = 57322
shadow_port = 57320

[studio]
port = 57323

[inbucket]
port = 57324
```

Después de guardar el archivo, vuelve a ejecutar:

```bash
npx supabase start
```

Recuerda actualizar también el valor `NEXT_PUBLIC_SUPABASE_URL` en `.env.local` si cambias el puerto de la API:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:57321
```

---

### Crear el archivo `.env.local`

En la raíz de tu proyecto Next.js crea el archivo `.env.local`:

```bash
# .env.local  ←  NUNCA subas este archivo a Git
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **¿Por qué `NEXT_PUBLIC_` en algunas y en otras no?**  
> Las variables con ese prefijo las incluye Next.js en el código que se envía al navegador. Cualquier usuario puede verlas. La `anon key` es pública por diseño (tiene permisos muy limitados). La `service_role key` tiene permisos totales, así que **nunca** debe ir en el cliente.

Verifica que `.env.local` está en tu `.gitignore`:

```bash
# .gitignore
.env.local
.env*.local
```

### Abrir el panel de Supabase (Studio)

Abre en el navegador: `http://localhost:54323`

Verás el panel de administración completo. Desde aquí podrás ejecutar SQL, ver las tablas, gestionar usuarios, Storage, etc. Úsalo constantemente mientras aprendes: es la forma más visual de entender qué está pasando en la base de datos.

### Comandos útiles del día a día

```bash
npx supabase start    # arranca todos los servicios
npx supabase stop     # para todos los servicios (conserva los datos)
npx supabase status   # muestra las URLs y estado actual
npx supabase db reset # borra la DB y vuelve a aplicar las migraciones desde cero
```

`npx supabase db reset` es tu mejor amigo cuando algo sale mal durante el desarrollo. Borra todo y empieza de cero aplicando los archivos SQL de la carpeta `migrations/`.

---

## 2. El modelo de datos de Flex: razonamiento previo

Antes de escribir una sola línea de SQL, vamos a pensar en las **entidades** del negocio y cómo se relacionan. Este paso es el más importante del diseño de una base de datos.

### El local físico

```
Flex Underground
│
├── Planta Baja  ←─ mesas normales, los clientes piden consumiciones
│
└── Planta Alta
    ├── Sala VIP 1  ←─ se reservan con pago anticipado (Stripe)
    ├── Sala VIP 2
    └── Sala VIP 3
```

### Las entidades y sus relaciones

Pensemos en los "sustantivos" de la aplicación: qué cosas existen en Flex y cómo se conectan entre sí.

```
                         ┌─────────────┐
                         │  auth.users │  ← gestiona Supabase Auth
                         └──────┬──────┘
                                │ extiende (1 a 1)
                         ┌──────▼──────┐
                         │   perfiles  │  ← nombre, rol (cliente/staff/admin)
                         └──────┬──────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                                   │
       hace pedidos                         hace reservas
              │                                   │
       ┌──────▼──────┐                    ┌───────▼──────┐
       │   pedidos   │                    │   reservas   │
       └──────┬──────┘                    └───────┬──────┘
              │                                   │
    tiene líneas (items)                    en una sala
              │                                   │
    ┌─────────▼────────┐              ┌───────────▼──────┐
    │   pedido_items   │              │    salas_vip      │
    └─────────┬────────┘              └──────────────────┘
              │
      referencia a producto
              │
       ┌──────▼──────┐
       │  productos  │
       └─────────────┘

       pedidos también referencia:
       ┌──────▼──────┐
       │    mesas    │  ← numero + piso (1 o 2)
       └─────────────┘
```

**Relaciones clave:**

- Un `perfil` puede tener muchos `pedidos` → relación **uno a muchos**
- Un `perfil` puede tener muchas `reservas` → relación **uno a muchos**
- Un `pedido` tiene muchos `pedido_items` → relación **uno a muchos**
- Un `pedido_item` referencia un `producto` → relación **muchos a uno**
- Una `reserva` referencia una `sala_vip` → relación **muchos a uno**
- Una `mesa` pertenece a un piso → dato embebido en la tabla `mesas`

### ¿Por qué no meter todo en una sola tabla?

Es la pregunta que surge siempre. Si metemos los productos dentro de `pedido_items` como texto, ¿no sería más sencillo? No, por varias razones:

- **Consistencia:** Si el producto "Cerveza" cambia de nombre, tendríamos que actualizar cientos de filas en `pedido_items`. Con una referencia, solo cambiamos una fila en `productos`.
- **Integridad:** La base de datos puede garantizar que no puedes pedir un producto que no existe.
- **Consultas:** Podemos hacer estadísticas como "¿cuál es el producto más pedido?" de forma eficiente.

---

## 3. Esquema SQL: tabla por tabla

Vamos a crear las tablas en un archivo de migración. En Supabase local, las migraciones son archivos SQL que se aplican en orden alfabético por nombre de archivo (el timestamp del inicio los ordena).

En Flex usamos **dos migraciones separadas**:

```
supabase/migrations/
  20260513160558_esquema_inicial.sql   ← tablas, trigger, datos + ENABLE RLS
  20260513160559_politicas_rls.sql     ← función mi_rol() + políticas de acceso
```

Para crearlas:

```bash
npx supabase migration new esquema_inicial
npx supabase migration new politicas_rls
```

**¿Por qué dos archivos?** Las tablas son estructura permanente; las políticas son reglas de negocio que cambian con frecuencia. Separar ambas cosas hace que los diffs sean más limpios y que sea fácil actualizar la seguridad sin tocar el esquema. Lo que sí va en el esquema inicial es activar RLS tabla a tabla (`ENABLE ROW LEVEL SECURITY`), porque es un atributo de la tabla: sin ese flag, las políticas del segundo archivo no tendrían ningún efecto.

Abre `_esquema_inicial.sql` y añade el SQL de los siguientes apartados en orden.

---

### 3.1 Extensión necesaria: `btree_gist`

Lo primero de todo, antes de crear ninguna tabla, necesitamos activar esta extensión de PostgreSQL:

```sql
create extension if not exists btree_gist;
```

**¿Qué es una extensión de PostgreSQL?**  
PostgreSQL tiene un sistema de extensiones que permite añadir funcionalidades que no vienen activadas por defecto. `btree_gist` añade soporte para un tipo especial de índice que necesitaremos más adelante para evitar reservas solapadas. Si intentamos crear la tabla de reservas sin esta extensión, SQL nos dará un error. La activamos primero para no tener que volver.

---

### 3.2 Tabla `perfiles`

```sql
create table public.perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  rol        text not null default 'cliente'
             check (rol in ('cliente', 'staff', 'admin')),
  avatar_url text,
  creado_en  timestamptz not null default now()
);
```

Vamos columna a columna:

---

**`id uuid primary key references auth.users(id) on delete cascade`**

Hay tres conceptos aquí. Los explicamos uno por uno.

**`uuid`** es un tipo de dato. UUID significa *Universally Unique Identifier* y tiene este aspecto: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`. Es un identificador de 128 bits generado de forma aleatoria. La probabilidad de que se generen dos UUIDs iguales es tan pequeña que en la práctica se considera imposible.

¿Por qué UUID y no un número entero (`1, 2, 3...`)? Supabase Auth ya genera UUIDs para sus usuarios internamente. Si usáramos números enteros en `perfiles`, tendríamos que sincronizar manualmente los IDs con `auth.users`. Al usar el mismo UUID, un registro en `perfiles` con `id = 'abc...'` corresponde exactamente al usuario en `auth.users` con ese mismo ID.

**`references auth.users(id)`** es una **clave foránea** (*foreign key*). Le dice a PostgreSQL: "el valor de esta columna `id` debe existir obligatoriamente en la columna `id` de la tabla `auth.users`". Esto garantiza la integridad de los datos: no podemos tener un perfil sin usuario, ni un usuario sin perfil (si usamos el trigger del siguiente apartado).

**`on delete cascade`** define qué pasa si el usuario padre es eliminado. `cascade` significa "eliminar en cascada": si borramos el usuario de `auth.users`, PostgreSQL borra automáticamente su fila en `perfiles`. Alternativas que podrías usar:
- `on delete restrict` — impide borrar el usuario si tiene un perfil (da error).
- `on delete set null` — pone el campo a `null` en lugar de borrar la fila.
- Sin nada (por defecto) — también da error si intentas borrar el padre.

Para `perfiles` la cascada tiene sentido: si un usuario se da de baja, sus datos personales deben desaparecer.

---

**`rol text not null default 'cliente' check (rol in ('cliente', 'staff', 'admin'))`**

Tres restricciones en una sola línea:

- `not null` — la columna no puede estar vacía. Toda fila debe tener un rol.
- `default 'cliente'` — si no especificamos un rol al insertar, PostgreSQL pone `'cliente'` automáticamente. Así cuando alguien se registra, es cliente por defecto.
- `check (rol in ('cliente', 'staff', 'admin'))` — esta es una **restricción CHECK**. Le dice a PostgreSQL que solo acepte esos tres valores exactos. Si alguien intentara insertar `rol = 'superusuario'`, la base de datos devolvería un error. Es como una validación, pero a nivel de base de datos: no depende de que el frontend lo valide bien.

---

**El trigger `on_auth_user_created`: automatizar la creación del perfil**

Antes de ver el código, entendamos el problema que resuelve.

Cuando alguien se registra en la app, Supabase Auth crea automáticamente una fila en su tabla interna `auth.users`. Esa tabla la gestiona Supabase: nosotros no la tocamos. El problema es que nuestra tabla `perfiles` es propia: la hemos creado nosotros y Supabase Auth no sabe que existe.

Sin ningún mecanismo extra, el flujo sería:

```
Usuario se registra
       ↓
Supabase Auth crea fila en auth.users  ✅
       ↓
Nuestra tabla 'perfiles'... nada.  ❌ (habría que hacerlo a mano desde el frontend)
```

Si lo hacemos desde el frontend y el usuario cierra el navegador justo en ese momento, o hay un error de red, el perfil nunca se crearía. Tendríamos un usuario en `auth.users` sin perfil, y la app fallaría al intentar leer su nombre o rol.

La solución es un **trigger**: una instrucción que le dice a PostgreSQL *"cuando ocurra este evento en esta tabla, ejecuta automáticamente esta función"*. Es como una alarma: se dispara sola cuando se cumple la condición.

El trigger que necesitamos: *"cuando se inserte una fila en `auth.users`, inserta también una fila en `perfiles`"*.

Para crear un trigger en PostgreSQL necesitamos dos cosas:

1. **Una función** que contiene la lógica a ejecutar.
2. **El trigger en sí**, que asocia esa función a un evento concreto de una tabla.

**Paso 1: la función**

```sql
-- 'create or replace function' crea la función, o la reemplaza si ya existe.
-- Así podemos modificarla sin tener que borrarla primero.
create or replace function public.handle_new_user()

-- Esta función no recibe parámetros normales; en su lugar recibe datos del trigger.
-- 'returns trigger' indica que es una función especial diseñada para ser usada por un trigger.
returns trigger

-- 'language plpgsql' significa que está escrita en PL/pgSQL,
-- que es como SQL pero con estructuras de programación (if, loops, variables...).
language plpgsql

-- 'security definer' es importante: hace que la función se ejecute con los permisos
-- del usuario que la CREÓ (normalmente 'postgres', el superadmin de la DB),
-- NO con los permisos del usuario que disparó el evento.
-- Lo necesitamos porque auth.users es una tabla interna de Supabase a la que
-- los usuarios normales no tienen acceso. Sin esto, la función fallaría por permisos.
security definer

-- El cuerpo de la función va entre $$ y $$. Es solo un delimitador de texto,
-- como las comillas, pero que permite usar comillas normales dentro sin escaparlas.
as $$
begin
  -- Aquí está la lógica: insertar una fila en nuestra tabla perfiles.
  --
  -- 'new' es una variable especial que solo existe dentro de funciones de trigger.
  -- Contiene la fila que acaba de ser insertada (la fila nueva de auth.users).
  -- Podemos acceder a cualquier columna de esa fila con 'new.nombre_columna'.
  --
  -- new.id → el UUID del nuevo usuario
  -- new.raw_user_meta_data → una columna JSON de auth.users con datos extra del usuario
  -- ->>'nombre' → extrae el campo 'nombre' de ese JSON como texto
  --
  -- Si el usuario se registró sin proporcionar nombre, raw_user_meta_data->>'nombre'
  -- devolverá null, y 'nombre' quedará null (lo permitimos, sin not null en esa columna).
  insert into public.perfiles (id, nombre)
  values (new.id, new.raw_user_meta_data->>'nombre');

  -- Las funciones de trigger deben devolver algo. En triggers AFTER INSERT,
  -- devolver 'new' es la convención estándar (aunque aquí no tiene efecto real).
  return new;
end;
$$;
```

**Paso 2: el trigger**

```sql
-- Ahora asociamos la función a un evento concreto.
create trigger on_auth_user_created   -- nombre del trigger (lo elegimos nosotros)
  after insert                         -- se dispara DESPUÉS de un INSERT (no antes)
  on auth.users                        -- en esta tabla específica
  for each row                         -- una vez por cada fila insertada
  execute procedure public.handle_new_user();  -- llama a nuestra función
```

Con esto, el flujo queda así:

```
Usuario se registra
       ↓
Supabase Auth crea fila en auth.users  ✅
       ↓  (trigger se dispara automáticamente)
PostgreSQL ejecuta handle_new_user()
       ↓
Se inserta fila en public.perfiles     ✅
```

La lógica vive dentro de la base de datos: no importa si el frontend falla, si hay un error de red, o si el usuario cierra la app. Si hay usuario, hay perfil, siempre.

---

### 3.3 Tabla `mesas`

```sql
create table public.mesas (
  id        serial primary key,
  numero    int not null,
  piso      smallint not null check (piso in (1, 2)),
  capacidad int not null default 4,
  activa    boolean not null default true,
  unique (numero, piso)
);
```

**`piso smallint not null check (piso in (1, 2))`**

`smallint` es un entero pequeño que ocupa 2 bytes y acepta valores entre -32768 y 32767. Para un piso de un edificio con valores 1 y 2, es más que suficiente. Usar `smallint` en lugar de `int` (4 bytes) o `bigint` (8 bytes) es buena práctica cuando sabemos que el rango de valores es pequeño: ahorra espacio en disco e índices más compactos.

El `check (piso in (1, 2))` funciona igual que en `perfiles.rol`: solo acepta esos valores. Si añadimos una planta nueva en el futuro, tendremos que hacer `ALTER TABLE mesas DROP CONSTRAINT ...; ALTER TABLE mesas ADD CONSTRAINT ...;` para actualizar la restricción.

**`unique (numero, piso)`**  
Esta restricción dice que la combinación de `numero` y `piso` debe ser única. Es decir, no puede haber dos mesas con el mismo número en el mismo piso. Sin embargo, sí puede existir la "mesa 1 del piso 1" y la "mesa 1 del piso 2", porque son combinaciones distintas.

```sql
insert into public.mesas (numero, piso, capacidad) values
  (1,1,4),(2,1,4),(3,1,6),(4,1,4),(5,1,2),
  (6,1,4),(7,1,4),(8,1,6),(9,1,4),(10,1,2),
  (1,2,4),(2,2,4),(3,2,4),(4,2,4),(5,2,6),(6,2,6);
```

---

### 3.4 Tabla `productos`

```sql
create table public.productos (
  id          serial primary key,
  nombre      text not null,
  descripcion text,
  precio      numeric(8,2) not null,
  categoria   text not null default 'bebida'
              check (categoria in ('bebida', 'comida', 'pack')),
  imagen_url  text,
  disponible  boolean not null default true,
  creado_en   timestamptz not null default now()
);
```

**`numeric(8,2)`** — este tipo de dato guarda números decimales con precisión exacta. El `8` es el total de dígitos y el `2` son los decimales. `numeric(8,2)` puede guardar valores hasta `999999.99`. Para precios, **nunca uses `float` o `real`**: son números de coma flotante en binario y tienen errores de precisión (el clásico `0.1 + 0.2 = 0.30000000000000004`). Con `numeric` el cálculo `0.10 + 0.20` da exactamente `0.30`.

**`serial`** — es un atajo de PostgreSQL para crear una columna entera autoincremental. Cuando insertas una fila sin especificar el `id`, PostgreSQL asigna automáticamente el siguiente número disponible (1, 2, 3…).

---

### 3.5 Tablas `pedidos` y `pedido_items`

```sql
create table public.pedidos (
  id          bigserial primary key,
  mesa_id     int references public.mesas(id),
  cliente_id  uuid references public.perfiles(id),
  estado      text not null default 'pendiente'
              check (estado in ('pendiente','en_barra','listo','entregado','cancelado')),
  total       numeric(8,2),
  creado_en   timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

create table public.pedido_items (
  id          bigserial primary key,
  pedido_id   bigint not null references public.pedidos(id) on delete cascade,
  producto_id int not null references public.productos(id),
  cantidad    int not null default 1 check (cantidad > 0),
  precio_unit numeric(8,2) not null
);
```

**`bigserial` vs UUID: ¿por qué no usamos UUID aquí?**

Esta es una de las decisiones de diseño más frecuentes y hay argumentos para ambos lados. Vamos a entenderlo bien.

`serial` y `bigserial` son enteros autoincrementales. La diferencia es el tamaño:
- `serial` → `integer` de 4 bytes, máximo ~2.100 millones de valores.
- `bigserial` → `bigint` de 8 bytes, máximo ~9.200 billones de valores.

Para `pedidos` usamos `bigserial` porque en un local con mucho movimiento podríamos llegar a millones de pedidos a lo largo de los años, y queremos margen.

¿Por qué no UUID para los pedidos? Principalmente rendimiento. Los UUID son cadenas de 36 caracteres. Cuando PostgreSQL construye un índice sobre una clave primaria UUID, cada nodo del índice es mucho más grande que con un entero. Para tablas con millones de filas (pedidos, ítems), los enteros son significativamente más rápidos en búsquedas y joins.

En cambio, para `perfiles` **sí** usamos UUID porque necesitamos que el `id` coincida exactamente con el UUID que genera Supabase Auth. No tenemos opción: debemos reutilizar ese identificador.

**Regla práctica:**
- Usa `uuid` cuando el ID viene de fuera (Auth, un sistema externo) o cuando la tabla es pequeña y la seguridad importa más que el rendimiento (no puedes adivinar el ID del siguiente registro).
- Usa `bigserial` cuando la tabla crece rápido y los registros solo se crean internamente.

---

**`on delete cascade` en `pedido_items`**

```sql
pedido_id bigint not null references public.pedidos(id) on delete cascade
```

Si borramos un `pedido`, queremos que sus `pedido_items` se borren también automáticamente. Tiene todo el sentido: un ítem sin pedido padre no sirve para nada y ocuparía espacio en la DB indefinidamente.

Compáralo con la relación entre `pedido_items` y `productos`:

```sql
producto_id int not null references public.productos(id)
-- Sin 'on delete cascade'
```

Aquí **no** queremos cascade. Si eliminamos el producto "Coca-Cola" del menú, no tiene sentido borrar todos los pedidos históricos que contenían ese producto. Queremos conservar el historial. Al no poner `on delete cascade`, PostgreSQL nos impediría borrar un producto si tiene ítems asociados, obligándonos a pensar en qué hacer (podríamos cambiar `disponible = false` en lugar de borrar).

---

**¿Por qué guardar `precio_unit`?**

El precio de un producto puede cambiar. Si solo guardamos `producto_id`, dentro de seis meses no sabremos cuánto cobró el sistema en ese pedido. Con el snapshot del precio en el momento de la compra, el historial es inmutable y los informes financieros serán siempre correctos.

---

### 3.6 Tabla `salas_vip`

```sql
create table public.salas_vip (
  id          serial primary key,
  nombre      text not null,
  descripcion text,
  capacidad   int not null default 10,
  precio_hora numeric(8,2) not null,
  imagen_url  text,
  activa      boolean not null default true
);

insert into public.salas_vip (nombre, descripcion, capacidad, precio_hora) values
  ('Sala Roja',  'Ambiente íntimo con equipo de sonido Marshall',  8, 80.00),
  ('Sala Negra', 'Escenario propio + luces de discoteca',          15, 120.00),
  ('Sala Gold',  'Suite VIP con servicio de botella incluido',     6,  150.00);
```

---

### 3.7 Tabla `reservas`

Esta es la tabla más compleja. Léela con calma.

```sql
create table public.reservas (
  id              bigserial primary key,
  sala_id         int not null references public.salas_vip(id),
  cliente_id      uuid not null references public.perfiles(id),
  inicio          timestamptz not null,
  fin             timestamptz not null,
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente','pagada','cancelada','completada')),
  stripe_session  text,
  stripe_payment  text,
  qr_token        text unique,
  total           numeric(8,2) not null,
  creado_en       timestamptz not null default now(),

  constraint sin_solapamiento exclude using gist (
    sala_id with =,
    tstzrange(inicio, fin) with &&
  ) where (estado not in ('cancelada'))
);
```

**`timestamptz`** — guarda una fecha y hora **con zona horaria** (*timestamp with time zone*). Internamente, PostgreSQL lo convierte todo a UTC. Cuando lees el valor, te lo muestra en la zona horaria de tu sesión. Usar `timestamptz` en lugar de `timestamp` (sin zona) es una buena práctica para aplicaciones con usuarios en distintas zonas horarias, o simplemente para evitar confusiones en los cambios de hora.

---

**El constraint `EXCLUDE USING GIST`: el guardián de los solapamientos**

Este es el fragmento de SQL más avanzado del proyecto. Vamos a entenderlo paso a paso.

**El problema que resuelve:**

Imagina que la Sala Roja está reservada de 20:00 a 23:00. Otro usuario intenta reservarla de 21:00 a 22:00 (dentro del mismo tramo). Si no tenemos ninguna protección, la base de datos aceptaría la segunda reserva y tendríamos un conflicto.

Podríamos validarlo en el frontend o en una función de JavaScript. Pero hay un problema: si dos usuarios intentan reservar a la vez (dos peticiones simultáneas al servidor), ambas pasarían la validación de JavaScript antes de que cualquiera de las dos se guardara, y las dos se insertarían. Esto se llama **race condition** (condición de carrera) y es muy difícil de evitar fuera de la base de datos.

La solución correcta es manejar esto **dentro de PostgreSQL**, donde las operaciones son atómicas.

**El constraint `EXCLUDE`:**

```sql
constraint sin_solapamiento exclude using gist (
  sala_id with =,
  tstzrange(inicio, fin) with &&
) where (estado not in ('cancelada'))
```

`EXCLUDE` es una restricción de PostgreSQL que dice: *"no pueden existir dos filas donde estas condiciones se cumplan a la vez"*.

- `sala_id with =` → la misma sala (los `sala_id` son iguales entre sí)
- `tstzrange(inicio, fin) with &&` → los rangos de tiempo se solapan (`&&` es el operador "se superponen" para rangos en PostgreSQL)
- `where (estado not in ('cancelada'))` → solo aplica a reservas que no estén canceladas (una reserva cancelada no "ocupa" el tramo)

`tstzrange(inicio, fin)` crea un rango de timestamps entre esas dos fechas. PostgreSQL tiene operadores nativos para trabajar con rangos: `&&` comprueba si dos rangos se solapan.

**¿Por qué `USING GIST`?** Los índices GIST (*Generalized Search Tree*) son índices de PostgreSQL especialmente diseñados para datos geométricos y de rango. Para comparar si dos rangos se superponen, necesitamos este tipo de índice. Los índices B-tree normales no saben comparar rangos. Por eso necesitábamos la extensión `btree_gist` del primer paso: permite que una columna de tipo entero (`sala_id`) participe en un índice GIST junto a una columna de rango.

Si intentas insertar una reserva que se solapa con otra en la misma sala, PostgreSQL devolverá un error como este:
```
ERROR: conflicting key value violates exclusion constraint "sin_solapamiento"
```

Tu aplicación debe capturar ese error y mostrar al usuario un mensaje amigable.

---

## 4. Aplicar las migraciones

Con los dos archivos SQL listos, aplicamos los cambios a la base de datos local:

```bash
npx supabase db reset
```

Este comando borra la base de datos local y vuelve a aplicar **todas** las migraciones de la carpeta `migrations/` en orden de timestamp. Primero crea las tablas y activa RLS (`_esquema_inicial.sql`), luego aplica las políticas de acceso (`_politicas_rls.sql`). Al terminar, tu base de datos tendrá las tablas, el trigger, los datos iniciales y todas las reglas de seguridad activas.

Abre el Studio (`http://localhost:54323`) y ve a **Table Editor**. Deberías ver todas las tablas. Haz clic en `mesas` y verifica que las 16 filas de datos iniciales están ahí. En **Authentication → Policies** podrás ver las políticas activas de cada tabla.

---

## 5. Supabase Storage: guardar imágenes

### ¿Qué es Storage y cómo funciona?

Supabase Storage es un sistema de almacenamiento de ficheros (como Google Drive o S3 de Amazon, pero integrado con tu base de datos). Nos permite subir imágenes, vídeos, PDFs, o cualquier fichero, y obtener una **URL pública** para acceder a ellos desde el navegador.

El flujo para las imágenes de Flex es este:

```
1. El admin sube una imagen desde la app (input type="file")
         ↓
2. Nuestra función de JavaScript envía el fichero a Supabase Storage
         ↓
3. Supabase guarda el fichero y nos devuelve una URL pública
   Ejemplo: http://localhost:54321/storage/v1/object/public/productos/cerveza.jpg
         ↓
4. Guardamos esa URL en la columna imagen_url de la tabla productos
         ↓
5. El frontend lee la URL de la DB y la usa en un <img src="...">
```

**¿Por qué guardamos la URL y no el fichero en la DB?**  
Guardar imágenes como datos binarios (`bytea`) en PostgreSQL es una mala práctica. Las bases de datos no están optimizadas para servir ficheros grandes, y cada consulta cargaría los datos de la imagen aunque no la necesites. Storage está diseñado para esto: sirve ficheros de forma eficiente con caché, compresión y CDN en producción.

### Los "buckets": carpetas raíz de Storage

Un bucket es la unidad organizativa principal de Storage. Todo fichero pertenece a un bucket. Podemos tener diferentes buckets con diferentes permisos.

Para Flex necesitamos dos:

| Bucket | ¿Público? | Contenido |
|---|---|---|
| `productos` | Sí | Fotos del menú (bebidas, comida) |
| `salas-vip` | Sí | Fotos de las salas VIP |

Un bucket **público** significa que cualquier persona con la URL puede ver el fichero, sin autenticación. Es correcto para imágenes del menú: son como las fotos de un restaurante, no hay nada que proteger.

### 5.1 Crear los buckets

Desde el Studio (`http://localhost:54323`), ve a **Storage → New bucket** y crea los dos buckets. Activa "Public bucket" en ambos.

Alternativamente, desde el SQL Editor:

```sql
insert into storage.buckets (id, name, public) values
  ('productos', 'productos', true),
  ('salas-vip', 'salas-vip', true);
```

### 5.2 Políticas de acceso al Storage

Aunque el bucket sea público para lectura, eso no significa que cualquiera pueda subir o borrar ficheros. Necesitamos definir **reglas de acceso**: quién puede hacer qué con los ficheros.

En Supabase, estas reglas se llaman **políticas** (*policies*) y son parte de un sistema de seguridad llamado **Row Level Security (RLS)**. Básicamente, son condiciones que la base de datos evalúa antes de permitir cualquier operación: leer, insertar, actualizar o borrar.

Necesitamos tres políticas para el Storage de Flex:

- **Lectura pública:** cualquier persona (sin login) puede ver las imágenes. Esto permite que los `<img src="...">` funcionen en el navegador sin que el usuario esté autenticado.
- **Subida restringida:** solo usuarios con rol `staff` o `admin` pueden subir imágenes.
- **Borrado restringido:** igual, solo `staff` o `admin`.

El sistema de políticas merece su propia clase, ya que aplica a todas las tablas de la base de datos y es fundamental para la seguridad de la app. Lo estudiaremos en profundidad en el **apunte 02 (seguridad-rls)**, donde entenderemos la lógica completa, la sintaxis, y por qué es imprescindible.

Por ahora solo necesitas saber que las políticas **existen**, que **se aplican automáticamente** antes de cualquier operación, y que las configuraremos en el siguiente apunte junto con el resto de reglas de seguridad de Flex.

### 5.3 Cómo funciona `getPublicUrl`

Cuando subimos un fichero a Supabase Storage, el fichero queda guardado en el servidor. Para mostrarlo en la app necesitamos su dirección web, su URL. Supabase construye esa URL siguiendo un patrón fijo y predecible:

```
[URL_DE_SUPABASE]/storage/v1/object/public/[BUCKET]/[NOMBRE_DEL_FICHERO]
```

Ejemplos reales:

```
En local:
http://localhost:54321/storage/v1/object/public/productos/1715000000000-cerveza.jpg

En producción:
https://abcdefghijk.supabase.co/storage/v1/object/public/productos/1715000000000-cerveza.jpg
```

El método `getPublicUrl` del SDK de Supabase simplemente **construye este string**. No hace ninguna petición de red ni comprueba que el fichero exista. Es una operación instantánea y síncrona (sin `await`). Solo necesita saber el nombre del fichero que subiste para armar la URL.

El flujo completo al subir una imagen tiene por tanto dos pasos bien diferenciados:

```
1. upload(nombre, fichero)    → petición de red → guarda el fichero en el servidor
2. getPublicUrl(nombre)       → sin red → construye y devuelve la URL del fichero
```

Ambos usan el mismo `nombre` para que la URL apunte exactamente al fichero que acabamos de subir.

### 5.4 El código lo implementaremos con Next.js

Para subir imágenes desde la app necesitamos el SDK de Supabase instalado en el proyecto Next.js, conectarlo con las variables de entorno, y crear los formularios en React. Todo eso lo haremos cuando lleguemos al apunte de Next.js.

Lo que sí podemos hacer ahora mismo es **probar Storage manualmente** desde el Studio:

1. Abre `http://localhost:54323` → **Storage**
2. Entra en el bucket `productos`
3. Pulsa **Upload file** y sube cualquier imagen
4. Haz clic en el fichero subido → copia la URL pública
5. Pégala en el navegador: deberías ver la imagen directamente

Así verificamos que Storage funciona antes de escribir una sola línea de código.

---

## 6. Diagrama de relaciones (resumen visual)

```
auth.users ──────────────────────────────────┐
                                              │ trigger crea perfil automáticamente
                                              ▼
                                         perfiles
                                     (rol: cliente | staff | admin)
                                          │
                        ┌─────────────────┴──────────────────┐
                        │                                     │
                 hace pedidos                          hace reservas
                        │                                     │
                   pedidos ────────── mesa_id ──────────▶ mesas
                        │                               (piso 1 | piso 2)
               tiene líneas
                        │
                  pedido_items ───── producto_id ───────▶ productos
                                                         (imagen_url)
                                                              │
                                                              ▼
                                                   Storage bucket: productos


                   reservas ──────── sala_id ──────────▶ salas_vip
                   (qr_token)                            (imagen_url)
                                                              │
                                                              ▼
                                                   Storage bucket: salas-vip
```

---

## 7. Resumen de pasos para poner en marcha

```bash
# 1. En la carpeta del proyecto
npx supabase init
npx supabase start   # arranca Docker con todos los servicios

# 2. Crear los dos archivos de migración
npx supabase migration new esquema_inicial
# Pegar el SQL (tablas + ENABLE RLS) en supabase/migrations/..._esquema_inicial.sql

npx supabase migration new politicas_rls
# Pegar el SQL (mi_rol() + políticas) en supabase/migrations/..._politicas_rls.sql
# (ver apunte 02 para el contenido completo de este archivo)

# 3. Aplicar las migraciones (aplica ambos archivos en orden)
npx supabase db reset

# 4. Crear los buckets de Storage desde el Studio
# Abrir http://localhost:54323 → Storage → New bucket

# 5. Copiar las variables de entorno en .env.local
# (los valores los da 'npx supabase start')
```

---

## Reto Flex 🎸

Añade una tabla `eventos` a la DB que represente las noches de jam session:

- Campos: `id` (bigserial), `titulo` (text, not null), `descripcion` (text), `fecha` (timestamptz, not null), `cartel_url` (text), `precio_entrada` (numeric(8,2), not null), `aforo_maximo` (int, not null), `activo` (boolean, default true).
- Crea el bucket `carteles` en Storage desde el Studio con política pública. Sube una imagen de prueba manualmente y verifica que la URL pública funciona en el navegador.
- Añade la columna `evento_id bigint references public.eventos(id)` a la tabla `reservas` usando `ALTER TABLE` (una sala VIP se puede reservar para un evento concreto).
- Crea el archivo de migración correspondiente con `npx supabase migration new agregar_eventos` y aplícalo con `npx supabase db reset`.

> **Pista:** Al añadir `evento_id` a `reservas`, hazlo sin `not null` para que las reservas existentes no fallen. Una reserva sin evento asociado simplemente tendrá `evento_id = null`.

---

## Navegación

| | |
|---|---|
| | [02 — Seguridad con RLS →](./02-seguridad-rls.md) |
