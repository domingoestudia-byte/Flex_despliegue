# 06 — Teoría previa: Componentes, Storage y CRUD

> Objetivo: entender los conceptos que aparecen en el apunte 06 antes de leer el código

---

## Antes de empezar: ¿qué problema resuelven estos conceptos?

Imagina que tienes una cocina. Puedes tener un único cocinero que hace todo (toma el pedido, cocina, sirve, cobra), o puedes repartir: uno toma pedidos, otro cocina, otro sirve. La segunda opción es más lenta de montar, pero si algo falla sabes exactamente dónde.

En el código ocurre exactamente lo mismo. Un componente de 300 líneas que hace todo es difícil de mantener. Si lo partes en piezas pequeñas con responsabilidades claras, el resultado es más fácil de leer, de cambiar y de reutilizar.

---

## 1. Separación de responsabilidades

Cada pieza de código debería tener **una única razón para cambiar**. Si un componente gestiona el carrito Y muestra los productos Y lanza el pedido, cualquier cambio en una de esas tres cosas obliga a tocar el mismo archivo.

En la práctica:

```
CartaClient.jsx      → filtra y muestra la lista de productos
CarritoDrawer.jsx    → gestiona el estado del carrito y el pedido
ProductoCard.jsx     → muestra un producto individual con sus botones
```

Si mañana cambia el diseño de la tarjeta de producto, solo tocas `ProductoCard`. El carrito no se entera.

---

> ### 🏋️ Ejercicio 1
>
> Sin mirar el código, decide en qué archivo viviría cada cambio:
>
> 1. El botón de "Añadir" pasa a ser un icono sin texto
> 2. El drawer del carrito cierra automáticamente al añadir el primer producto
> 3. Los filtros de categoría pasan de botones a un desplegable (`<select>`)
> 4. El modal de confirmación de mesa añade un campo de "nombre del cliente"

<details>
<summary>Ver respuesta</summary>

1. `ProductoCard.jsx` — es el componente que renderiza cada tarjeta con su botón.
2. `CarritoDrawer.jsx` — controla cuándo se abre y cierra el drawer.
3. `CartaClient.jsx` — los filtros de categoría viven en el componente principal de la carta.
4. `CarritoDrawer.jsx` — el modal de confirmación es parte del flujo del carrito.

</details>

---

## 2. Composición de componentes

Componer significa **construir algo complejo uniendo piezas simples**. En React, un componente puede incluir otros componentes como si fueran etiquetas HTML.

```
CartaClient
  ├── (filtros — JSX directo)
  ├── ProductoCard  × N
  └── CarritoDrawer
        └── (modal de mesa — JSX directo)
```

Cada nivel conoce lo mínimo necesario. `CartaClient` no sabe cómo funciona el modal de mesa — solo sabe que existe `CarritoDrawer` y lo monta. Si el modal cambia por dentro, `CartaClient` no se entera.

---

> ### 🏋️ Ejercicio 2
>
> Dado este árbol de componentes:
>
> ```
> AdminClient
>   ├── TabUsuarios
>   │     └── ModalUsuario
>   └── TabProductos
>         └── ModalProducto
> ```
>
> Responde:
> 1. ¿Qué componente decide si se muestra `ModalUsuario`?
> 2. Si `AdminClient` necesita saber cuántos usuarios hay, ¿de dónde obtiene ese dato?
> 3. ¿Puede `TabProductos` acceder al estado de `TabUsuarios` directamente? ¿Por qué?

<details>
<summary>Ver respuesta</summary>

1. `TabUsuarios` — es quien controla el estado `modal` (abierto/cerrado) y renderiza `ModalUsuario` condicionalmente.
2. De `TabUsuarios` a través de un callback (`onUsuariosChange`). `TabUsuarios` llama a esa función cada vez que la lista cambia, y `AdminClient` actualiza su propio estado con el nuevo array.
3. No. Dos componentes hermanos no pueden acceder al estado del otro directamente. Si necesitan compartir datos, ese estado debe **subir** al padre común (`AdminClient`) que se lo pasa como props a cada uno.

</details>

---

## 3. Elevación de estado (Lifting State Up)

Cuando dos componentes necesitan compartir datos, el estado debe vivir en el **ancestro común más cercano**.

```
❌ Malo: cada componente tiene su propia copia del dato
   TabUsuarios → [usuarios: 4]
   AdminClient → [usuarios: ?]   ← no sabe el número real

✅ Bueno: el estado sube al componente que lo necesita
   AdminClient → [usuarios: 4]   ← tiene la verdad
        └── TabUsuarios          ← notifica cambios con onUsuariosChange()
```

La regla: el componente que **lee** el dato decide dónde vive. Si solo lo lee uno, vive ahí. Si lo leen varios, sube al padre.

---

> ### 🏋️ Ejercicio 3
>
> ¿Dónde debería vivir el estado en cada caso?
>
> 1. El filtro de categoría activo — solo lo usa `CartaClient` para filtrar la lista
> 2. Los ítems del carrito — los usan `CarritoDrawer` (para mostrarlos) y `ProductoCard` (para saber si un producto ya está añadido)
> 3. Si el drawer del carrito está abierto o cerrado — solo lo controla el botón flotante y el botón de cerrar, ambos dentro de `CarritoDrawer`

