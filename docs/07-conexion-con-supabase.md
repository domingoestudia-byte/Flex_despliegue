# 07 — Conexión con Supabase

> **Proyecto Flex** · Stack: Next.js · Supabase · Zustand · Stripe  
> Nivel: Principiante-Intermedio

---

## Introducción

Hasta ahora la aplicación usa datos ficticios en arrays JavaScript: los productos están hardcodeados en `page.jsx` y el botón "Confirmar pedido" no hace nada real. En este apunte conectaremos Next.js con Supabase para que:

1. Los productos se lean de la tabla `productos` de la base de datos.
2. Al confirmar un pedido se creen filas reales en las tablas `pedidos` y `pedido_items`.
3. Al confirmar una reserva VIP se cree una fila real en `reservas_vip`.

Todo esto usando el **cliente oficial de Supabase para JavaScript** (`@supabase/supabase-js`).

---

## 1. Instalar el SDK de Supabase

Desde la carpeta de la aplicación web:

```bash
cd apps/web
npm install @supabase/supabase-js
```

---

## 2. Crear el cliente de Supabase

Vamos a crear un único archivo que exporte el cliente ya configurado. Así no repetimos la inicialización en cada página.

```
apps/web/src/
  lib/
    supabase.js    ← cliente de Supabase listo para usar
```

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnon)
```

> **¿Por qué `NEXT_PUBLIC_`?**  
> Las páginas de pedidos y reservas se renderizan en el cliente (llevan `'use client'`). Solo las variables con el prefijo `NEXT_PUBLIC_` están disponibles en el navegador. La `anon key` es segura en el cliente porque las políticas RLS (apunte 02) limitan qué puede leer y escribir.

Comprueba que `.env.local` (en `apps/web/`) tiene los valores correctos antes de continuar:

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Cargar productos desde la base de datos

En `src/app/page.jsx` los productos están en el array `PRODUCTOS`. Vamos a sustituirlo por una consulta real a Supabase cuando el componente se monta.

### Cambios en `src/app/page.jsx`

```jsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCarritoStore } from '@/store/carritoStore'
import { ShoppingCart, Plus, Minus, X } from 'lucide-react'

const CATEGORIAS = ['Todo', 'Bebida', 'Comida']

export default function PaginaPedir() {
  const { items, mesaNumero, setMesaNumero, agregarItem, quitarItem, eliminarItem, vaciarCarrito } = useCarritoStore()

  const totalItems = useCarritoStore((s) => s.items.reduce((acc, i) => acc + i.cantidad, 0))
  const total      = useCarritoStore((s) => s.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0))

  const [productos, setProductos]     = useState([])
  const [cargando, setCargando]       = useState(true)
  const [cat, setCat]                 = useState('Todo')
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [pedidoEnviado, setPedidoEnviado]   = useState(false)
  const [modalMesa, setModalMesa]           = useState(false)
  const [enviando, setEnviando]             = useState(false)
  const [error, setError]                   = useState(null)

  // ── Cargar productos al montar ──────────────────────────────────────────────
  useEffect(() => {
    async function cargarProductos() {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, descripcion, precio, categoria, imagen_url')
        .eq('disponible', true)
        .order('categoria')

      if (error) {
        console.error('Error al cargar productos:', error.message)
      } else {
        setProductos(data)
      }
      setCargando(false)
    }

    cargarProductos()
  }, [])

  // ── Filtrar por categoría ───────────────────────────────────────────────────
  const productosFiltrados =
    cat === 'Todo'
      ? productos
      : productos.filter((p) => p.categoria.toLowerCase() === cat.toLowerCase())

  // ── Confirmar pedido ────────────────────────────────────────────────────────
  async function handleConfirmarPedido(e) {
    e.preventDefault()
    if (!mesaNumero || items.length === 0) return

    setEnviando(true)
    setError(null)

    // 1. Buscar el id de la mesa a partir del número visible en la mesa
    const { data: mesaData, error: mesaError } = await supabase
      .from('mesas')
      .select('id')
      .eq('numero', mesaNumero)
      .single()

    if (mesaError || !mesaData) {
      setError('Mesa no encontrada. Comprueba el número e inténtalo de nuevo.')
      setEnviando(false)
      return
    }

    // 2. Crear el pedido (estado inicial: 'pendiente')
    const totalPedido = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({ mesa_id: mesaData.id, estado: 'pendiente', total: totalPedido })
      .select('id')
      .single()

    if (pedidoError) {
      setError('No se pudo crear el pedido. Inténtalo de nuevo.')
      setEnviando(false)
      return
    }

    // 3. Insertar los ítems del pedido
    const itemsParaInsertar = items.map((i) => ({
      pedido_id:   pedido.id,
      producto_id: i.id,
      cantidad:    i.cantidad,
      precio_unit: i.precio,
    }))

    const { error: itemsError } = await supabase
      .from('pedido_items')
      .insert(itemsParaInsertar)

    if (itemsError) {
      setError('El pedido se creó pero hubo un problema al guardar los productos.')
      setEnviando(false)
      return
    }

    // 4. Todo bien: vaciar carrito y mostrar confirmación
    setModalMesa(false)
    setPedidoEnviado(true)
    vaciarCarrito()
    setEnviando(false)

    setTimeout(() => {
      setPedidoEnviado(false)
      setCarritoAbierto(false)
    }, 3000)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="text-zinc-500 text-sm">Cargando carta…</p>
      </div>
    )
  }

  // El resto del JSX (filtros, grid, drawer, modal) queda igual que antes.
  // Solo sustituye el array PRODUCTOS por la variable `productosFiltrados`.
  return (
    // ... misma estructura JSX del apunte anterior ...
  )
}
```

### ¿Qué hace cada paso?

| Paso | Código | Qué ocurre en la BD |
|------|--------|---------------------|
| Cargar productos | `.from('productos').select(...)` | `SELECT` sobre la tabla `productos` |
| Buscar mesa | `.from('mesas').eq('numero', mesaNumero).single()` | `SELECT id FROM mesas WHERE numero = ?` |
| Crear pedido | `.from('pedidos').insert(...)` | `INSERT INTO pedidos ...` → devuelve el `id` generado |
| Insertar ítems | `.from('pedido_items').insert([...])` | `INSERT INTO pedido_items ... (varios a la vez)` |

> **`.single()`** le dice a Supabase que esperamos exactamente una fila. Si no la encuentra, devuelve error. Si hay más de una, también devuelve error. Úsalo cuando sabes que el resultado debe ser único (buscar por clave primaria o campo único).

---

## 4. Crear reservas VIP en la base de datos

En `src/app/vip/page.jsx` el botón "Confirmar reserva" solo actualiza el estado local. Vamos a hacer que inserte una fila real en la tabla `reservas_vip`.

### Cambios en `src/app/vip/page.jsx`

Añade la importación del cliente al principio del archivo:

```jsx
import { supabase } from '@/lib/supabase'
```

Añade los estados necesarios para manejar el envío:

```jsx
const [enviando, setEnviando] = useState(false)
const [error, setError]       = useState(null)
```

Sustituye la función `reservar` por esta versión que habla con Supabase:

```jsx
async function reservar() {
  if (!puedeReservar) return

  setEnviando(true)
  setError(null)

  // Calcular timestamps de inicio y fin
  const horas  = parseInt(duracion)                        // '2 horas' → 2
  const inicio = new Date(`${fecha}T${hora}:00`)
  const fin    = new Date(inicio.getTime() + horas * 60 * 60 * 1000)

  const { error: reservaError } = await supabase
    .from('reservas_vip')
    .insert({
      sala_id:    salaSeleccionada,   // id entero de la sala en BD
      inicio:     inicio.toISOString(),
      fin:        fin.toISOString(),
      estado:     'pendiente',        // pendiente hasta que se pague con Stripe
      precio_total: subtotal,
    })

  if (reservaError) {
    setError('No se pudo guardar la reserva. Inténtalo de nuevo.')
    setEnviando(false)
    return
  }

  setReservado(true)
  setEnviando(false)
}
```

Muestra el botón en estado de carga y el posible error:

```jsx
{error && (
  <p className="text-red-400 text-xs mt-2">{error}</p>
)}

