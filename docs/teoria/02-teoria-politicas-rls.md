# 02 — Teoría previa: Seguridad en bases de datos desde cero

> Objetivo: entender los conceptos que aparecen en las políticas de Flex antes de leer el código

---

## Antes de empezar: ¿por qué no basta con validar en el frontend?

Cuando construyes una app web, la lógica que ves en el navegador (React, JavaScript) es **código público**. Cualquier persona puede abrir las herramientas de desarrollador de su navegador, ver tus peticiones a la API, copiar las claves que usas y lanzar peticiones directas a tu base de datos, saltándose por completo tu aplicación.

```
Sin protección en la base de datos:

Usuario malicioso → abre DevTools → copia la API key → lanza petición directa → obtiene TODOS los datos
                                                                                ↑
                                                    tu validación de frontend no interviene aquí
```

La solución es mover la seguridad a un sitio donde el usuario no pueda llegar: **dentro del motor de la base de datos**. Eso es exactamente lo que hace PostgreSQL con Row Level Security.

---

## 1. Roles y autenticación en Supabase

### ¿Qué es un rol en PostgreSQL?

En PostgreSQL, un **rol** es una identidad con permisos específicos. Es como un tipo de usuario, pero más genérico: puede ser una persona, un servicio, o un proceso automatizado.

Cuando alguien hace una petición a Supabase, llega con uno de estos tres roles predefinidos:

| Rol | Quién lo usa | Para qué |
|-----|-------------|----------|
| `anon` | Usuarios no autenticados | Ver contenido público |
| `authenticated` | Usuarios que han hecho login | Acceder a sus propios datos |
| `service_role` | Servidores y Edge Functions | Operaciones del sistema (ignora RLS) |

```
Petición sin login → Supabase la marca como rol 'anon'
Petición con token → Supabase la marca como rol 'authenticated'
Petición con service_role key → Supabase la marca como rol 'service_role'
```

### Las funciones `auth.uid()` y `auth.role()`

Supabase expone dos funciones de ayuda que puedes usar directamente en SQL:

```sql
-- Devuelve el UUID del usuario autenticado actualmente
-- Si no hay usuario, devuelve null
SELECT auth.uid();

-- Devuelve el rol actual de la petición: 'anon', 'authenticated', 'service_role'
SELECT auth.role();
```

Estas funciones leen el **token JWT** que acompaña a la petición HTTP. El JWT es un pequeño fichero cifrado que Supabase Auth genera al hacer login y que el navegador adjunta a todas las peticiones posteriores.

```
Usuario hace login
       ↓
Supabase devuelve un JWT con: { sub: "UUID-del-usuario", role: "authenticated", ... }
       ↓
El navegador guarda el JWT y lo manda en cada petición
       ↓
PostgreSQL lo lee con auth.uid() y auth.role()
```

### Ejercicio 1

Razona sin ejecutar código: un usuario no autenticado hace una petición a Supabase. ¿Qué devuelven `auth.uid()` y `auth.role()` en ese caso?

<details>
<summary>Respuesta</summary>

- `auth.uid()` devuelve `null` porque no hay ningún usuario identificado.
- `auth.role()` devuelve `'anon'` porque Supabase asigna ese rol por defecto a las peticiones sin token de autenticación.

Esto tiene consecuencias importantes: si escribes una política que comprueba `auth.uid() = cliente_id`, un usuario no autenticado nunca podrá pasar esa comprobación (porque `null = cliente_id` es `null`, que se evalúa como falso).

</details>

---

## 2. Row Level Security (RLS)

### ¿Qué es RLS?

**Row Level Security** (seguridad a nivel de fila) es una característica de PostgreSQL que te permite definir reglas que determinan qué filas puede ver o modificar cada usuario.

La clave está en "a nivel de fila": no es "este usuario puede acceder a la tabla `pedidos`" sino "este usuario puede ver **las filas de** `pedidos` **donde** `cliente_id = su UUID`".

