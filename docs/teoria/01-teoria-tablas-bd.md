# 01 — Teoría previa: PostgreSQL desde cero

> Objetivo: entender los conceptos que aparecen en el esquema de Flex antes de leer el código

---

## Antes de empezar: ¿qué es PostgreSQL?

Una base de datos es un programa que guarda información de forma organizada. PostgreSQL es uno de los más potentes del mundo y es el que usa Supabase por debajo.

En PostgreSQL la información se guarda en **tablas**, igual que hojas de cálculo:

```
Tabla: alumnos
┌────┬──────────┬──────┐
│ id │ nombre   │ edad │
├────┼──────────┼──────┤
│  1 │ María    │  17  │
│  2 │ Carlos   │  16  │
│  3 │ Lucía    │  17  │
└────┴──────────┴──────┘
```

Cada fila es un registro. Cada columna es un campo. Con SQL podemos crear tablas, insertar datos, consultarlos, modificarlos y borrarlos.

---

## 1. Extensiones

### ¿Qué es una extensión?

PostgreSQL viene con muchas funcionalidades, pero no todas están activas por defecto para no consumir recursos innecesarios. Las **extensiones** son módulos opcionales que puedes activar cuando los necesitas.

Es como instalar un plugin en un programa: el programa base funciona sin él, pero con él tienes capacidades extra.

```sql
-- Activar una extensión
CREATE EXTENSION IF NOT EXISTS nombre_extension;

-- IF NOT EXISTS significa "solo instálala si aún no está instalada"
-- Si ya estaba, no da error. Sin esa cláusula, daría error la segunda vez.
```

### La extensión `btree_gist`

PostgreSQL tiene distintos tipos de índices para buscar datos rápidamente. El más común es el **B-tree**, que funciona bien con números, texto y fechas (comparaciones de igualdad y orden).

El índice **GiST** (*Generalized Search Tree*) está diseñado para tipos de datos más complejos: rangos de tiempo, formas geométricas, arrays…

El problema es que normalmente no pueden combinarse en un mismo índice. `btree_gist` es la extensión que lo permite: añade soporte para mezclar columnas normales (enteros, texto) con columnas de rango dentro del mismo índice GiST.

Lo necesitaremos cuando queramos evitar reservas solapadas: tenemos que comparar un entero (`sala_id`) junto a un rango de fechas en la misma operación.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

### Ejercicio 1

Investiga (o razona): ¿qué pasaría si intentas usar `CREATE EXTENSION btree_gist` cuando ya está instalada y no pones `IF NOT EXISTS`?

<details>
<summary>Respuesta</summary>

PostgreSQL devolvería un error: `ERROR: extension "btree_gist" already exists`. Con `IF NOT EXISTS` simplemente no hace nada y continúa sin error. Es buena práctica usarlo siempre en migraciones para que sean repetibles.

</details>

---

## 2. Restricciones (constraints)

Una **restricción** es una regla que la base de datos aplica automáticamente para garantizar que los datos son válidos. Si alguien intenta insertar o modificar un dato que rompe la regla, PostgreSQL devuelve un error y rechaza la operación.

Son la primera línea de defensa de la integridad de los datos: no dependen del frontend ni del backend, viven en la propia base de datos.

### 2.1 NOT NULL

Indica que una columna no puede quedar vacía. Si intentas insertar una fila sin ese valor, falla.

```sql
CREATE TABLE productos (
  id     serial PRIMARY KEY,
  nombre text NOT NULL,   -- obligatorio
  precio numeric(8,2)     -- opcional (puede ser null)
);

-- Esto funciona:
INSERT INTO productos (nombre, precio) VALUES ('Agua', 1.50);

-- Esto falla: nombre es NOT NULL
INSERT INTO productos (precio) VALUES (1.50);
-- ERROR: null value in column "nombre" violates not-null constraint
```

### Ejercicio: NOT NULL

Tienes que crear la tabla `reservas_hotel` con las columnas: `id`, `nombre_huesped`, `email`, `fecha_entrada`, `fecha_salida`, `notas`.

Decide qué columnas deben ser `NOT NULL` y justifica por qué las demás pueden ser nulas.

<details>
<summary>Respuesta</summary>

```sql
CREATE TABLE reservas_hotel (
  id             serial PRIMARY KEY,
  nombre_huesped text NOT NULL,       -- sin nombre no sabemos a quién asignar la habitación
  email          text NOT NULL,       -- necesario para enviar la confirmación
  fecha_entrada  timestamptz NOT NULL, -- sin fecha no hay reserva
  fecha_salida   timestamptz NOT NULL, -- ídem
  notas          text                  -- opcional: peticiones especiales, alergias... puede ser null
);
```

`notas` puede ser nula porque es información adicional opcional. Las demás son imprescindibles para que la reserva tenga sentido.

</details>

---

### 2.2 DEFAULT

Si no especificas un valor al insertar, PostgreSQL usa el valor por defecto.

```sql
CREATE TABLE mensajes (
  id         serial PRIMARY KEY,
  contenido  text NOT NULL,
  leido      boolean NOT NULL DEFAULT false,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

-- Al insertar solo el contenido, 'leido' será false y 'creado_en' la hora actual:
INSERT INTO mensajes (contenido) VALUES ('Hola');
```

### Ejercicio: DEFAULT

Crea la tabla `tareas` con: `id`, `titulo` (obligatorio), `completada` (false por defecto), `prioridad` (`'normal'` por defecto), `creado_en` (fecha y hora actuales por defecto).

Luego inserta una tarea llamada `'Estudiar triggers'` sin especificar ningún otro campo y verifica que los defaults se aplicaron.

<details>
<summary>Respuesta</summary>