<button
  onClick={reservar}
  disabled={!puedeReservar || enviando}
  className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl transition-colors"
>
  {enviando ? 'Guardando…' : 'Confirmar reserva'}
</button>
```

> **¿Por qué `estado: 'pendiente'`?**  
> La reserva se crea en la BD pero el pago aún no se ha realizado. En el apunte 08 (Stripe) el webhook actualizará el estado a `'pagada'` cuando Stripe confirme el cobro.

---

## 5. Probar que todo funciona

### Verificar la carga de productos

1. Arranca Supabase local: `npx supabase start`
2. Abre el Studio (`http://localhost:54323`) y comprueba que la tabla `productos` tiene filas (si no, ve al apunte 06 — Datos de Prueba).
3. Arranca Next.js: `npm run dev`
4. Abre `http://localhost:3000`. Deberías ver los productos de la BD en lugar de los hardcodeados.

### Verificar la creación de un pedido

1. Añade productos al carrito y pulsa "Enviar pedido".
2. Introduce el número de una mesa que exista en tu BD (ej. `1`).
3. Pulsa "Confirmar pedido".
4. En el Studio, abre la tabla `pedidos` → deberías ver una nueva fila con `estado = 'pendiente'`.
5. Abre la tabla `pedido_items` → deberías ver una fila por cada producto que añadiste.

### Verificar la creación de una reserva

1. Ve a `/vip`, selecciona una sala, elige fecha, hora y duración.
2. Pulsa "Confirmar reserva".
3. En el Studio, abre la tabla `reservas_vip` → deberías ver la nueva reserva con `estado = 'pendiente'`.

---

## 6. Errores frecuentes

| Error | Causa probable | Solución |
|-------|---------------|----------|
| `Failed to fetch` | Supabase no está corriendo | `npx supabase start` |
| `JWT expired` | La `anon key` en `.env.local` no coincide con la que genera Supabase local | Copia la clave de `npx supabase status` |
| `new row violates row-level security policy` | RLS activado sin política de INSERT para `anon` | Añade la política de INSERT del apunte 02, o desactiva RLS temporalmente en esa tabla para pruebas |
| `null value in column "user_id"` | La tabla exige `user_id` pero el usuario no está autenticado | Ver apunte 05 (Registro y Login) para la autenticación |
| Mesa no encontrada | El número introducido no existe en la tabla `mesas` | Inserta mesas de prueba desde el Studio o con el SQL del apunte 06 |

---

## Resumen

```
src/lib/supabase.js          ← cliente compartido (importar desde aquí siempre)

src/app/page.jsx
  useEffect → supabase.from('productos').select(...)   ← carga la carta
  handleConfirmarPedido
    → supabase.from('mesas').eq('numero', ...).single()  ← resuelve id de mesa
    → supabase.from('pedidos').insert(...)               ← crea el pedido
    → supabase.from('pedido_items').insert([...])        ← crea los ítems

src/app/vip/page.jsx
  reservar
    → supabase.from('reservas_vip').insert(...)          ← crea la reserva
```

Con esto la aplicación ya lee y escribe datos reales en Supabase. El siguiente paso es añadir autenticación (apunte 05) para que cada pedido y reserva quede vinculado al usuario que los creó.