```
Sin RLS:
SELECT * FROM pedidos → devuelve los 500 pedidos de todos los clientes

Con RLS (política activa):
SELECT * FROM pedidos → devuelve solo los 3 pedidos de ESE cliente
                        (PostgreSQL filtra automáticamente antes de responder)
```

### Activar RLS en una tabla

RLS está **desactivado por defecto**. Hay que activarlo tabla a tabla con:

```sql
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
```

**Comportamiento importante:** una tabla con RLS activado pero sin ninguna política definida **deniega todo acceso**. Es un estado seguro por defecto: "si no hay regla que lo permita, está prohibido".

```sql
-- Activar RLS en varias tablas de golpe:
ALTER TABLE public.perfiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos    ENABLE ROW LEVEL SECURITY;

-- Con RLS activado y sin políticas:
SELECT * FROM public.pedidos;
-- Devuelve 0 filas (aunque haya datos). No es un error, simplemente no pasa la política.
```

### Ejercicio 2

Tienes una tabla `facturas` con RLS activado y ninguna política definida. Un administrador conectado como `service_role` intenta hacer `SELECT * FROM facturas`. ¿Cuántas filas obtiene? ¿Y un usuario autenticado normal?

<details>
<summary>Respuesta</summary>

- **`service_role`**: obtiene **todas las filas**. El rol `service_role` bypasea RLS completamente; las políticas no se evalúan para él.
- **Usuario autenticado**: obtiene **0 filas**. Con RLS activo y sin políticas, ningún usuario normal puede leer nada. Que el usuario esté autenticado no es suficiente: necesita una política que lo permita explícitamente.

</details>

---

## 3. Políticas (`CREATE POLICY`)

### ¿Qué es una política?

Una **política** es una regla que le dice a PostgreSQL: "permite esta operación si se cumple esta condición". Se define por tabla y por tipo de operación.

```sql
CREATE POLICY "nombre descriptivo"
  ON nombre_tabla
  FOR SELECT          -- qué operación: SELECT, INSERT, UPDATE, DELETE o ALL
  USING ( condicion );  -- condición que debe cumplirse
```

El nombre entre comillas es solo descriptivo, pero es importante escribirlo bien porque aparecerá en los logs de error y en el panel de Supabase.

### `USING` vs `WITH CHECK`

Hay dos tipos de condición en una política:

| Cláusula | Se evalúa en | Para qué sirve |
|----------|-------------|----------------|
| `USING` | SELECT, UPDATE, DELETE | Filtra qué filas **existentes** puede ver o tocar el usuario |
| `WITH CHECK` | INSERT, UPDATE | Valida los **nuevos datos** que el usuario quiere escribir |

```sql
-- USING: "qué filas puede leer"
-- Solo permite leer las filas donde el cliente_id coincide con el usuario actual
CREATE POLICY "cliente: ver sus pedidos"
  ON public.pedidos FOR SELECT
  USING ( cliente_id = auth.uid() );

-- WITH CHECK: "qué datos puede escribir"
-- Solo permite insertar filas donde el cliente_id sea el propio usuario
CREATE POLICY "cliente: crear pedidos"
  ON public.pedidos FOR INSERT
  WITH CHECK ( cliente_id = auth.uid() );
```

Para `UPDATE`, normalmente se usan **ambas**:
- `USING`: qué filas puede actualizar (las que puede "ver")
- `WITH CHECK`: cómo puede quedar la fila después de la actualización

```sql
-- Un cliente puede cancelar su reserva, pero solo si está en estado 'pendiente'
-- y solo puede ponerla como 'cancelada' (no como 'pagada')
CREATE POLICY "cliente: cancelar reserva pendiente"
  ON public.reservas FOR UPDATE
  USING (
    cliente_id = auth.uid()
    AND estado = 'pendiente'      -- solo puede tocar reservas pendientes
  )
  WITH CHECK (
    cliente_id = auth.uid()
    AND estado = 'cancelada'      -- solo puede dejarlas como canceladas
  );
```