```sql
CREATE TABLE tareas (
  id          serial PRIMARY KEY,
  titulo      text NOT NULL,
  completada  boolean NOT NULL DEFAULT false,
  prioridad   text NOT NULL DEFAULT 'normal',
  creado_en   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO tareas (titulo) VALUES ('Estudiar triggers');

SELECT * FROM tareas;
-- id: 1, titulo: 'Estudiar triggers', completada: false, prioridad: 'normal', creado_en: [hora actual]
```

Solo hemos especificado `titulo`. PostgreSQL ha rellenado el resto con los valores por defecto.

</details>

---

### 2.3 CHECK

Define una condición que el valor debe cumplir. Si la condición es falsa, la inserción o actualización falla.

```sql
CREATE TABLE empleados (
  id     serial PRIMARY KEY,
  nombre text NOT NULL,
  edad   int CHECK (edad >= 16 AND edad <= 70),
  turno  text CHECK (turno IN ('mañana', 'tarde', 'noche'))
);

-- Esto falla:
INSERT INTO empleados (nombre, edad, turno) VALUES ('Ana', 14, 'mañana');
-- ERROR: new row violates check constraint

-- Esto también falla:
INSERT INTO empleados (nombre, edad, turno) VALUES ('Ana', 25, 'madrugada');
-- ERROR: new row violates check constraint
```

### Ejercicio: CHECK

Crea la tabla `tickets_concierto` donde:
- El precio debe ser mayor que 0.
- La categoría solo puede ser `'general'`, `'vip'` o `'backstage'`.
- La cantidad debe estar entre 1 y 10.

Luego intenta insertar un ticket con precio `-5` y explica qué error daría.

<details>
<summary>Respuesta</summary>

```sql
CREATE TABLE tickets_concierto (
  id        serial PRIMARY KEY,
  precio    numeric(8,2) NOT NULL CHECK (precio > 0),
  categoria text NOT NULL CHECK (categoria IN ('general', 'vip', 'backstage')),
  cantidad  int NOT NULL DEFAULT 1 CHECK (cantidad BETWEEN 1 AND 10)
);

-- Esto falla:
INSERT INTO tickets_concierto (precio, categoria) VALUES (-5, 'vip');
-- ERROR: new row for relation "tickets_concierto" violates check constraint "tickets_concierto_precio_check"

-- Esto también falla:
INSERT INTO tickets_concierto (precio, categoria, cantidad) VALUES (50, 'platinum', 1);
-- ERROR: violates check constraint "tickets_concierto_categoria_check"
```

La restricción `CHECK` la evalúa PostgreSQL antes de guardar la fila. No importa desde dónde venga el dato.

</details>

---

### 2.4 UNIQUE

Garantiza que no haya dos filas con el mismo valor en esa columna (o combinación de columnas).

```sql
CREATE TABLE usuarios (
  id    serial PRIMARY KEY,
  email text NOT NULL UNIQUE,   -- no puede repetirse
  nombre text
);

-- Si ya existe un usuario con ese email, falla:
INSERT INTO usuarios (email, nombre) VALUES ('ana@test.com', 'Ana');
INSERT INTO usuarios (email, nombre) VALUES ('ana@test.com', 'Otra Ana');
-- ERROR: duplicate key value violates unique constraint
```

También puedes poner `UNIQUE` sobre **combinaciones de columnas**. El valor individual puede repetirse, pero no la combinación:

```sql
CREATE TABLE asientos (
  id   serial PRIMARY KEY,
  fila int NOT NULL,
  col  int NOT NULL,
  UNIQUE (fila, col)   -- no puede haber dos asientos en la misma fila y columna
);

-- Esto está bien (misma fila, distinta columna):
INSERT INTO asientos (fila, col) VALUES (3, 1);
INSERT INTO asientos (fila, col) VALUES (3, 2);

-- Esto falla (fila Y columna iguales):
INSERT INTO asientos (fila, col) VALUES (3, 1);
-- ERROR: duplicate key value violates unique constraint
```

### Ejercicio: UNIQUE

Un parking tiene plazas numeradas (1, 2, 3…) por planta (`'A'`, `'B'`, `'C'`). Puede existir la plaza 5 de la planta A y la plaza 5 de la planta B, pero no dos plazas 5 en la planta A.

Crea la tabla `plazas_parking` que garantice esto a nivel de base de datos.

<details>
<summary>Respuesta</summary>

```sql
CREATE TABLE plazas_parking (
  id      serial PRIMARY KEY,
  numero  int NOT NULL,
  planta  text NOT NULL CHECK (planta IN ('A', 'B', 'C')),
  ocupada boolean NOT NULL DEFAULT false,
  UNIQUE (numero, planta)   -- la combinación número+planta no puede repetirse
);

-- Esto está bien (misma planta A, distinto número):
INSERT INTO plazas_parking (numero, planta) VALUES (1, 'A');
INSERT INTO plazas_parking (numero, planta) VALUES (2, 'A');

-- Esto también está bien (mismo número, distinta planta):
INSERT INTO plazas_parking (numero, planta) VALUES (1, 'B');

-- Esto falla (número Y planta iguales):
INSERT INTO plazas_parking (numero, planta) VALUES (1, 'A');
-- ERROR: duplicate key value violates unique constraint
```

</details>

---

### 2.5 PRIMARY KEY

Es una combinación de `NOT NULL` + `UNIQUE`. Identifica de forma única cada fila de la tabla. Cada tabla debe tener exactamente una clave primaria.

```sql
CREATE TABLE libros (
  id     serial PRIMARY KEY,   -- equivale a: NOT NULL UNIQUE
  titulo text NOT NULL
);
```