<details>
<summary>Ver respuesta</summary>

1. En `CartaClient` — solo él lo necesita, no hay razón para subirlo.
2. En una **store global** (Zustand) — lo necesitan componentes que no están en la misma rama del árbol. Subirlo hasta el ancestro común obligaría a pasarlo por varios niveles intermedios.
3. En `CarritoDrawer` — solo él lo usa. No hay que subirlo.

</details>

---

## 4. Supabase Storage

Supabase Storage es un servicio de almacenamiento de archivos, similar a Google Drive pero para tu app. Los archivos se organizan en **buckets** (carpetas raíz).

```
Storage
  └── bucket: productos
        ├── 1748000000000.jpg    ← imagen subida por el admin
        ├── 1748000000001.webp
        └── ...
```

Cada archivo subido obtiene una **URL pública** que cualquier navegador puede cargar directamente, sin pasar por tu servidor:

```
https://<proyecto>.supabase.co/storage/v1/object/public/productos/1748000000000.jpg
```

Esa URL es la que se guarda en la columna `imagen_url` de la tabla `productos`.

### RLS en Storage

Al igual que las tablas, los buckets tienen políticas RLS. Sin políticas, nadie puede leer ni escribir. Las tres operaciones básicas:

- **SELECT** — leer / descargar un archivo (normalmente público para imágenes)
- **INSERT** — subir un archivo nuevo
- **DELETE** — borrar un archivo

---

> ### 🏋️ Ejercicio 4
>
> En Flex, las políticas del bucket `productos` son:
> - SELECT: cualquiera (público)
> - INSERT: solo `admin`
> - DELETE: solo `admin`
>
> Responde:
> 1. ¿Puede un cliente ver las imágenes de los productos sin iniciar sesión?
> 2. ¿Qué error recibirías si un usuario con rol `staff` intenta subir una imagen?
> 3. ¿Por qué el SELECT es público pero el INSERT no?

<details>
<summary>Ver respuesta</summary>

1. Sí. La política SELECT no requiere autenticación — cualquier petición HTTP al bucket puede leer las imágenes. Es lo habitual para assets públicos como fotos de productos.
2. `new row violates row-level security policy` — Supabase evalúa la política INSERT, comprueba que el rol es `staff` (no `admin`) y rechaza la operación.
3. Porque leer imágenes es inocuo — cualquiera debería poder ver la carta. Pero subir archivos es una escritura que podría usarse para meter contenido malicioso, así que solo el admin tiene ese permiso.

</details>

---

## 5. CRUD y Server Actions

**CRUD** son las cuatro operaciones básicas sobre datos:

| Letra | Operación | SQL       | En Flex                  |
|-------|-----------|-----------|--------------------------|
| C     | Create    | INSERT    | Crear producto           |
| R     | Read      | SELECT    | Listar productos         |
| U     | Update    | UPDATE    | Editar producto          |
| D     | Delete    | DELETE    | Borrar producto          |

En Flex, las escrituras (C, U, D) se hacen desde **Server Actions** con la directiva `'use server'`. Esto significa que el código corre en el servidor — el cliente nunca ve la lógica de base de datos.

### `revalidatePath`

Cuando el admin crea o borra un producto, Next.js tiene en caché la lista anterior. `revalidatePath('/admin')` le dice a Next.js que descarte esa caché, para que la próxima visita a `/admin` lea los datos actualizados desde Supabase.

```
Admin borra producto
  → Server Action ejecuta DELETE en Supabase
  → revalidatePath('/admin') invalida la caché
  → Next.js rehace el fetch en la próxima visita
  → La lista aparece sin el producto borrado
```

---

> ### 🏋️ Ejercicio 5
>
> Traza qué ocurre paso a paso cuando el admin crea un producto con imagen:
>
> ```
> Admin rellena el formulario y hace clic en "Crear"
>   → ?
>   → ?
>   → ?
>   → ?
> ```

<details>
<summary>Ver respuesta</summary>

```
Admin rellena el formulario y hace clic en "Crear"
  → El cliente construye un FormData con los campos + el File de la imagen
  → Llama al Server Action crearProducto(formData) — el código corre en el servidor
  → El Server Action sube el File al bucket 'productos' de Supabase Storage
  → Obtiene la URL pública de la imagen y la incluye en el INSERT
  → Inserta la fila en la tabla 'productos' con imagen_url = esa URL
  → revalidatePath('/admin') y revalidatePath('/') invalidan la caché
  → El modal se cierra y la lista se actualiza con el nuevo producto
```

</details>

---

## Resumen visual

```
Admin (navegador)
  │
  │  FormData (campos + File de imagen)
  ▼
Server Action  ──→  Storage bucket 'productos'  ──→  URL pública
  │
  │  INSERT con imagen_url
  ▼
Tabla productos (Supabase)
  │
  │  revalidatePath
  ▼
Next.js descarta caché  →  próxima visita lee datos frescos
```

---

## Navegación

[← 05 — Teoría Auth](./05-teoria-auth.md)