### Ejercicio: USING vs WITH CHECK

Un banco quiere que los clientes puedan ver sus propias cuentas pero no puedan aumentar su propio saldo directamente. Escribe la política de UPDATE para la tabla `cuentas(id, usuario_id, saldo)`.

<details>
<summary>Respuesta</summary>

```sql
-- El usuario puede actualizar su cuenta, pero el saldo en el resultado
-- no puede ser mayor que el saldo actual (no puede "inventarse" dinero)
CREATE POLICY "cliente: actualizar su cuenta"
  ON public.cuentas FOR UPDATE
  USING ( usuario_id = auth.uid() )
  WITH CHECK (
    usuario_id = auth.uid()
    AND saldo <= (SELECT saldo FROM public.cuentas WHERE id = cuentas.id)
  );
```

`USING` limita a qué filas puede acceder (solo las suyas). `WITH CHECK` valida que el resultado no sea fraudulento (el saldo no puede crecer). Un sistema real usaría transacciones y funciones para esto, pero la idea de separar "qué puedes tocar" de "cómo puede quedar" es exactamente el rol de `USING` vs `WITH CHECK`.

</details>

---

### La cláusula `FOR ALL`

En lugar de crear cuatro políticas separadas (SELECT, INSERT, UPDATE, DELETE), puedes usar `FOR ALL`:

```sql
-- El admin puede hacer cualquier operación en productos
CREATE POLICY "admin: gestionar productos"
  ON public.productos FOR ALL
  USING ( public.mi_rol() = 'admin' )
  WITH CHECK ( public.mi_rol() = 'admin' );
```

`FOR ALL` aplica la política a todas las operaciones. Se usa cuando el mismo usuario tiene permiso total sobre la tabla sin restricciones adicionales.

### Ejercicio: diseñar políticas básicas

Tienes una tabla `notas(id, autor_id, contenido, publica boolean)`. Define políticas para que:
1. Cualquier usuario autenticado pueda leer las notas marcadas como públicas.
2. El autor pueda leer, editar y borrar sus propias notas (aunque sean privadas).
3. El autor no pueda cambiar `autor_id` al editar (una nota siempre pertenece a quien la creó).

<details>
<summary>Respuesta</summary>

```sql
-- 1. Leer notas públicas
CREATE POLICY "autenticado: ver notas públicas"
  ON public.notas FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND publica = true
  );

-- 2. El autor lee y borra sus propias notas (incluso privadas)
CREATE POLICY "autor: acceso total a sus notas"
  ON public.notas FOR SELECT
  USING ( autor_id = auth.uid() );

CREATE POLICY "autor: borrar sus notas"
  ON public.notas FOR DELETE
  USING ( autor_id = auth.uid() );

-- 3. El autor puede editar su nota, pero no cambiar quién es el autor
CREATE POLICY "autor: editar sus notas"
  ON public.notas FOR UPDATE
  USING ( autor_id = auth.uid() )
  WITH CHECK ( autor_id = auth.uid() );  -- el autor_id debe seguir siendo el suyo
```

`WITH CHECK ( autor_id = auth.uid() )` en el UPDATE garantiza que aunque el usuario modifique la fila, el `autor_id` resultante sigue siendo su propio UUID. Si intentara poner `autor_id = otro_uuid`, la condición fallaría y PostgreSQL rechazaría el UPDATE.

</details>

---

## 4. La función helper de rol

### El problema de repetir código en cada política

En Flex hay tres roles de negocio: `cliente`, `staff` y `admin`. Están guardados en `public.perfiles.rol`. Para saber el rol del usuario actual, necesitaríamos este subquery en cada política:

```sql
-- Sin helper: repetir esto en cada política
USING (
  (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin'
)
```

Eso es verboso y propenso a errores. La solución es crear una **función helper** que encapsule ese subquery:

```sql
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid()
$$;
```

Ahora en cada política usamos simplemente `public.mi_rol()`:

```sql
-- Con helper: limpio y reutilizable
USING ( public.mi_rol() = 'admin' )
```

### Por qué `SECURITY DEFINER` es necesario aquí

Recuerda de la teoría anterior: `SECURITY DEFINER` hace que la función se ejecute con los permisos de quien la **creó** (el superadmin de la DB), no de quien la **llama**.

¿Por qué es necesario aquí? Por el **problema de la recursión infinita**:

```
Un usuario llama a SELECT * FROM perfiles
       ↓
PostgreSQL evalúa la política de SELECT en 'perfiles'
       ↓
La política llama a mi_rol(), que hace SELECT FROM perfiles
       ↓
PostgreSQL evalúa la política de SELECT en 'perfiles'...
       ↓
¡Bucle infinito! ❌
```

Con `SECURITY DEFINER`, la función `mi_rol()` se ejecuta como el superadmin, que está exento de las políticas RLS. El ciclo se rompe:

```
Un usuario llama a SELECT * FROM perfiles
       ↓
PostgreSQL evalúa la política → llama a mi_rol()
       ↓
mi_rol() corre como superadmin → lee perfiles SIN evaluar políticas
       ↓
Devuelve el rol → la política decide si mostrar o no la fila ✓
```

### La keyword `STABLE`

```sql
STABLE
```

Le dice a PostgreSQL que esta función devuelve el mismo resultado si se llama varias veces dentro de la misma transacción con los mismos parámetros. PostgreSQL puede cachear el resultado en vez de ejecutar el subquery para cada fila de la tabla. En una tabla con 1000 pedidos, sin `STABLE` haría 1000 consultas a `perfiles`; con `STABLE`, hace una sola.

### Ejercicio 3

Tienes un sistema con roles `'editor'`, `'revisor'` y `'publicador'`. Escribe la función helper `public.mi_rol()` adaptada a este sistema (los roles siguen guardándose en la columna `rol` de la tabla `perfiles`). Luego escribe la política para que solo los publicadores puedan hacer `DELETE` en la tabla `articulos`.

<details>
<summary>Respuesta</summary>

```sql
-- La función es idéntica; solo cambian los valores posibles del rol,
-- que están controlados por el CHECK en la tabla perfiles, no aquí.
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid()
$$;

-- Política: solo publicadores pueden borrar artículos
CREATE POLICY "publicador: borrar artículos"
  ON public.articulos FOR DELETE
  USING ( public.mi_rol() = 'publicador' );
```

La función `mi_rol()` no necesita saber qué valores de rol existen; simplemente devuelve lo que haya en la columna. La validación de valores válidos (`CHECK`) vive en la definición de la tabla `perfiles`.

</details>

---

## 5. Subqueries en políticas: `EXISTS`

### ¿Qué es `EXISTS`?

`EXISTS` es un operador SQL que devuelve `true` si una subquery devuelve al menos una fila, y `false` si no devuelve ninguna.

```sql
-- ¿Existe algún pedido activo de ese cliente?
SELECT EXISTS (
  SELECT 1 FROM public.pedidos
  WHERE pedidos.cliente_id = auth.uid()
    AND pedidos.estado = 'activo'
);
-- Devuelve: true o false
```

`SELECT 1` es un truco habitual: no necesitamos los datos de la fila, solo saber si existe. Seleccionar el literal `1` es más eficiente que `SELECT *`.

### Por qué se necesita `EXISTS` en las políticas de `pedido_items`

Un `pedido_item` pertenece a un pedido. Pero la columna `cliente_id` está en `pedidos`, no en `pedido_items`. Para saber si un cliente puede ver un item concreto, tenemos que mirar si ese item pertenece a un pedido suyo:

```sql
-- El cliente ve los ítems de SUS pedidos
CREATE POLICY "cliente: ver items de sus pedidos"
  ON public.pedido_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos
      WHERE pedidos.id = pedido_items.pedido_id   -- el pedido de este item
        AND pedidos.cliente_id = auth.uid()        -- es un pedido del cliente actual
    )
  );
```