`serial` es un tipo especial que genera automáticamente el siguiente número entero disponible (1, 2, 3…) cada vez que insertas una fila sin especificar el `id`.

### Ejercicio: PRIMARY KEY

Razona: ¿qué problema habría si la tabla `pedidos` de Flex no tuviera clave primaria? ¿Cómo sabría el camarero qué pedido actualizar cuando quiere marcar uno como "listo"?

<details>
<summary>Respuesta</summary>

Sin clave primaria, varias filas podrían ser idénticas y no habría forma de identificar de forma unívoca un pedido concreto. Si el camarero quisiera actualizar el estado del "pedido de la mesa 3 con una cerveza", podría haber varios pedidos exactamente iguales y la query `UPDATE pedidos SET estado='listo' WHERE ...` afectaría a todos ellos a la vez.

La clave primaria garantiza que cada pedido tiene un identificador único (`id`) que no se repite y nunca es nulo, permitiendo operaciones precisas: `UPDATE pedidos SET estado='listo' WHERE id = 42`.

</details>

---

### 2.6 FOREIGN KEY (clave foránea)

Esta es la restricción más importante para entender las relaciones entre tablas.

Una **clave foránea** es una columna cuyo valor debe existir obligatoriamente en otra tabla. Es el mecanismo que conecta tablas entre sí.

```sql
-- Tabla padre
CREATE TABLE departamentos (
  id     serial PRIMARY KEY,
  nombre text NOT NULL
);

-- Tabla hija: cada empleado pertenece a un departamento que debe existir
CREATE TABLE empleados (
  id             serial PRIMARY KEY,
  nombre         text NOT NULL,
  departamento_id int REFERENCES departamentos(id)
  --                  ↑ clave foránea: el valor debe existir en departamentos.id
);

-- Si el departamento 5 no existe, esto falla:
INSERT INTO empleados (nombre, departamento_id) VALUES ('Luis', 5);
-- ERROR: insert or update on table "empleados" violates foreign key constraint
```

**`ON DELETE CASCADE`** — define qué ocurre en la tabla hija cuando se borra la fila padre:

```sql
CREATE TABLE empleados (
  id             serial PRIMARY KEY,
  nombre         text NOT NULL,
  departamento_id int REFERENCES departamentos(id) ON DELETE CASCADE
  -- Si se borra el departamento, se borran automáticamente sus empleados
);
```

Opciones disponibles:

| Opción | Comportamiento |
|---|---|
| `ON DELETE CASCADE` | Borra las filas hijas automáticamente |
| `ON DELETE SET NULL` | Pone la columna a `null` |
| `ON DELETE RESTRICT` | Impide borrar el padre si tiene hijos (error) |
| Sin opción | Igual que `RESTRICT` |

### Ejercicio: FOREIGN KEY y ON DELETE

Tienes `usuarios` y `comentarios`. Crea las tablas de forma que:
- Un comentario sin usuario no pueda existir.
- Si se borra un usuario, sus comentarios se borren también.
- Si intentas insertar un comentario con `usuario_id = 999` y ese usuario no existe, debe fallar.

Después, razona: ¿cuándo usarías `ON DELETE SET NULL` en lugar de `ON DELETE CASCADE`?

<details>
<summary>Respuesta</summary>

```sql
CREATE TABLE usuarios (
  id     serial PRIMARY KEY,
  nombre text NOT NULL
);

CREATE TABLE comentarios (
  id         serial PRIMARY KEY,
  usuario_id int NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  contenido  text NOT NULL,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

-- Esto falla porque el usuario 999 no existe:
INSERT INTO comentarios (usuario_id, contenido) VALUES (999, 'Hola');
-- ERROR: insert or update violates foreign key constraint

-- Si borramos al usuario 1, sus comentarios desaparecen automáticamente:
DELETE FROM usuarios WHERE id = 1;
-- Se borran también todos los comentarios con usuario_id = 1
```

**`ON DELETE SET NULL`** tiene sentido cuando el registro hijo tiene valor propio aunque el padre desaparezca. Por ejemplo: un `pedido` tiene un `repartidor_id`. Si el repartidor causa baja en la empresa, el pedido sigue existiendo en el historial. En ese caso pondríamos `ON DELETE SET NULL` para que el pedido quede con `repartidor_id = null` en lugar de desaparecer.

</details>

---

### 2.7 `auth.users`: la tabla interna de Supabase

Supabase Auth gestiona el registro e inicio de sesión de usuarios en su propia tabla interna `auth.users`. Esta tabla no la creamos nosotros, viene con Supabase.

Cuando en nuestro esquema escribimos:

```sql
CREATE TABLE perfiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ...
);
```

Estamos diciendo: "el `id` de un perfil debe ser el mismo UUID que Supabase Auth ya asignó a ese usuario". Si el usuario se elimina de `auth.users`, el perfil se borra en cascada.

Esto vincula nuestros datos de aplicación (nombre, rol, avatar) al sistema de autenticación de Supabase de forma que la base de datos garantiza la coherencia.

### Ejercicio: auth.users y ON DELETE CASCADE

Razona sin escribir código: en Flex, la tabla `perfiles` tiene `ON DELETE CASCADE` referenciando a `auth.users`. La tabla `pedidos` también referencia `perfiles` con clave foránea.

Si un usuario elimina su cuenta (se borra de `auth.users`), ¿qué ocurre con sus pedidos? ¿Qué tendrías que cambiar en la tabla `pedidos` para que los pedidos no se borren sino que queden "huérfanos" (sin cliente)?

<details>
<summary>Respuesta</summary>

La cadena de eventos sería:
1. Se borra el usuario de `auth.users`.
2. `ON DELETE CASCADE` borra su fila en `perfiles`.
3. Si `pedidos.cliente_id` tiene `ON DELETE CASCADE` referenciando `perfiles`, los pedidos también se borran.

