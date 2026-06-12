# 07 — Pagos con Stripe

> **Proyecto Flex** · Stack: Next.js · Supabase · Stripe  
> Antes de continuar, lee [07 — Teoría: Cómo funciona Stripe](./teoria/07-teoria-stripe.md)

---

## ¿Qué vamos a conseguir?

El usuario puede pagar dos cosas distintas, cada una con su propio checkout independiente:

**Reserva de sala**
- El usuario elige una sala, una fecha y una hora
- Solo puede reservar una sala a la vez
- Paga y se genera un QR de entrada

**Pedido de productos**
- El usuario elige comida y bebida (varios productos a la vez)
- Es un pago completamente independiente de la reserva
- Cuando se paga, el pedido pasa a la cocina/barra para prepararse

En los dos casos: la primera vez introduce su tarjeta, las siguientes **ya no hace falta** — Stripe la recuerda.

Todo el código vive dentro de la app de Next.js, en `apps/web/`. No hay Edge Functions ni Deno.

Vamos a construirlo siguiendo el mismo camino que recorre la petición: empezamos por lo que el usuario toca (el botón) y vamos bajando capa a capa hasta llegar a Stripe.

```
apps/web/src/
├── app/
│   ├── api/
│   │   ├── pagos/
│   │   │   └── route.js     ← Paso 6: crea la sesión de pago en Stripe (ya existe, la completamos)
│   │   └── webhook/
│   │       └── route.js     ← Paso 7: recibe el aviso de Stripe
│   └── reserva/exito/
│       └── page.jsx         ← Paso 9: página que ve el usuario tras pagar
├── lib/
│   └── actions/
│       ├── reservas.js      ← Paso 5: ya existe, la ampliamos para que pague
│       └── pedidos.js       ← Paso 5: ya existe, la ampliamos para que pague
└── components/
    ├── vip/VipClient.jsx      ← Paso 4: lo adaptamos
    └── BotonPagarPedido.jsx   ← Paso 4: nuevo
```

---

## Paso 1 — Instalar Stripe

Dentro de `apps/web/`:

```bash
npm install stripe
```

---

## Paso 2 — Conseguir las claves de Stripe