En español: "permite leer este item si existe algún pedido que (a) tiene el mismo ID que el pedido de este item, y (b) pertenece al usuario actual".

### Ejercicio: `EXISTS` en políticas

Tienes las tablas `proyectos(id, nombre)` y `tareas(id, proyecto_id, titulo, completada)`. Los usuarios pueden pertenecer a proyectos a través de la tabla `miembros(usuario_id, proyecto_id)`.

Escribe la política para que un usuario solo pueda ver las tareas de proyectos de los que es miembro.

<details>
<summary>Respuesta</summary>

```sql
CREATE POLICY "miembro: ver tareas de sus proyectos"
  ON public.tareas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.miembros
      WHERE miembros.proyecto_id = tareas.proyecto_id  -- mismo proyecto que la tarea
        AND miembros.usuario_id = auth.uid()            -- y el usuario es miembro
    )
  );
```

Para cada fila de `tareas` que se intenta leer, PostgreSQL comprueba si existe alguna fila en `miembros` donde coincidan el proyecto y el usuario actual. Si existe, muestra la tarea. Si no, la oculta.

</details>

---

## 6. El `service_role` y el bypass de RLS

### ¿Qué es la `service_role key`?

Supabase proporciona dos tipos de claves API:

| Clave | Rol asignado | Ignora RLS |
|-------|-------------|------------|
| `anon key` | `anon` | No |
| `service_role key` | `service_role` | **Sí** |

El cliente del navegador usa la `anon key`. Las peticiones autenticadas del usuario también viajan con la `anon key`, pero acompañadas del JWT que identifica al usuario (por eso Supabase les asigna el rol `authenticated`).

La `service_role key` es exclusiva del **servidor**: Edge Functions, scripts de migración, webhooks. Nunca debe enviarse al navegador porque permite hacer cualquier operación sin restricciones.

### Cuándo y por qué bypasear RLS

El caso más claro en Flex es el webhook de Stripe:

```
Stripe confirma el pago
       ↓
Llama a la Edge Function (en el servidor)
       ↓
La Edge Function usa service_role key
       ↓
UPDATE reservas SET estado = 'pagada' WHERE id = ?
(RLS ignorado → correcto: el sistema, no el usuario, hace este cambio)
```

Tiene sentido porque Stripe no es un usuario de la app. Es un sistema externo que actúa en nombre del sistema. Si la Edge Function usara la `anon key`, necesitaría una política que permitiera actualizar reservas desde fuera, lo que abriría una brecha de seguridad.

### Ejercicio 4

Razona: tienes una tarea programada (cron job) que cada noche borra los pedidos con estado `'abandonado'` de más de 30 días. ¿Debería usar la `anon key` o la `service_role key`? ¿Qué problemas tendría usar la equivocada?

<details>
<summary>Respuesta</summary>

Debe usar la **`service_role key`** porque:
1. Es un proceso del sistema, no un usuario.
2. Necesita borrar pedidos de **todos** los clientes, no solo los de uno.
3. Con la `anon key`, el rol sería `anon` y las políticas RLS bloquearían la operación (no hay ninguna política que permita borrar pedidos a usuarios anónimos).

Si usara la `anon key`:
- Con RLS activo y sin política de DELETE para `anon`, el DELETE devolvería 0 filas borradas sin error (RLS filtra silenciosamente, no lanza un error de permisos).
- El cron job parecería funcionar pero no haría nada.

Si expusieras la `service_role key` al cliente (frontend):
- Cualquier usuario podría borrar pedidos de otros, leer todos los datos, etc.
- Todo el sistema de RLS quedaría inutilizado.

</details>

---

## 7. Cómo probar que las políticas funcionan

### Simular un usuario en el SQL Editor

Supabase permite simular una petición de un usuario concreto desde el SQL Editor usando `set`:

```sql
-- Simular ser el usuario con ese UUID
SET request.jwt.claims = '{"sub":"UUID-del-usuario","role":"authenticated"}';

-- A partir de aquí, auth.uid() devuelve ese UUID y auth.role() = 'authenticated'
SELECT * FROM public.pedidos;
-- Debería devolver SOLO los pedidos de ese usuario
```

Esto modifica la sesión actual del SQL Editor para que PostgreSQL crea que la petición viene de ese usuario. Muy útil para depurar políticas sin necesidad de hacer login desde el frontend.

### Comprobar que un usuario NO puede hacer algo

```sql
SET request.jwt.claims = '{"sub":"UUID-del-cliente","role":"authenticated"}';

-- Un cliente intentando ver todos los pedidos (debería devolver solo los suyos):
SELECT * FROM public.pedidos;

-- Un cliente intentando borrar un pedido (debería devolver 0 filas borradas):
DELETE FROM public.pedidos WHERE id = 1;

-- Si la política funciona correctamente, el DELETE no borra nada
-- (RLS lo filtra silenciosamente)
```

### Ejercicio: probar políticas

Escribe las queries SQL que usarías para verificar que la política "cliente: cancelar reserva pendiente" funciona correctamente. Debes comprobar dos casos: uno que debería tener éxito y uno que debería fallar.

<details>
<summary>Respuesta</summary>

```sql
-- Primero simular ser el cliente
SET request.jwt.claims = '{"sub":"UUID-del-cliente","role":"authenticated"}';

-- CASO 1: debería FUNCIONAR
-- Cambiar estado de 'pendiente' a 'cancelada' en una reserva propia
UPDATE public.reservas
SET estado = 'cancelada'
WHERE id = <id-reserva-pendiente-del-cliente>;
-- Resultado esperado: UPDATE 1 (una fila actualizada)

-- CASO 2: debería FALLAR (devolver 0 filas actualizadas)
-- Intentar cambiar una reserva ya pagada (no está en estado 'pendiente')
UPDATE public.reservas
SET estado = 'cancelada'
WHERE id = <id-reserva-pagada-del-cliente>;
-- Resultado esperado: UPDATE 0 (USING bloquea porque estado != 'pendiente')

-- CASO 3: debería FALLAR
-- Intentar poner el estado como 'pagada' (solo puede poner 'cancelada')
UPDATE public.reservas
SET estado = 'pagada'
WHERE id = <id-reserva-pendiente-del-cliente>;
-- Resultado esperado: ERROR de política (WITH CHECK falla porque estado != 'cancelada')

-- CASO 4: debería FALLAR
-- Intentar cancelar la reserva de otro cliente
UPDATE public.reservas
SET estado = 'cancelada'
WHERE id = <id-reserva-de-otro-cliente>;
-- Resultado esperado: UPDATE 0 (USING bloquea porque cliente_id != auth.uid())
```

Los casos 2 y 4 devuelven `UPDATE 0` (silencioso) porque RLS filtra las filas antes de intentar el UPDATE. El caso 3 devuelve un error porque la fila pasa el `USING` pero falla el `WITH CHECK`.

</details>

---

## 8. Múltiples políticas en la misma tabla

### Las políticas se combinan con OR

Si una tabla tiene varias políticas para el mismo tipo de operación, PostgreSQL aplica **todas** y devuelve las filas que pasen **al menos una**. Es un OR lógico.

```sql
-- Política 1: un cliente ve sus pedidos
CREATE POLICY "cliente: ver sus pedidos"
  ON public.pedidos FOR SELECT
  USING ( cliente_id = auth.uid() AND public.mi_rol() = 'cliente' );

-- Política 2: el staff ve todos los pedidos
CREATE POLICY "staff: ver todos los pedidos"
  ON public.pedidos FOR SELECT
  USING ( public.mi_rol() IN ('staff', 'admin') );

-- Si el usuario es 'staff', pasa la política 2 → ve todos los pedidos
-- Si el usuario es 'cliente', solo pasa la política 1 → ve solo los suyos
-- Si el usuario es 'anon', no pasa ninguna → ve 0 filas
```