Para conservar el historial de pedidos aunque el cliente se vaya, cambiaríamos la clave foránea de `pedidos`:

```sql
-- En lugar de:
cliente_id uuid REFERENCES public.perfiles(id) ON DELETE CASCADE

-- Usaríamos:
cliente_id uuid REFERENCES public.perfiles(id) ON DELETE SET NULL
```

Así, si el perfil se borra, el pedido queda con `cliente_id = null`. Perderemos la referencia al cliente, pero el historial de pedidos, el importe y el estado se conservan, lo cual es importante para la contabilidad del local.

</details>

---

### 2.8 EXCLUDE: la restricción avanzada

`EXCLUDE` es como `UNIQUE` pero más potente: en lugar de comprobar igualdad exacta, comprueba que no existan dos filas donde cierta condición sea verdadera.

La sintaxis es:

```sql
CONSTRAINT nombre EXCLUDE USING gist (
  columna1 WITH operador1,
  columna2 WITH operador2
) WHERE (condicion_opcional)
```

El caso de uso clásico es evitar solapamientos de rangos de tiempo. Imagina una sala de reuniones:

```sql
CREATE TABLE reservas_sala (
  id       serial PRIMARY KEY,
  sala     text NOT NULL,
  inicio   timestamptz NOT NULL,
  fin      timestamptz NOT NULL,

  CONSTRAINT sin_solapamiento EXCLUDE USING gist (
    sala WITH =,                      -- misma sala
    tstzrange(inicio, fin) WITH &&    -- rangos se superponen
  )
);

-- Primera reserva: sala A de 10:00 a 12:00 → OK
INSERT INTO reservas_sala VALUES (DEFAULT, 'A', '2026-01-01 10:00', '2026-01-01 12:00');

-- Segunda reserva: sala A de 11:00 a 13:00 → FALLA (se solapa)
INSERT INTO reservas_sala VALUES (DEFAULT, 'A', '2026-01-01 11:00', '2026-01-01 13:00');
-- ERROR: conflicting key value violates exclusion constraint "sin_solapamiento"

-- Sala B en el mismo tramo → OK (distinta sala)
INSERT INTO reservas_sala VALUES (DEFAULT, 'B', '2026-01-01 11:00', '2026-01-01 13:00');
```

`tstzrange(inicio, fin)` construye un rango de tiempo entre esas dos fechas. El operador `&&` significa "se solapan". Necesitamos `btree_gist` para poder mezclar la columna `sala` (texto, tipo B-tree) con el rango (tipo GiST) en el mismo índice.

### Ejercicio 2

Crea una tabla `citas_medicas` donde:
- Cada cita tiene un `medico_id` (int), una `inicio` (timestamptz) y una `fin` (timestamptz).
- No pueden existir dos citas del mismo médico que se solapen en el tiempo.
- El estado puede ser `'programada'` o `'cancelada'`. Las citas canceladas no deben bloquear el horario.

<details>
<summary>Respuesta</summary>

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE citas_medicas (
  id        serial PRIMARY KEY,
  medico_id int NOT NULL,
  inicio    timestamptz NOT NULL,
  fin       timestamptz NOT NULL,
  estado    text NOT NULL DEFAULT 'programada'
            CHECK (estado IN ('programada', 'cancelada')),

  CONSTRAINT sin_solapamiento_medico EXCLUDE USING gist (
    medico_id WITH =,
    tstzrange(inicio, fin) WITH &&
  ) WHERE (estado != 'cancelada')
);
```

</details>

---

## 3. Funciones

### ¿Qué es una función en PostgreSQL?

Una función es un bloque de código reutilizable que vive dentro de la base de datos. La diferencia con el código de tu aplicación es que se ejecuta **dentro del motor de la base de datos**, lo que tiene ventajas importantes: es más rápida para operaciones con datos, es atómica (o se ejecuta entera o no se ejecuta), y puede ser llamada desde SQL, desde triggers, o desde políticas de seguridad.

```sql
CREATE OR REPLACE FUNCTION nombre_funcion(parametro tipo)
RETURNS tipo_de_retorno
LANGUAGE sql   -- o plpgsql, depende del tipo
AS $$
  -- código aquí
$$;
```

`CREATE OR REPLACE` crea la función si no existe, o la reemplaza si ya existe. Así puedes modificarla sin borrarla primero.

Los `$$` son delimitadores de texto que evitan conflictos con las comillas simples dentro del cuerpo de la función.

### Funciones en SQL puro

Para funciones simples (una sola consulta, sin lógica condicional) usamos `LANGUAGE sql`:

```sql
-- Función que devuelve el precio con IVA
CREATE OR REPLACE FUNCTION precio_con_iva(precio numeric)
RETURNS numeric
LANGUAGE sql
STABLE   -- el resultado no cambia dentro de la misma transacción
AS $$
  SELECT precio * 1.21
$$;

-- Usarla:
SELECT precio_con_iva(10.00);
-- 12.10
```

### Ejercicio: funciones en SQL puro

Crea una función `calcular_total(precio numeric, cantidad int)` que devuelva el precio total. Luego crea otra función `aplicar_descuento(total numeric, porcentaje numeric)` que devuelva el total con el descuento aplicado.

<details>
<summary>Respuesta</summary>

```sql
CREATE OR REPLACE FUNCTION calcular_total(precio numeric, cantidad int)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT precio * cantidad
$$;

CREATE OR REPLACE FUNCTION aplicar_descuento(total numeric, porcentaje numeric)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT total * (1 - porcentaje / 100)
$$;

