# 06 — Productos, CRUD y Storage

> Stack: Next.js · Supabase · Supabase Storage

---

## Qué vamos a hacer

1. Cargar productos y salas desde Supabase en Server Components
2. Permitir al administrador crear, editar y borrar productos con Server Actions
3. Subir imágenes al bucket `productos` de Supabase Storage
4. Separar la UI en componentes pequeños con responsabilidades claras

> Lee [06 — Teoría previa](./teoria/06-teoria-productos.md) antes de continuar.

---

## Piezas del puzzle

### Server Components para leer datos

`page.jsx` y `vip/page.jsx` son Server Components: hacen el `select` en el servidor y pasan los datos como props al componente cliente. No necesitan `useEffect` ni estado de carga.

```
page.jsx (servidor)
  → supabase.from('productos').select(...)
  → <CartaClient productos={productos} />

vip/page.jsx (servidor)
  → supabase.from('salas_vip').select(...)
  → <VipClient salas={salas} />
```

---

### Server Actions para escribir datos

Las operaciones de escritura (crear, editar, borrar) viven en `src/lib/actions/productos.js` con `'use server'`. El cliente las llama como si fueran funciones normales — Next.js gestiona la comunicación.

Después de cada escritura se llama a `revalidatePath` para que Next.js descarte la caché y la próxima visita lea los datos frescos.

---

### Supabase Storage para imágenes

Las imágenes se suben al bucket `productos`. El proceso al crear o editar un producto:

```
Cliente adjunta un File al FormData
  → Server Action recibe el File
  → sube el archivo a Storage con un nombre único (timestamp + extensión)
  → obtiene la URL pública
  → guarda esa URL en la columna imagen_url de la tabla productos
```

El bucket necesita políticas RLS propias — sin ellas, nadie puede leer ni escribir archivos aunque tenga acceso a la tabla.

---

### Separación de componentes

La UI del admin y de la carta se divide por responsabilidad:

```
admin/
  AdminClient.jsx    → stats + tabs, orquesta el resto
  TabUsuarios.jsx    → tabla de usuarios + lógica local
  TabProductos.jsx   → tabla de productos + CRUD
  ModalUsuario.jsx   → formulario crear usuario
  ModalProducto.jsx  → formulario crear/editar producto con preview de imagen

carta/
  CartaClient.jsx    → filtros + grid de productos
  ProductoCard.jsx   → tarjeta individual con botones +/−
  CarritoDrawer.jsx  → drawer, lista del carrito, modal de mesa y lógica del pedido
```

Cada archivo tiene una única razón para cambiar. Si el diseño del modal cambia, solo se toca `ModalProducto`. Si cambia la lógica del pedido, solo se toca `CarritoDrawer`.

---

## Flujo completo (crear producto con imagen)

```
Admin rellena el formulario y hace clic en "Crear"
  │
  ▼
TabProductos construye FormData (campos + File)
  │
  ▼
Server Action crearProducto(formData)  — corre en el servidor
  │
  ├── sube el File a Storage → obtiene URL pública
  │
  └── INSERT en tabla productos con imagen_url
        │
        └── revalidatePath('/admin') y revalidatePath('/')
              → Next.js descarta caché
              → próxima visita muestra el producto nuevo
```

---

[← 05 — Autenticación](./05-registro.md)