Esto es importante: **no hace falta elegir entre políticas**. Puedes tener tantas como necesites, cada una para un tipo de usuario diferente.

### Ejercicio 5

Tienes la tabla `documentos(id, autor_id, contenido, borrador boolean)`. Escribe las políticas para que:
- Un autor vea todos sus documentos (borradores y publicados).
- Cualquier usuario autenticado vea los documentos **no borrador** (publicados) de cualquier autor.
- Solo el autor pueda editar sus propios documentos.

Luego responde: si el autor hace `SELECT * FROM documentos`, ¿cuántas políticas de SELECT se evalúan para él?

<details>
<summary>Respuesta</summary>

```sql
-- Política 1: un autor ve todos sus documentos
CREATE POLICY "autor: ver sus documentos"
  ON public.documentos FOR SELECT
  USING ( autor_id = auth.uid() );

-- Política 2: todos los autenticados ven documentos publicados
CREATE POLICY "autenticado: ver publicados"
  ON public.documentos FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND borrador = false
  );

-- Política 3: solo el autor puede editar sus documentos
CREATE POLICY "autor: editar sus documentos"
  ON public.documentos FOR UPDATE
  USING ( autor_id = auth.uid() )
  WITH CHECK ( autor_id = auth.uid() );
```

Cuando el autor hace `SELECT * FROM documentos`, PostgreSQL evalúa **ambas políticas de SELECT** (la 1 y la 2). Una fila aparece en el resultado si pasa al menos una. Para sus propios documentos, pasa la política 1. Para documentos publicados de otros, pasa la política 2. El resultado: el autor ve todos sus documentos Y los documentos publicados de otros autores.

</details>

---

## Resumen de conceptos

| Concepto | En una frase |
|---|---|
| **RLS** | Seguridad a nivel de fila: PostgreSQL filtra qué datos puede ver cada usuario |
| **`ENABLE ROW LEVEL SECURITY`** | Activa RLS en una tabla; sin políticas, deniega todo |
| **`CREATE POLICY`** | Define una regla de acceso para una tabla y operación concretas |
| **`USING`** | Condición sobre filas existentes (SELECT, UPDATE, DELETE) |
| **`WITH CHECK`** | Condición sobre los datos nuevos a escribir (INSERT, UPDATE) |
| **`FOR ALL`** | La política aplica a SELECT, INSERT, UPDATE y DELETE |
| **`auth.uid()`** | UUID del usuario autenticado actualmente (null si no hay ninguno) |
| **`auth.role()`** | Rol de la petición actual: `anon`, `authenticated` o `service_role` |
| **`service_role`** | Rol del sistema; bypasea RLS (nunca exponer al cliente) |
| **`SECURITY DEFINER`** | La función corre con permisos del creador, evita recursión en políticas |
| **`STABLE`** | El resultado no cambia en la transacción; PostgreSQL lo puede cachear |
| **`EXISTS`** | True si la subquery devuelve al menos una fila |
| **Múltiples políticas** | Se combinan con OR: una fila pasa si cumple al menos una política |

---

## Ejercicio final integrador

Diseña el sistema de políticas RLS para una plataforma de cursos online con estas reglas:

**Tablas:** `cursos(id, instructor_id, titulo, publicado boolean)`, `matriculas(id, alumno_id, curso_id, completado boolean)`, `lecciones(id, curso_id, titulo, contenido)`.

**Roles de negocio** (almacenados en `perfiles.rol`): `'alumno'`, `'instructor'`, `'admin'`.

**Reglas:**
1. Cualquier usuario autenticado puede ver los cursos publicados.
2. Un instructor puede ver y editar **solo sus propios cursos** (publicados o no).
3. Un alumno puede ver las lecciones de los cursos en los que está matriculado.
4. Un alumno puede matricularse en un curso (INSERT en `matriculas`), pero solo con su propio `alumno_id`.
5. Un alumno puede marcar su propia matrícula como completada (UPDATE), pero no puede cambiar `alumno_id` ni `curso_id`.
6. El admin tiene acceso total a todo.