-- Usar ambas encadenadas:
SELECT aplicar_descuento(calcular_total(12.50, 3), 10);
-- 12.50 * 3 = 37.50 → con 10% de descuento = 33.75
```

</details>

---

### Funciones en PL/pgSQL

Para lógica más compleja (variables, condicionales, bucles) usamos `LANGUAGE plpgsql`:

```sql
CREATE OR REPLACE FUNCTION categoria_precio(precio numeric)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  resultado text;   -- variable local
BEGIN
  IF precio < 5 THEN
    resultado := 'barato';
  ELSIF precio < 20 THEN
    resultado := 'normal';
  ELSE
    resultado := 'caro';
  END IF;

  RETURN resultado;
END;
$$;

-- Usarla:
SELECT categoria_precio(3.50);   -- 'barato'
SELECT categoria_precio(12.00);  -- 'normal'
SELECT categoria_precio(50.00);  -- 'caro'
```

### Ejercicio: PL/pgSQL

Crea una función `clasificar_reserva(horas numeric)` que devuelva:
- `'corta'` si dura menos de 2 horas
- `'normal'` si dura entre 2 y 4 horas (inclusive)
- `'larga'` si dura más de 4 horas

Usa `LANGUAGE plpgsql` con variables y condicionales.

<details>
<summary>Respuesta</summary>

```sql
CREATE OR REPLACE FUNCTION clasificar_reserva(horas numeric)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  resultado text;
BEGIN
  IF horas < 2 THEN
    resultado := 'corta';
  ELSIF horas <= 4 THEN
    resultado := 'normal';
  ELSE
    resultado := 'larga';
  END IF;

  RETURN resultado;
END;
$$;

-- Probar:
SELECT clasificar_reserva(1);    -- 'corta'
SELECT clasificar_reserva(2);    -- 'normal'
SELECT clasificar_reserva(4);    -- 'normal'
SELECT clasificar_reserva(5.5);  -- 'larga'
```

</details>

---

### `SECURITY DEFINER`

Por defecto, una función se ejecuta con los permisos del usuario que la **llama**. Con `SECURITY DEFINER`, se ejecuta con los permisos del usuario que la **creó** (normalmente el superadmin de la DB).

```sql
CREATE OR REPLACE FUNCTION funcion_privilegiada()
RETURNS text
LANGUAGE sql
SECURITY DEFINER   -- corre con permisos del creador, no del llamador
AS $$
  -- puede acceder a tablas que el usuario llamador no podría
  SELECT 'acceso concedido'