1. Entra en [dashboard.stripe.com](https://dashboard.stripe.com)
2. Ve a **Developers → API keys**
3. Copia las dos claves y ponlas en `apps/web/.env.local`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # clave pública
STRIPE_SECRET_KEY=sk_test_...                     # clave secreta (solo servidor)
STRIPE_WEBHOOK_SECRET=whsec_...                   # se obtiene en el Paso 8
```

> La clave secreta es como la contraseña de tu cuenta de Stripe. Nunca la pongas en código que llegue al navegador.

---

## Paso 3 — Actualizar la base de datos

Las tablas `reservas`, `pedidos` y `pedido_items` **ya existen**. Solo hay que añadir las columnas que necesita Stripe.

Antes de tocar nada, es importante entender la diferencia entre los dos campos de estado:

| Campo | Tabla | Qué significa |
|---|---|---|
| `estado` | `pedidos` | Estado de cocina: `pendiente → en_barra → listo → entregado` |
| `estado_pago` | `pedidos` y `reservas` | Si se ha cobrado o no: `pendiente → pagado → cancelado` |

Son dos cosas distintas. Un pedido puede estar `en_barra` (lo está preparando el barman) y al mismo tiempo tener `estado_pago = 'pagado'` (ya se cobró). O puede estar `pendiente` en cocina pero aún no pagado.

Las columnas de Stripe ya están incluidas en el esquema inicial (`supabase/migrations/20260518105257_esquema_inicial.sql`). Solo tienes que resetear la base de datos para que se apliquen:

```bash
npx supabase db reset
```

> Si miras el esquema verás que `perfiles` tiene ahora `stripe_customer_id`, `pedidos` tiene `stripe_session`, `stripe_payment` y `estado_pago` (las tres son nuevas), y `reservas` tiene `estado_pago` (la única nueva — `stripe_session`, `stripe_payment` y `qr_token` ya existían de antes).

---

## Paso 4 — Conectar el botón con el pago

Empezamos por donde empieza todo: el usuario pulsa "Pagar". Este botón va a llamar a una Server Action — la construiremos en el Paso 5 — pero veamos primero cómo queda el lado del cliente.

```
Usuario pulsa "Pagar"  ◄─── aquí estamos
        │
        ▼
Server Action (Paso 5)
        │
        ▼
Botón redirige al usuario a la URL de Stripe que devuelve la action
```

### Reservas — adaptar `VipClient.jsx`

`VipClient.jsx` ya tiene un botón que llama a `crearReserva` y muestra "¡Reserva confirmada!" al momento. Ahora, en vez de confirmar al instante, queremos mandar al usuario a pagar. El cambio es mínimo: llamamos a `iniciarPagoReserva` (que crea la reserva y además abre el checkout) y redirigimos a la URL que devuelve.

```jsx
// apps/web/src/components/vip/VipClient.jsx
'use client'

import { iniciarPagoReserva } from '@/lib/actions/reservas'  // 👈 antes: crearReserva
import { useRouter } from 'next/navigation'                   // 👈 nuevo import
// ...el resto de imports igual

export default function VipClient({ salas }) {
  const router = useRouter()  // 👈 nuevo

  // ...estado igual: salaSeleccionada, fecha, hora, duracion...

  function reservar() {
    if (!puedeReservar) return
    setError(null)
    startTransition(async () => {
      try {
        // antes: await crearReserva({ ... }); setReservado(true)
        const url = await iniciarPagoReserva({
          sala_id: salaSeleccionada,
          fecha,
          hora,
          duracionHoras: horas,
        })
        router.push(url)  // 👈 mandamos al usuario a la página de pago de Stripe
      } catch (err) {
        setError(err.message)
      }
    })
  }

  // ...el resto del componente igual (la pantalla de "reservado" ya no
  // hace falta aquí — la confirmación ahora vive en /reserva/exito, Paso 9)
}
```

> Nota: aunque la función `iniciarPagoReserva` todavía no existe — la escribimos en el Paso 5 — ya sabemos qué forma tiene: recibe los datos de la reserva y devuelve una URL a la que redirigir. Eso es lo único que necesita saber este componente.

### Pedido de productos — `BotonPagarPedido`

Este botón es nuevo. Lo añadimos donde tengas el carrito de la carta (`components/carta/`):

```jsx
// apps/web/src/components/BotonPagarPedido.jsx
'use client'

import { iniciarPagoPedido } from '@/lib/actions/pedidos'
import { useRouter } from 'next/navigation'

export default function BotonPagarPedido({ carrito }) {
  // carrito → [{ producto_id, nombre, precio_unit, cantidad }, ...]
  const router = useRouter()

  const total = carrito.reduce((sum, p) => sum + p.precio_unit * p.cantidad, 0)

  async function handlePagar() {
    try {
      const url = await iniciarPagoPedido(carrito)
      router.push(url)
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <button onClick={handlePagar} disabled={carrito.length === 0}>
      Pagar pedido {total.toFixed(2)} € →
    </button>
  )
}
```

---

## Paso 5 — Server Actions

Los botones del Paso 4 llaman a dos funciones que todavía no existen: `iniciarPagoReserva` e `iniciarPagoPedido`. Vamos a crearlas.

```
Botón "Pagar" (Paso 4)
        │
        ▼
Server Action  ◄─── aquí estamos
  · comprueba que el usuario está logado
  · crea la reserva o el pedido en la DB (estado_pago: 'pendiente')
  · llama a /api/pagos (Paso 6)
  · devuelve la URL de Stripe al botón
```

Las funciones que llaman a `/api/pagos` son casi idénticas para reservas y pedidos, así que metemos esa parte común en un helper compartido:

```js
// apps/web/src/lib/pagos.js

// Llama a /api/pagos y devuelve la URL de la página de pago de Stripe
export async function crearCheckout({ tipo, id, items, user }) {
  const resp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/pagos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo,
      id,
      items,
      clienteId:    user.id,
      clienteEmail: user.email,
    }),
  })

  if (!resp.ok) {
    const err = await resp.json()
    throw new Error(err.error ?? 'Error al crear el checkout')
  }

  const { url } = await resp.json()
  return url
}
```

> Igual que antes: `crearCheckout` llama a `/api/pagos`, una ruta que aún no hemos escrito (Paso 6). Sabemos qué le tenemos que mandar y qué nos va a devolver — eso basta para seguir avanzando.

### Reservas — `lib/actions/reservas.js`

Ya existe `crearReserva`. Solo hace falta un pequeño cambio: que devuelva la reserva creada con `.select().single()`, para poder leer su `id`. Y añadimos `iniciarPagoReserva`, que la usa y pasa al checkout.

```js
// apps/web/src/lib/actions/reservas.js
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { crearCheckout } from '@/lib/pagos'

