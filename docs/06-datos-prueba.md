# 06 — Datos de Prueba

> **Proyecto Flex** · Stack: Next.js · Supabase · Zustand · Stripe  
> Nivel: Principiante-Intermedio

---

## Introducción

Para probar la aplicación necesitamos datos realistas: productos en la carta, usuarios con distintos roles y pedidos en diferentes estados. Sin datos, las pantallas quedan vacías y no podemos comprobar que el flujo funciona correctamente.

En este apunte aprenderás a:

1. Insertar productos de prueba con distintas categorías y precios.
2. Subir imágenes al bucket `productos` de Supabase Storage y vincularlas.
3. Crear usuarios de prueba con los roles `cliente`, `staff`, `admin` y `portero`.
4. Generar pedidos con ítems y estados variados para poder probar la cocina, la barra y el historial.

Todo se hace desde el **SQL Editor** y el **Dashboard** de Supabase (local o remoto).

---

## 1. Productos de prueba

La tabla `productos` tiene estas columnas clave: `nombre`, `descripcion`, `precio`, `categoria` (`bebida`, `comida` o `pack`) y `disponible`.

```sql
-- Bebidas
insert into public.productos (nombre, descripcion, precio, categoria, disponible) values
  ('Agua mineral 50cl',  'Agua sin gas botella pequeña',         1.50, 'bebida', true),
  ('Refresco cola',      'Lata 33cl fría',                       2.00, 'bebida', true),
  ('Cerveza artesana',   'IPA local de barril, 33cl',            3.50, 'bebida', true),
  ('Gin-tonic premium',  'Ginebra Hendrick''s con tónica fever', 9.00, 'bebida', true),
  ('Mojito',             'Ron blanco, menta, lima y azúcar',     8.50, 'bebida', true),
  ('Zumo de naranja',    'Exprimido al momento',                  3.00, 'bebida', true);

-- Comidas
insert into public.productos (nombre, descripcion, precio, categoria, disponible) values
  ('Nachos con guacamole', 'Tortillas crujientes con guac casero', 7.50, 'comida', true),
  ('Patatas bravas',       'Con salsa picante y alioli',           5.00, 'comida', true),
  ('Tabla de quesos',      'Selección de quesos con mermelada',   12.00, 'comida', true),
  ('Alitas BBQ',           '8 unidades con salsa barbacoa',        9.00, 'comida', true),
  ('Burger Flex',          'Ternera, cheddar, bacon y pepinillos',13.00, 'comida', false);

-- Packs
insert into public.productos (nombre, descripcion, precio, categoria, disponible) values
  ('Pack Bienvenida',   '2 gin-tonics + nachos + patatas bravas', 28.00, 'pack', true),
  ('Pack Cumpleaños',   'Botella de cava + tabla de quesos',      45.00, 'pack', true),
  ('Pack Noche VIP',    'Botella premium + 4 refrescos + alitas', 60.00, 'pack', true);
```

> `disponible = false` en la Burger Flex sirve para probar que el frontend la oculta o la muestra como agotada.

---

## 2. Imágenes de productos en Supabase Storage

La columna `imagen_url` de `productos` guarda una URL pública del bucket `productos`. El flujo es:

```text
Sube imagen al bucket → copia la URL pública → UPDATE en SQL
```

### 2.1 Preparar imágenes

Necesitas 14 imágenes (una por producto). Puedes:

- **Descargarlas de Unsplash** ([unsplash.com](https://unsplash.com)) buscando términos como "craft beer", "nachos", "gin tonic", etc.
- **Crearlas con IA** (Midjourney, DALL-E, etc.) si quieres imágenes con la estética del local.
- **Usar placeholders temporales** con servicios como [food.design](https://food.design) o capturas de pantalla.

Nómbralas igual que el producto para no perder la referencia:

```text
agua-mineral.jpg
refresco-cola.jpg
cerveza-artesana.jpg
gintonic-premium.jpg
mojito.jpg
zumo-naranja.jpg
nachos-guacamole.jpg
patatas-bravas.jpg
tabla-quesos.jpg
alitas-bbq.jpg
burger-flex.jpg
pack-bienvenida.jpg
pack-cumpleanos.jpg
pack-noche-vip.jpg
```

### 2.2 Subir al bucket

Ve a **Storage → productos** en el Dashboard de Supabase (`http://localhost:54323` en local) y sube todos los archivos con **Upload files**.

El bucket `productos` ya es público (lo creamos en el apunte 01), así que cada archivo tendrá una URL pública inmediatamente.

### 2.3 Obtener la URL base

La URL de un archivo sigue este patrón:

**Local:**

```text
http://localhost:54321/storage/v1/object/public/productos/<nombre-archivo>
```

**Producción (Supabase Cloud):**

```text
https://<tu-proyecto>.supabase.co/storage/v1/object/public/productos/<nombre-archivo>
```

Puedes copiar la URL exacta haciendo clic en el archivo → **Get URL** en el Dashboard.

### 2.4 Vincular imágenes a productos

Una vez subidas, actualiza `imagen_url` en cada producto. Ajusta la URL base según tu entorno:

```sql
-- Cambia esta variable por tu URL base real
-- Local: http://localhost:54321/storage/v1/object/public/productos
-- Cloud: https://<proyecto>.supabase.co/storage/v1/object/public/productos

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/agua-mineral.jpg'
  where nombre = 'Agua mineral 50cl';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/refresco-cola.jpg'
  where nombre = 'Refresco cola';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/cerveza-artesana.jpg'
  where nombre = 'Cerveza artesana';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/gintonic-premium.jpg'
  where nombre = 'Gin-tonic premium';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/mojito.jpg'
  where nombre = 'Mojito';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/zumo-naranja.jpg'
  where nombre = 'Zumo de naranja';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/nachos-guacamole.jpg'
  where nombre = 'Nachos con guacamole';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/patatas-bravas.jpg'
  where nombre = 'Patatas bravas';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/tabla-quesos.jpg'
  where nombre = 'Tabla de quesos';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/alitas-bbq.jpg'
  where nombre = 'Alitas BBQ';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/burger-flex.jpg'
  where nombre = 'Burger Flex';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/pack-bienvenida.jpg'
  where nombre = 'Pack Bienvenida';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/pack-cumpleanos.jpg'
  where nombre = 'Pack Cumpleaños';

update public.productos set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/pack-noche-vip.jpg'
  where nombre = 'Pack Noche VIP';
```

### 2.5 Verificar

```sql
select nombre, imagen_url
from public.productos
order by categoria, nombre;
```

Todos los productos deberían tener `imagen_url` no nula. Si alguno está vacío, el archivo no se subió o el nombre no coincide.

> **Tip:** En el frontend, cuando `imagen_url` sea `null`, muestra un placeholder (`/img/producto-sin-imagen.jpg`). Así la carta nunca queda rota aunque falte alguna imagen.

---

## 3. Usuarios de prueba

Los usuarios en Supabase se crean en dos pasos:

1. Registrar el usuario en `auth.users` (gestiona la autenticación).
2. El trigger `on_auth_user_created` inserta automáticamente una fila en `public.perfiles`.
3. Si necesitas cambiar el rol, actualizas `public.perfiles` manualmente.

### 2.1 Crear usuarios desde el Dashboard de Supabase

Ve a **Authentication → Users → Add user** y crea estos cuatro:

| Email                        | Contraseña   | Rol a asignar |
|------------------------------|--------------|---------------|
| `cliente@flex.test`          | `Test1234!`  | `cliente`     |
| `staff@flex.test`            | `Test1234!`  | `staff`       |
| `admin@flex.test`            | `Test1234!`  | `admin`       |
| `portero@flex.test`          | `Test1234!`  | `portero`     |

> La contraseña debe tener al menos 6 caracteres. `Test1234!` cumple los requisitos por defecto de Supabase.

### 2.2 Asignar roles

El trigger crea el perfil con `rol = 'cliente'` por defecto. Ejecuta esto en el SQL Editor para asignar los roles correctos:

```sql
-- Staff
update public.perfiles
set rol = 'staff'
where id = (
  select id from auth.users where email = 'staff@flex.test'
);

-- Admin
update public.perfiles
set rol = 'admin'
where id = (
  select id from auth.users where email = 'admin@flex.test'
);

-- Portero
update public.perfiles
set rol = 'portero'
where id = (
  select id from auth.users where email = 'portero@flex.test'
);
```

### 2.3 Verificar

```sql
select u.email, p.nombre, p.rol
from auth.users u
join public.perfiles p on p.id = u.id
order by p.rol;
```

Deberías ver los cuatro usuarios con sus roles correctos.

---

## 3. Pedidos de prueba

Un pedido tiene: `mesa_id`, `cliente_id`, `estado` y `total`. Los ítems van en `pedido_items`.

Primero necesitamos los IDs del cliente de prueba y de algunas mesas.

```sql
-- Guarda el ID del cliente en una variable para reutilizarlo
do $$
declare
  v_cliente uuid;
  v_pedido1 bigint;
  v_pedido2 bigint;
  v_pedido3 bigint;
begin

  select id into v_cliente
  from auth.users where email = 'cliente@flex.test';

  -- Pedido 1: pendiente en mesa 1 planta 1
  insert into public.pedidos (mesa_id, cliente_id, estado, total)
  values (
    (select id from public.mesas where numero = 1 and piso = 1),
    v_cliente,
    'pendiente',
    13.50
  )
  returning id into v_pedido1;

  insert into public.pedido_items (pedido_id, producto_id, cantidad, precio_unit) values
    (v_pedido1, (select id from public.productos where nombre = 'Cerveza artesana'),  2, 3.50),
    (v_pedido1, (select id from public.productos where nombre = 'Patatas bravas'),    1, 5.00);

  -- Pedido 2: en_barra en mesa 3 planta 1
  insert into public.pedidos (mesa_id, cliente_id, estado, total)
  values (
    (select id from public.mesas where numero = 3 and piso = 1),
    v_cliente,
    'en_barra',
    28.00
  )
  returning id into v_pedido2;

  insert into public.pedido_items (pedido_id, producto_id, cantidad, precio_unit) values
    (v_pedido2, (select id from public.productos where nombre = 'Pack Bienvenida'), 1, 28.00);

  -- Pedido 3: entregado en mesa 2 planta 2
  insert into public.pedidos (mesa_id, cliente_id, estado, total)
  values (
    (select id from public.mesas where numero = 2 and piso = 2),
    v_cliente,
    'entregado',
    17.50
  )
  returning id into v_pedido3;

  insert into public.pedido_items (pedido_id, producto_id, cantidad, precio_unit) values
    (v_pedido3, (select id from public.productos where nombre = 'Gin-tonic premium'),  1, 9.00),
    (v_pedido3, (select id from public.productos where nombre = 'Nachos con guacamole'), 1, 7.50),
    (v_pedido3, (select id from public.productos where nombre = 'Agua mineral 50cl'),  1, 1.00);

end $$;
```

### 3.1 Verificar los pedidos

```sql
select
  p.id,
  m.numero as mesa,
  m.piso,
  p.estado,
  p.total,
  count(pi.id) as num_items
from public.pedidos p
join public.mesas m on m.id = p.mesa_id
join public.pedido_items pi on pi.pedido_id = p.id
group by p.id, m.numero, m.piso, p.estado, p.total
order by p.id;
```

Deberías ver 3 pedidos con 2, 1 y 3 ítems respectivamente.

---

## 4. Limpiar los datos de prueba

Cuando quieras empezar de cero sin borrar la estructura de tablas:

```sql
-- Borra en orden para respetar las foreign keys
delete from public.pedido_items;
delete from public.pedidos;
delete from public.productos;

-- Para los usuarios: ve a Authentication → Users en el Dashboard
-- y bórrales manualmente, o usa:
delete from auth.users
where email in (
  'cliente@flex.test',
  'staff@flex.test',
  'admin@flex.test',
  'portero@flex.test'
);
```

> Borrar de `auth.users` dispara el cascade y elimina también el perfil en `public.perfiles`.

---

## Resumen

| Qué insertamos   | Cantidad | Dónde |
|------------------|----------|-------|
| Productos        | 14 (6 bebidas, 5 comidas, 3 packs) | `public.productos` |
| Usuarios         | 4 (uno por rol) | `auth.users` + `public.perfiles` |
| Pedidos          | 3 (pendiente, en_barra, entregado) | `public.pedidos` + `public.pedido_items` |

Con esto puedes probar login con cada rol, ver la carta completa, y observar pedidos en distintos estados desde la vista de staff.