Escribe también la función helper `public.mi_rol()` y activa RLS en las tres tablas.

<details>
<summary>Respuesta</summary>

```sql
-- Función helper
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid()
$$;

-- Activar RLS
ALTER TABLE public.cursos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecciones   ENABLE ROW LEVEL SECURITY;

-- ─── CURSOS ───────────────────────────────────────────────

-- 1. Cualquier autenticado ve cursos publicados
CREATE POLICY "autenticado: ver cursos publicados"
  ON public.cursos FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND publicado = true
  );

-- 2a. Un instructor ve todos sus cursos (publicados o no)
CREATE POLICY "instructor: ver sus cursos"
  ON public.cursos FOR SELECT
  USING (
    instructor_id = auth.uid()
    AND public.mi_rol() = 'instructor'
  );

-- 2b. Un instructor edita solo sus cursos
CREATE POLICY "instructor: editar sus cursos"
  ON public.cursos FOR UPDATE
  USING (
    instructor_id = auth.uid()
    AND public.mi_rol() = 'instructor'
  )
  WITH CHECK (
    instructor_id = auth.uid()
    AND public.mi_rol() = 'instructor'
  );

-- 6. Admin tiene acceso total a cursos
CREATE POLICY "admin: gestionar cursos"
  ON public.cursos FOR ALL
  USING ( public.mi_rol() = 'admin' )
  WITH CHECK ( public.mi_rol() = 'admin' );

-- ─── LECCIONES ────────────────────────────────────────────

-- 3. Un alumno ve las lecciones de cursos en los que está matriculado
CREATE POLICY "alumno: ver lecciones de sus cursos"
  ON public.lecciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matriculas
      WHERE matriculas.curso_id = lecciones.curso_id
        AND matriculas.alumno_id = auth.uid()
    )
  );

-- El instructor ve las lecciones de sus propios cursos
CREATE POLICY "instructor: ver lecciones de sus cursos"
  ON public.lecciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cursos
      WHERE cursos.id = lecciones.curso_id
        AND cursos.instructor_id = auth.uid()
    )
  );

-- Admin: acceso total
CREATE POLICY "admin: gestionar lecciones"
  ON public.lecciones FOR ALL
  USING ( public.mi_rol() = 'admin' )
  WITH CHECK ( public.mi_rol() = 'admin' );

-- ─── MATRÍCULAS ───────────────────────────────────────────

-- 4. Un alumno puede matricularse (solo con su propio alumno_id)
CREATE POLICY "alumno: crear matricula"
  ON public.matriculas FOR INSERT
  WITH CHECK (
    alumno_id = auth.uid()
    AND public.mi_rol() = 'alumno'
  );

-- Un alumno ve sus propias matrículas
CREATE POLICY "alumno: ver sus matriculas"
  ON public.matriculas FOR SELECT
  USING ( alumno_id = auth.uid() );

-- 5. Un alumno puede marcar su matrícula como completada
--    pero no puede cambiar alumno_id ni curso_id
CREATE POLICY "alumno: completar su matricula"
  ON public.matriculas FOR UPDATE
  USING ( alumno_id = auth.uid() )
  WITH CHECK (
    alumno_id = auth.uid()            -- no puede cambiar de quién es
    AND curso_id = (                  -- no puede cambiar el curso
      SELECT curso_id FROM public.matriculas WHERE id = matriculas.id
    )
  );

-- Admin: acceso total
CREATE POLICY "admin: gestionar matriculas"
  ON public.matriculas FOR ALL
  USING ( public.mi_rol() = 'admin' )
  WITH CHECK ( public.mi_rol() = 'admin' );
```

</details>

---

## Navegación

| | |
|---|---|
| [← 01 — Teoría previa: PostgreSQL](./01-teoria.md) | [02 — Seguridad con RLS →](../02-seguridad-rls.md) |