export async function crearReserva({ sala_id, fecha, hora, duracionHoras }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const inicio = new Date(`${fecha}T${hora}:00`)
  const fin    = new Date(inicio.getTime() + duracionHoras * 60 * 60 * 1000)

  const { data: sala } = await supabase
    .from('salas_vip')
    .select('precio_hora')
    .eq('id', sala_id)
    .single()

  const total = sala ? sala.precio_hora * duracionHoras : 0

  // Antes solo hacíamos .insert(...) — ahora encadenamos .select().single()
  // para recuperar la fila creada y poder leer su id
  const { data: reserva, error } = await supabase
    .from('reservas')
    .insert({
      sala_id,
      cliente_id: user.id,
      inicio:     inicio.toISOString(),
      fin:        fin.toISOString(),
      estado:     'pendiente',
      total,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/mi-area')
  return reserva
}

// Crea la reserva y, a continuación, la sesión de pago en Stripe
export async function iniciarPagoReserva({ sala_id, fecha, hora, duracionHoras }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const reserva = await crearReserva({ sala_id, fecha, hora, duracionHoras })

  return crearCheckout({
    tipo: 'reserva',
    id: reserva.id,
    items: [{
      nombre:   `Reserva sala · ${new Date(reserva.inicio).toLocaleDateString('es-ES')}`,
      precio:   reserva.total,
      cantidad: 1,
    }],
    user,
  })
}
```

> Recuerda: solo se puede reservar **una sala a la vez** — eso ya lo garantiza la base de datos con la restricción `sin_solapamiento` que viste en el esquema.

### Pedidos — `lib/actions/pedidos.js`

Ya existe `avanzarPedido` (la usa el staff para mover el pedido por cocina). Añadimos `crearPedido` e `iniciarPagoPedido`, que es lo que dispara el cliente al pagar su comanda.

```js
// apps/web/src/lib/actions/pedidos.js
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { crearCheckout } from '@/lib/pagos'

export async function avanzarPedido(id, estadoActual) {
  const SIGUIENTE = { pendiente: 'en_barra', en_barra: 'listo', listo: 'entregado' }
  const siguiente = SIGUIENTE[estadoActual]
  if (!siguiente) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('pedidos')
    .update({ estado: siguiente })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/staff')
}

// productos → [{ producto_id, nombre, precio_unit, cantidad }, ...]
async function crearPedido(productos) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const total = productos.reduce((sum, p) => sum + p.precio_unit * p.cantidad, 0)

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .insert({ cliente_id: user.id, total, estado: 'pendiente' })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('pedido_items').insert(
    productos.map((p) => ({
      pedido_id:   pedido.id,
      producto_id: p.producto_id,
      cantidad:    p.cantidad,
      precio_unit: p.precio_unit,
    }))
  )

  return pedido
}

// Crea el pedido y, a continuación, la sesión de pago en Stripe
export async function iniciarPagoPedido(productos) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const pedido = await crearPedido(productos)

  return crearCheckout({
    tipo: 'pedido',
    id: pedido.id,
    items: productos.map((p) => ({ nombre: p.nombre, precio: p.precio_unit, cantidad: p.cantidad })),
    user,
  })
}
```

---

## Paso 6 — Ruta de checkout

Las Server Actions del Paso 5 llaman a `crearCheckout`, que a su vez llama a `/api/pagos`. Es el momento de escribir esa ruta — la pieza que de verdad habla con Stripe.

> Tu proyecto ya tiene una carpeta `app/api/pagos/` (con una ruta de prueba). Es ahí donde escribimos el checkout.

```
Server Action (Paso 5)
  · llama a esta ruta
        │
        ▼
/api/pagos  ◄─── aquí estamos
  · busca si el usuario tiene tarjeta guardada en Stripe
  · si no tiene → crea un Customer en Stripe y lo guarda en perfiles
  · crea la sesión de pago en Stripe
  · devuelve la URL de la página de pago
        │
        ▼