$$;
```

Esto es necesario cuando una función necesita leer tablas internas (como `auth.users`) o cuando se usa en políticas de RLS para evitar recursión infinita.

### Ejercicio: SECURITY DEFINER

Razona: tienes una función `obtener_email_usuario(user_id uuid)` que lee la columna `email` de `auth.users`. Los usuarios normales no tienen permiso para leer `auth.users` directamente.

¿Qué keyword necesitas para que la función funcione aunque la llame un usuario sin permisos? ¿Qué riesgo tiene usar esa keyword indiscriminadamente?

<details>
<summary>Respuesta</summary>

Necesitas `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION obtener_email_usuario(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER   -- se ejecuta con permisos del creador (postgres)
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = user_id
$$;
```

**El riesgo:** con `SECURITY DEFINER`, la función tiene los permisos del superadmin. Si la función tiene un error de lógica o es vulnerable a inyección SQL (raro en SQL puro pero posible en PL/pgSQL con `EXECUTE`), un usuario malintencionado podría ejecutar operaciones con privilegios totales sobre la base de datos. Por eso se usa solo cuando es estrictamente necesario, se documenta bien, y se revisa con cuidado.

</details>

---

### Funciones especiales: TRIGGER FUNCTIONS

Un tipo especial de función que no recibe parámetros normales sino que recibe automáticamente la fila afectada. Debe devolver `trigger`.

```sql
CREATE OR REPLACE FUNCTION mi_funcion_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 'NEW' contiene la nueva fila (en INSERT y UPDATE)
  -- 'OLD' contiene la fila anterior (en UPDATE y DELETE)
  RAISE NOTICE 'Se insertó el id: %', NEW.id;
  RETURN NEW;
END;
$$;
```

Las veremos en detalle en la sección de triggers.

### Ejercicio 3

Crea una función `es_mayor_de_edad(fecha_nacimiento date)` que devuelva `true` si la persona tiene 18 años o más, y `false` si no. Usa `LANGUAGE sql`.

> Pista: `CURRENT_DATE` es la fecha de hoy. `age(fecha)` calcula la edad. `EXTRACT(YEAR FROM age(fecha))` extrae los años.

<details>
<summary>Respuesta</summary>

```sql
CREATE OR REPLACE FUNCTION es_mayor_de_edad(fecha_nacimiento date)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXTRACT(YEAR FROM age(fecha_nacimiento)) >= 18
$$;

-- Probar:
SELECT es_mayor_de_edad('2000-01-01');  -- true
SELECT es_mayor_de_edad('2015-06-15');  -- false
```

</details>

---

## 4. Triggers

### ¿Qué es un trigger?

Un **trigger** (disparador) es una instrucción que le dice a PostgreSQL: *"cuando ocurra este evento en esta tabla, ejecuta automáticamente esta función"*.

El evento puede ser un `INSERT`, `UPDATE` o `DELETE`. El trigger se dispara solo, sin que nadie lo llame explícitamente.

```
Evento ocurre en la tabla
        ↓
PostgreSQL detecta el trigger
        ↓
Ejecuta la función asociada automáticamente
```

### ¿Por qué son importantes?

La lógica de un trigger vive en la base de datos, no en tu aplicación. Eso significa que se ejecuta **siempre**, independientemente de desde dónde llegue la operación: desde tu frontend, desde una petición directa a la API, desde el panel de administración, desde otro script. No se puede "saltar" por accidente.

Sin triggers, si necesitas hacer algo automático al insertar datos, tienes que recordar hacerlo en cada lugar del código desde donde se insertan. Con un trigger, lo defines una vez y la base de datos se encarga.

### Estructura de un trigger

Crear un trigger requiere dos pasos:

**1. Crear la función trigger** (ya vista en la sección anterior):

```sql
CREATE OR REPLACE FUNCTION nombre_funcion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- lógica usando NEW y/o OLD
  RETURN NEW;  -- obligatorio en BEFORE/AFTER INSERT y UPDATE
END;
$$;
```

**2. Crear el trigger que asocia la función al evento:**

```sql
CREATE TRIGGER nombre_trigger
  AFTER INSERT          -- cuándo: BEFORE o AFTER el evento
  ON nombre_tabla       -- en qué tabla
  FOR EACH ROW          -- para cada fila afectada
  EXECUTE FUNCTION nombre_funcion();
```

### BEFORE vs AFTER

- **`BEFORE`**: la función se ejecuta antes de que el cambio se escriba en la tabla. Puedes modificar `NEW` para cambiar los valores que se van a insertar.
- **`AFTER`**: la función se ejecuta después de que el cambio ya está guardado. `NEW` tiene los valores finales y no se puede modificar.

```sql
-- Ejemplo BEFORE: convertir el nombre a mayúsculas antes de insertar
CREATE OR REPLACE FUNCTION normalizar_nombre()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.nombre := upper(NEW.nombre);  -- modifica el valor antes de guardar
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_normalizar
  BEFORE INSERT ON empleados
  FOR EACH ROW
  EXECUTE FUNCTION normalizar_nombre();

-- Al insertar 'ana', se guarda 'ANA':
INSERT INTO empleados (nombre) VALUES ('ana');
SELECT nombre FROM empleados;  -- 'ANA'
```

```sql
-- Ejemplo AFTER: registrar en un log después de borrar
CREATE OR REPLACE FUNCTION registrar_borrado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO log_borrados (tabla, fila_id, borrado_en)
  VALUES ('empleados', OLD.id, now());
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_log_borrado
  AFTER DELETE ON empleados
  FOR EACH ROW
  EXECUTE FUNCTION registrar_borrado();
```

### Ejercicio: BEFORE vs AFTER

Tienes una tabla `pedidos` con una columna `total numeric`. Quieres que el `total` se calcule automáticamente al insertar el pedido, multiplicando `precio_unitario * cantidad`.

¿Deberías usar un trigger `BEFORE INSERT` o `AFTER INSERT`? Escribe la función trigger.

<details>
<summary>Respuesta</summary>

Debe ser **`BEFORE INSERT`**, porque necesitamos modificar `NEW.total` antes de que el dato se escriba en la tabla. Con `AFTER INSERT` el dato ya está guardado y no podemos cambiarlo.

```sql
CREATE TABLE pedidos_pizza (
  id             serial PRIMARY KEY,
  producto       text NOT NULL,
  precio_unit    numeric(8,2) NOT NULL,
  cantidad       int NOT NULL DEFAULT 1,
  total          numeric(8,2)   -- se calcula automáticamente
);

CREATE OR REPLACE FUNCTION calcular_total_pedido()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total := NEW.precio_unit * NEW.cantidad;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calcular_total
  BEFORE INSERT ON pedidos_pizza
  FOR EACH ROW
  EXECUTE FUNCTION calcular_total_pedido();

-- Al insertar, no hace falta especificar 'total':
INSERT INTO pedidos_pizza (producto, precio_unit, cantidad) VALUES ('Margarita', 9.50, 2);
SELECT total FROM pedidos_pizza;  -- 19.00
```

</details>

---

### La variable `NEW` y `OLD`

Dentro de una función trigger tienes acceso a variables especiales:

| Variable | Disponible en | Contiene |
|---|---|---|
| `NEW` | INSERT, UPDATE | La fila nueva (después del cambio) |
| `OLD` | UPDATE, DELETE | La fila anterior (antes del cambio) |

```sql
-- En un UPDATE puedes comparar el valor anterior y el nuevo:
CREATE OR REPLACE FUNCTION detectar_cambio_precio()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.precio <> NEW.precio THEN
    RAISE NOTICE 'Precio cambiado de % a %', OLD.precio, NEW.precio;
  END IF;
  RETURN NEW;
END;
$$;
```

### Ejercicio: NEW y OLD

Crea un trigger `BEFORE UPDATE` en la tabla `productos` que impida que el `stock` baje de 0. Si alguien intenta actualizar el stock a un valor negativo, el trigger debe lanzar un error con el mensaje `'El stock no puede ser negativo'` usando `RAISE EXCEPTION`.

<details>
<summary>Respuesta</summary>

```sql
CREATE TABLE productos (
  id     serial PRIMARY KEY,
  nombre text NOT NULL,
  stock  int NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION validar_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- NEW contiene los nuevos valores que se van a guardar
  IF NEW.stock < 0 THEN
    RAISE EXCEPTION 'El stock no puede ser negativo. Valor intentado: %', NEW.stock;
  END IF;

  RETURN NEW;  -- si pasa la validación, dejamos que el UPDATE continúe
END;
$$;

CREATE TRIGGER trigger_validar_stock
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION validar_stock();

-- Probar:
INSERT INTO productos (nombre, stock) VALUES ('Cerveza', 10);
UPDATE productos SET stock = 5 WHERE id = 1;   -- OK: 5 >= 0
UPDATE productos SET stock = -3 WHERE id = 1;  -- ERROR: El stock no puede ser negativo
```

`RAISE EXCEPTION` cancela la operación y devuelve el error al cliente. El `%` en el mensaje se reemplaza por el valor de `NEW.stock`, lo que ayuda a depurar.

</details>

---

### El trigger de Flex: crear perfil al registrarse

En Flex usamos un trigger para crear automáticamente una fila en `perfiles` cada vez que Supabase Auth registra un nuevo usuario en `auth.users`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER   -- necesario porque auth.users requiere permisos especiales
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre)
  VALUES (
    NEW.id,                                   -- UUID del nuevo usuario
    NEW.raw_user_meta_data->>'full_name'       -- nombre del JSON de metadata
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

Sin este trigger, cada vez que alguien se registrase tendríamos que acordarnos de crear el perfil desde el frontend. Con el trigger, es imposible que haya un usuario sin perfil.

### Ejercicio 4

Tienes estas dos tablas:

```sql
CREATE TABLE productos (
  id          serial PRIMARY KEY,
  nombre      text NOT NULL,
  stock       int NOT NULL DEFAULT 0,
  actualizado timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE movimientos_stock (
  id          serial PRIMARY KEY,
  producto_id int REFERENCES productos(id),
  cambio      int NOT NULL,        -- positivo = entrada, negativo = salida
  motivo      text,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
```

Crea un trigger que, cada vez que se inserte un movimiento en `movimientos_stock`, actualice automáticamente el `stock` y el `actualizado` del producto correspondiente.

<details>
<summary>Respuesta</summary>

```sql
CREATE OR REPLACE FUNCTION aplicar_movimiento_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE productos
  SET
    stock       = stock + NEW.cambio,
    actualizado = now()
  WHERE id = NEW.producto_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_movimiento_stock
  AFTER INSERT ON movimientos_stock
  FOR EACH ROW
  EXECUTE FUNCTION aplicar_movimiento_stock();

-- Probar:
INSERT INTO productos (nombre, stock) VALUES ('Cerveza', 100);
INSERT INTO movimientos_stock (producto_id, cambio, motivo) VALUES (1, -5, 'venta');
SELECT stock FROM productos WHERE id = 1;  -- 95
```

</details>

---

## 5. Buckets de Storage

### ¿Qué es Supabase Storage?

Supabase Storage es el sistema de almacenamiento de ficheros de Supabase. Permite guardar imágenes, vídeos, PDFs y cualquier tipo de archivo, y obtener una URL pública para acceder a ellos desde el navegador.

Es similar a servicios como Google Drive o Amazon S3, pero integrado directamente con tu base de datos y sistema de autenticación.

### ¿Qué es un bucket?

Un **bucket** es la unidad organizativa principal de Storage. Es como una carpeta raíz que contiene archivos. Cada bucket tiene sus propias reglas de acceso.

```
Storage
├── bucket: productos       ← fotos del menú (público)
│   ├── cerveza.jpg
│   ├── nachos.jpg
│   └── pack-cumple.jpg
│
└── bucket: salas-vip       ← fotos de las salas (público)
    ├── sala-roja.jpg
    └── sala-negra.jpg
```

### Bucket público vs privado

- **Público**: cualquier persona con la URL puede ver el archivo, sin autenticación. Útil para imágenes de productos, carteles, etc.
- **Privado**: se necesita un token de autenticación para acceder. Útil para documentos personales, facturas, etc.

### Crear buckets en SQL

Supabase guarda la configuración de los buckets en la tabla `storage.buckets`. Podemos crearlos directamente con SQL en una migración:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('productos', 'productos', true),
  ('salas-vip', 'salas-vip', true);
```

- `id` y `name` suelen ser iguales.
- `public = true` hace que los archivos sean accesibles sin autenticación.

### Ejercicio: crear buckets en SQL

Crea en SQL los buckets necesarios para un blog: uno público para las imágenes de los artículos (`articulos`) y uno privado para los borradores de los autores (`borradores`). ¿Por qué el segundo debe ser privado?

<details>
<summary>Respuesta</summary>

```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('articulos',  'articulos',  true),   -- las imágenes de los artículos son públicas
  ('borradores', 'borradores', false);  -- los borradores son privados
```

El bucket `borradores` debe ser **privado** porque contiene contenido sin publicar que solo el autor (o los editores autorizados) deben poder leer. Si fuera público, cualquier persona con la URL podría leer borradores no publicados antes de que el autor los revise.

</details>

---

### La URL de un archivo

Una vez subido un archivo, su URL sigue siempre el mismo patrón:

```
[URL_SUPABASE]/storage/v1/object/public/[BUCKET]/[NOMBRE_ARCHIVO]
```

Ejemplo en local:
```
http://localhost:54321/storage/v1/object/public/productos/cerveza.jpg
```

El método `getPublicUrl` del SDK de Supabase simplemente construye este string sin hacer ninguna petición de red. Lo usarás así desde JavaScript:

```js
const { data } = supabase.storage
  .from('productos')
  .getPublicUrl('cerveza.jpg')

console.log(data.publicUrl)
// http://localhost:54321/storage/v1/object/public/productos/cerveza.jpg
```

### Ejercicio: construir una URL pública a mano

Sin ejecutar código, construye manualmente la URL pública de un archivo llamado `sala-gold.jpg` en el bucket `salas-vip`, sabiendo que la URL base de Supabase local es `http://localhost:54321`.

Luego explica: si subes el archivo con `upload('fotos/sala-gold.jpg', ...)` (dentro de una subcarpeta), ¿cómo cambia la URL?

<details>
<summary>Respuesta</summary>

URL sin subcarpeta:
```
http://localhost:54321/storage/v1/object/public/salas-vip/sala-gold.jpg
```

Si subes con `upload('fotos/sala-gold.jpg', ...)`, la ruta completa forma parte del nombre del fichero en Storage. La URL sería:
```
http://localhost:54321/storage/v1/object/public/salas-vip/fotos/sala-gold.jpg
```

Supabase Storage admite rutas con subcarpetas. No son carpetas reales en el sistema operativo, sino que el `/` es simplemente parte del nombre del fichero. `getPublicUrl('fotos/sala-gold.jpg')` construirá la URL correcta automáticamente.

</details>

---

### Subir archivos

Para subir un archivo desde JavaScript:

```js
const { error } = await supabase.storage
  .from('productos')
  .upload('cerveza.jpg', archivoDelInput)

if (error) console.error(error)
```

Después obtienes la URL y la guardas en la base de datos:

```js
const { data } = supabase.storage
  .from('productos')
  .getPublicUrl('cerveza.jpg')

await supabase
  .from('productos')
  .update({ imagen_url: data.publicUrl })
  .eq('id', productoId)
```

### Ejercicio 5

Razona sin ejecutar código: tienes un bucket `documentos` creado con `public = false`. Un usuario no autenticado intenta acceder a la URL directa de un archivo. ¿Qué ocurrirá? ¿Y si el bucket fuera público pero el usuario no tiene permisos de `INSERT` en ese bucket?

<details>
<summary>Respuesta</summary>

**Bucket privado, usuario no autenticado:** Supabase devuelve un error 400 o 401. La URL directa no es accesible. Para acceder habría que generar una URL firmada temporal con `createSignedUrl`.

**Bucket público, sin permisos de INSERT:** El usuario puede **ver** archivos (lectura pública) pero no puede **subir** nuevos archivos. Las operaciones de escritura (upload, delete) están controladas por las políticas de Storage, que son independientes de si el bucket es público o no. La visibilidad pública solo afecta a la lectura.

</details>

---

## Resumen de conceptos

| Concepto | En una frase |
|---|---|
| **Extensión** | Plugin que activa funcionalidades opcionales de PostgreSQL |
| **NOT NULL** | La columna no puede estar vacía |
| **DEFAULT** | Valor automático si no se especifica |
| **CHECK** | La columna solo acepta valores que cumplan una condición |
| **UNIQUE** | No pueden existir dos filas con el mismo valor |
| **PRIMARY KEY** | Identificador único de cada fila (NOT NULL + UNIQUE) |
| **FOREIGN KEY** | El valor debe existir en otra tabla; conecta tablas |
| **EXCLUDE** | No pueden existir dos filas donde cierta condición sea verdadera |
| **Función** | Bloque de código reutilizable que vive en la base de datos |
| **Trigger** | Ejecuta una función automáticamente cuando ocurre un evento |
| **Bucket** | Carpeta raíz de Supabase Storage con sus propias reglas de acceso |

---

## Ejercicio final integrador

Diseña el esquema SQL de un sistema de reserva de pistas de pádel con las siguientes reglas:

1. Hay pistas identificadas por número (1, 2, 3…) y tipo (`'cubierta'` o `'exterior'`). Un número de pista solo puede existir una vez.
2. Los usuarios tienen nombre, email (único) y un nivel: `'principiante'`, `'intermedio'` o `'avanzado'`.
3. Una reserva tiene usuario, pista, hora de inicio y fin, y estado: `'confirmada'` o `'cancelada'`.
4. No pueden hacerse dos reservas de la misma pista en el mismo tramo horario (excepto si están canceladas).
5. Cuando un usuario se elimina, sus reservas deben eliminarse también.
6. Cada vez que se confirma una nueva reserva, debe registrarse automáticamente en una tabla `notificaciones` con el mensaje `'Nueva reserva confirmada'` y la fecha.

<details>
<summary>Respuesta</summary>

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE pistas (
  id     serial PRIMARY KEY,
  numero int NOT NULL UNIQUE,
  tipo   text NOT NULL CHECK (tipo IN ('cubierta', 'exterior'))
);

CREATE TABLE usuarios (
  id     serial PRIMARY KEY,
  nombre text NOT NULL,
  email  text NOT NULL UNIQUE,
  nivel  text NOT NULL DEFAULT 'principiante'
         CHECK (nivel IN ('principiante', 'intermedio', 'avanzado'))
);

CREATE TABLE reservas (
  id        serial PRIMARY KEY,
  usuario_id int NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pista_id   int NOT NULL REFERENCES pistas(id),
  inicio     timestamptz NOT NULL,
  fin        timestamptz NOT NULL,
  estado     text NOT NULL DEFAULT 'confirmada'
             CHECK (estado IN ('confirmada', 'cancelada')),

  CONSTRAINT sin_solapamiento_pista EXCLUDE USING gist (
    pista_id WITH =,
    tstzrange(inicio, fin) WITH &&
  ) WHERE (estado != 'cancelada')
);

CREATE TABLE notificaciones (
  id         serial PRIMARY KEY,
  usuario_id int REFERENCES usuarios(id) ON DELETE CASCADE,
  mensaje    text NOT NULL,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION notificar_reserva()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado = 'confirmada' THEN
    INSERT INTO notificaciones (usuario_id, mensaje)
    VALUES (NEW.usuario_id, 'Nueva reserva confirmada');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notificar_reserva
  AFTER INSERT ON reservas
  FOR EACH ROW
  EXECUTE FUNCTION notificar_reserva();
```

</details>

---

## Navegación

| | |
|---|---|
| | [01 — Base de Datos y Storage →](./01-db-y-storage-flex.md) |