El usuario va a la página de pago de Stripe
```

Sustituye el contenido de `app/api/pagos/route.js` por esto (quitamos la ruta `GET` de prueba y añadimos la `POST` real):

```js
// apps/web/src/app/api/pagos/route.js
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Aquí usamos el cliente "a pelo" con la service_role key (no el wrapper de cookies),
// porque esta ruta no tiene sesión de usuario — la llama nuestro propio servidor
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    // tipo  → 'reserva' o 'pedido'
    // id    → el ID de la reserva o del pedido en nuestra base de datos
    // items → array de { nombre, precio, cantidad }
    const { tipo, id, items, clienteId, clienteEmail } = await req.json()

    // --- ¿El usuario ya tiene tarjeta guardada? ---
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('stripe_customer_id')
      .eq('id', clienteId)
      .single()

    let stripeCustomerId = perfil?.stripe_customer_id

    if (!stripeCustomerId) {
      // Primera vez: creamos el Customer en Stripe y guardamos su ID
      const customer = await stripe.customers.create({
        email: clienteEmail,
        metadata: { supabase_id: clienteId },
      })
      stripeCustomerId = customer.id

      await supabase
        .from('perfiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', clienteId)
    }
    // ----------------------------------------------

    // Construimos la lista de productos que verá el usuario en Stripe
    const lineItems = items.map((item) => ({
      price_data: {
        currency: 'eur',
        unit_amount: Math.round(item.precio * 100), // Stripe trabaja en céntimos
        product_data: { name: item.nombre },
      },
      quantity: item.cantidad,
    }))

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      payment_intent_data: {
        setup_future_usage: 'on_session', // guarda la tarjeta para la próxima vez
      },
      success_url: tipo === 'reserva'
        ? `${baseUrl}/reserva/exito?reserva_id=${id}`
        : `${baseUrl}/pedido/exito?pedido_id=${id}`,
      cancel_url: `${baseUrl}/${tipo}/cancelado`,
      // Guardamos tipo e ID para saber qué actualizar cuando Stripe nos avise
      metadata: { tipo, id, cliente_id: clienteId },
      expires_at: Math.floor(Date.now() / 1000) + 1800, // caduca en 30 minutos
    })

    // Guardamos el ID de sesión en nuestra base de datos
    const tabla = tipo === 'reserva' ? 'reservas' : 'pedidos'
    await supabase.from(tabla).update({ stripe_session: session.id }).eq('id', id)

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('Error en checkout:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

## Paso 7 — Ruta del webhook

Con esto ya tenemos todo el camino de ida: botón → action → `/api/pagos` → Stripe → el usuario paga. Pero falta la vuelta — cómo nos enteramos de que el pago se completó.

```
El usuario paga en la página de Stripe
        │
        ▼
Stripe envía un aviso HTTP a nuestra app
        │
        ▼
/api/webhook  ◄─── aquí estamos
  · verifica que el aviso viene realmente de Stripe
  · lee el tipo (reserva o pedido) de los metadatos
  · actualiza estado_pago en nuestra base de datos
        │
        ├── si es reserva → estado_pago = 'pagado' + genera qr_token
        └── si es pedido  → estado_pago = 'pagado'
```

```js
// apps/web/src/app/api/webhook/route.js
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  // Verificamos que el aviso viene realmente de Stripe
  let evento
  try {
    evento = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  const session = evento.data.object
  const { tipo, id } = session.metadata ?? {}

  if (evento.type === 'checkout.session.completed') {
    if (tipo === 'reserva') {
      // Actualizamos estado_pago (el pago) pero NO tocamos estado (el estado de la reserva)
      await supabase
        .from('reservas')
        .update({
          estado_pago:    'pagado',
          stripe_payment: session.payment_intent,
          qr_token:       crypto.randomUUID(),
        })
        .eq('id', id)
        .eq('estado_pago', 'pendiente')
    }

    if (tipo === 'pedido') {
      // Igual: solo actualizamos estado_pago, el estado de cocina lo gestiona el staff
      await supabase
        .from('pedidos')
        .update({
          estado_pago:    'pagado',
          stripe_payment: session.payment_intent,
        })
        .eq('id', id)
        .eq('estado_pago', 'pendiente')
    }
  }

  if (evento.type === 'checkout.session.expired') {
    // El usuario no pagó en 30 minutos → cancelamos el pago
    const tabla = tipo === 'reserva' ? 'reservas' : 'pedidos'
    await supabase
      .from(tabla)
      .update({ estado_pago: 'cancelado' })
      .eq('id', id)
      .eq('estado_pago', 'pendiente')
  }

  // Siempre respondemos 200 para que Stripe sepa que recibimos el aviso
  return NextResponse.json({ received: true })
}
```

---

## Paso 8 — Registrar el webhook en Stripe

```
Stripe necesita saber a qué URL mandar el aviso cuando alguien pague.
Sin esto, el webhook del Paso 7 nunca se ejecuta.
```

1. Ve a [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Pulsa **Add endpoint**
3. En la URL pon: `https://tu-app.vercel.app/api/webhook`
4. En **Events** selecciona:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Copia el **Signing secret** (`whsec_...`) y ponlo en `.env.local` como `STRIPE_WEBHOOK_SECRET`

---

## Paso 9 — Página de éxito

```
Stripe redirige al usuario a /reserva/exito?reserva_id=123
        │
        ▼
Esta página lee la reserva de la DB y muestra la confirmación
```

```jsx
// apps/web/src/app/reserva/exito/page.jsx
import { createClient } from '@/lib/supabase/server'

export default async function PaginaExito({ searchParams }) {
  const reservaId = searchParams.reserva_id
  const supabase = await createClient()

  const { data: reserva } = await supabase
    .from('reservas')
    .select('*, salas_vip(nombre)')
    .eq('id', reservaId)
    .single()

  if (!reserva || reserva.estado_pago !== 'pagado') {
    return <p>Reserva no encontrada o pago no confirmado.</p>
  }

  return (
    <div>
      <h1>¡Reserva confirmada!</h1>
      <p>Sala: {reserva.salas_vip.nombre}</p>
      <p>Inicio: {new Date(reserva.inicio).toLocaleString('es-ES')}</p>
      <p>Total pagado: {reserva.total} €</p>
      <p>Tu entrada QR estará disponible en tu perfil.</p>
    </div>
  )
}
```

---

## Probar en local

Cuando pagas en producción, Stripe le avisa a tu servidor del resultado mandando una petición HTTP a tu webhook (`/api/webhook`). El problema en local es que tu máquina no es accesible desde internet (`localhost` no existe para Stripe). El **CLI de Stripe** resuelve esto: abre un túnel autenticado entre tu cuenta de Stripe y tu máquina, escucha los eventos que generarías en modo test y los reenvía a la URL local que le indiques — sin necesidad de exponer tu puerto con ngrok ni nada parecido. De paso, también te deja "disparar" eventos falsos (`stripe trigger`) para probar sin tener que pasar por todo el flujo de checkout cada vez.

### Instalación

**Linux (Arch / AUR):**
```bash
yay -S stripe-cli-bin
# o, sin AUR helper, descargando el binario directamente:
curl -L https://github.com/stripe/stripe-cli/releases/latest/download/stripe_*_linux_x86_64.tar.gz -o stripe.tar.gz
tar -xzf stripe.tar.gz
sudo mv stripe /usr/local/bin/
```
(En otras distros: revisa los [paquetes oficiales](https://github.com/stripe/stripe-cli#install-the-cli) — Debian/Ubuntu tienen su propio repo apt, y también hay binarios sueltos para cualquier Linux.)

**Windows:**
```Git bash
# Instalar el cliente de stripe global
npm install -g @stripe/cli
```

### Autenticación

La primera vez que ejecutas cualquier comando, el CLI te pedirá autenticarte:

```bash
stripe login
```

Te dará un código de emparejamiento y abrirá el navegador para confirmar — así el CLI queda vinculado a tu cuenta de Stripe (en modo test) sin que tengas que copiar claves a mano. La sesión caduca a los 90 días.

### Reenviar eventos a tu app local

```bash
# Terminal 1 — reenvía los avisos de Stripe a tu app local
stripe listen --forward-to localhost:3000/api/webhook

# Terminal 2 — simula un pago completado
stripe trigger checkout.session.completed

```

Al arrancar, `stripe listen` imprime un secreto (`whsec_...`) — cópialo en `STRIPE_WEBHOOK_SECRET` de tu `.env.local`. Es **distinto** cada vez que reinicias el comando, así que si tu webhook empieza a devolver "Firma inválida", lo primero es comprobar que ese valor sigue coincidiendo. La terminal de `stripe listen` además te muestra en vivo cada evento que llega y el código de respuesta de tu servidor (`[200]`, `[400]`, etc.), lo cual es muy útil para depurar.

### Simular un pago manualmente. Tarjeta de prueba:

**Número de tarjeta:** 4242424242424242
**Fecha de caducidad:** 12/34
**CVC:** 123



---

## Reto

Añade soporte para **reembolsos**: si el cliente cancela con más de 24 horas de antelación, devuelve el 50% del importe.

- Crea una ruta `app/api/reembolso/route.js`
- Llama a `stripe.refunds.create({ payment_intent: '...', amount: importeEnCentimos })`
- El `payment_intent` lo tienes guardado en `reservas.stripe_payment`

---

## Navegación

[← 04 — Estado con Zustand](./06-productos.md) · [06 — PWA y Entradas QR →](./08-pwa-y-entradas-qr.md)
