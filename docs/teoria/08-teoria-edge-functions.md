# 08 — Teoría: Edge Functions y Stripe

> Lee esto antes de continuar. Explica qué son las Edge Functions, por qué serían una mejor práctica para procesar pagos con Stripe, y cómo sería el flujo completo si las usáramos.

---

## ¿Qué son las Edge Functions?

En el apunte anterior, el webhook y el checkout de Stripe viven en `/api/pagos` y `/api/webhook` — rutas normales de Next.js que se ejecutan en un servidor Node.js tradicional. Ese servidor puede estar en un datacenter en Estados Unidos, en Europa, o donde sea que lo despliegue tu proveedor.

Las **Edge Functions** son un tipo de función serverless distinto: en vez de ejecutarse en un único servidor, se ejecutan en **los nodos de la red más cercanos al usuario**. Vercel, por ejemplo, tiene nodos en más de 30 ciudades. Cuando alguien desde Madrid hace una petición, la Edge Function se ejecuta en el nodo de Frankfurt — no en Virginia.

```
Sin Edge Functions:
  Usuario (Madrid) ──────────────────────────▶ Servidor (Virginia) ──▶ Stripe
                   ← ~150ms de latencia →

Con Edge Functions:
  Usuario (Madrid) ──▶ Nodo Edge (Frankfurt) ──▶ Stripe
                   ← ~15ms de latencia →
```

La diferencia es que las Edge Functions usan el **runtime de la Web Platform** (el mismo estándar que el navegador: `fetch`, `Request`, `Response`, `crypto`...) en vez del runtime de Node.js. Esto las hace mucho más ligeras y rápidas de arrancar.

---

## El problema del "cold start"

Las funciones serverless tradicionales (Node.js) tienen un problema: cuando llevan un tiempo sin usarse, el servidor las "apaga". La próxima vez que alguien las llama, tardan entre 200ms y 1 segundo en arrancar antes de poder responder. Esto se llama **cold start**.

Las Edge Functions casi no tienen cold start porque el runtime es mínimo — no levanta un proceso Node.js entero, solo ejecuta el código. El arranque en frío es de **menos de 5ms**.

Para un webhook de Stripe esto es especialmente relevante: si Stripe manda el aviso de pago y nuestra función tarda 800ms en arrancar, Stripe podría interpretar que hubo un error y reintentar — generando duplicados.

---

## ¿Por qué sería mejor práctica para Stripe?

Hay tres razones concretas:

**1. El webhook necesita ser rápido y fiable**

Stripe espera una respuesta `200` en menos de 30 segundos. Si no la recibe, reintenta el webhook hasta 3 días (con backoff exponencial). Con un servidor Node.js en frío, el riesgo de timeout o reintentos innecesarios es real. Una Edge Function arranca siempre en milisegundos.

**2. La verificación de firma es pura criptografía**

Lo primero que hace el webhook es verificar la firma de Stripe (`stripe.webhooks.constructEvent`). Esa operación no necesita Node.js — usa `crypto`, que está disponible en cualquier runtime Web. Las Edge Functions están optimizadas exactamente para este tipo de trabajo: operaciones rápidas, sin estado, sin base de datos propia.

**3. Separación de responsabilidades**

En el apunte anterior, la lógica de pagos vive dentro de la app de Next.js mezclada con el resto del código. Si la app tiene un problema de despliegue, los webhooks también fallan. Separando la lógica de pago en Edge Functions (en Supabase o en Vercel Edge) obtienes un servicio independiente que puede estar disponible aunque el resto de la app falle.

---

## Dónde ejecutar las Edge Functions

Hay dos opciones en nuestro stack:

| Opción | Dónde vive | Cuándo usarla |
|---|---|---|
| **Vercel Edge Functions** | Dentro de Next.js, con `export const runtime = 'edge'` | Cuando la función necesita acceder a cookies, sesiones de Next.js, o integrarse con el router |
| **Supabase Edge Functions** | En el proyecto de Supabase, código Deno | Cuando la función necesita acceso directo a la base de datos con privilegios de `service_role`, independientemente de la app |

Para el webhook de Stripe, **Supabase Edge Functions es la opción más limpia**: el webhook recibe un evento, actualiza la base de datos, y no necesita saber nada de Next.js. Es un microservicio de una sola responsabilidad.

Para el checkout (crear la sesión en Stripe), **Vercel Edge Runtime** encaja mejor porque sí necesita la sesión del usuario (para leer `stripe_customer_id` de Supabase).

---

## Cómo sería el flujo completo

Este es el flujo de un pago con la arquitectura basada en Edge Functions, desde que el usuario pulsa "Pagar" hasta que ve la confirmación.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Navegador)                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ 1. Pulsa "Pagar"
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│               VERCEL EDGE FUNCTION: /api/pagos                      │
│  runtime: 'edge'                                                     │
│                                                                     │
│  · Lee la sesión del usuario (cookie de Supabase Auth)              │
│  · Busca stripe_customer_id en Supabase                             │
│  · Si no existe → crea Customer en Stripe y lo guarda               │
│  · Crea Checkout Session en Stripe                                  │
│  · Guarda stripe_session en la tabla reservas/pedidos               │
│  · Devuelve { url } al cliente                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ 2. Devuelve URL de Stripe
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Navegador)                         │
│  · Redirige a checkout.stripe.com/...                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ 3. Usuario introduce tarjeta
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        STRIPE                                        │
│  · Cobra al usuario                                                 │
│  · Manda aviso HTTP POST a nuestra URL de webhook                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ 4. checkout.session.completed
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│         SUPABASE EDGE FUNCTION: /functions/v1/stripe-webhook        │
│  Runtime: Deno                                                      │
│                                                                     │
│  · Verifica la firma del webhook (STRIPE_WEBHOOK_SECRET)            │
│  · Lee tipo e id de session.metadata                                │
│  · Actualiza estado_pago = 'pagado' en reservas/pedidos             │
│  · Si es reserva → genera qr_token con crypto.randomUUID()         │
│  · Responde 200 a Stripe                                            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ 5. Stripe redirige al usuario
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│               NEXT.JS: /reserva/exito o /pedido/exito               │
│  · Lee la reserva/pedido de Supabase                                │
│  · Comprueba que estado_pago === 'pagado'                           │
│  · Muestra confirmación al usuario                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cómo se implementaría cada pieza

### Vercel Edge Function para el checkout

La diferencia con la implementación actual es mínima: añadir una línea al principio del archivo.

```js
// apps/web/src/app/api/pagos/route.js
export const runtime = 'edge'  // ← esta línea convierte la ruta en Edge Function

export async function POST(req) {
  // El código es casi idéntico al del apunte anterior,
  // pero usando fetch() nativo en vez del SDK de Node.js de Stripe
  // porque el Edge Runtime no tiene acceso a módulos de Node.js
}
```

> **Limitación importante:** el SDK oficial de Stripe (`import Stripe from 'stripe'`) usa módulos de Node.js que no están disponibles en el Edge Runtime. Tendrías que usar la API REST de Stripe directamente con `fetch`, o usar la versión del SDK compatible con Edge (`stripe/edge`).

### Supabase Edge Function para el webhook

Las Supabase Edge Functions viven en la carpeta `supabase/functions/`. Cada función es un archivo TypeScript/JavaScript independiente que se despliega en Deno.

```
supabase/
└── functions/
    └── stripe-webhook/
        └── index.ts
```

```ts
// supabase/functions/stripe-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe_webhook_secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const stripe_secret = Deno.env.get('STRIPE_SECRET_KEY')!

Deno.serve(async (req) => {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  // Verificación de la firma usando la Web Crypto API (no Node.js)
  const isValid = await verificarFirmaStripe(body, signature, stripe_webhook_secret)
  if (!isValid) {
    return new Response('Firma inválida', { status: 400 })
  }

  const evento = JSON.parse(body)
  const session = evento.data.object
  const { tipo, id } = session.metadata ?? {}

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (evento.type === 'checkout.session.completed') {
    if (tipo === 'reserva') {
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

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

Para desplegar la función:

```bash
npx supabase functions deploy stripe-webhook
```

La URL del webhook que registras en Stripe pasaría a ser:

```
https://<tu-proyecto>.supabase.co/functions/v1/stripe-webhook
```

---

## Comparativa: implementación actual vs Edge Functions

| | Implementación actual (apunte 07) | Con Edge Functions |
|---|---|---|
| **Dónde se ejecuta el webhook** | Servidor Node.js de Next.js | Supabase Edge (Deno, distribuido) |
| **Cold start** | 200ms–1s si estaba inactivo | < 5ms siempre |
| **Dependencia de la app** | Si Next.js falla, el webhook falla | El webhook es independiente |
| **Complejidad** | Todo en un sitio, más fácil de entender | Dos servicios distintos |
| **SDK de Stripe** | SDK completo de Node.js | API REST o SDK Edge |
| **Buena práctica para producción** | Suficiente para proyectos pequeños | Recomendado para producción real |

---

## Por qué no lo hemos implementado así en el proyecto

La implementación del apunte 07 — con rutas normales de Next.js — es perfectamente válida para aprender y para proyectos con tráfico moderado. Las Edge Functions añaden complejidad operacional: tienes que gestionar dos despliegues distintos (Next.js y Supabase Functions), las variables de entorno en dos sitios, y el debugging es más fragmentado.

Para entender cómo funciona Stripe, esa complejidad extra oscurecería lo importante. Primero entiendes el flujo con la implementación sencilla; luego, si el proyecto lo necesita, migras el webhook a una Edge Function cambiando menos de 50 líneas.

---

## Resumen

Las Edge Functions son funciones serverless que se ejecutan en nodos distribuidos cerca del usuario, sin cold start y con el runtime de la Web Platform. Para el webhook de Stripe son especialmente buena práctica porque: arrancan en milisegundos (evitando reintentos de Stripe), son independientes del resto de la app, y la verificación de firma es exactamente el tipo de trabajo para el que están optimizadas. La pieza del checkout también puede correr en Edge Runtime de Vercel con un cambio mínimo de código.

---

## Ejercicios

### Ejercicio 1 — Cold start

Un servidor Node.js lleva 10 minutos sin recibir peticiones. Stripe manda el aviso de pago y el servidor tarda 700ms en arrancar antes de procesar el webhook.

1. ¿Qué puede pasar desde el punto de vista de Stripe?
2. ¿Cómo soluciona esto una Edge Function?

<details>
<summary>Ver respuesta</summary>

1. Stripe espera la respuesta. Si el timeout de Stripe es corto o el servidor tarda demasiado, Stripe puede interpretar que hubo un error y reintentar el webhook — lo que podría provocar que el pago se marque como pagado dos veces si no hay protección contra duplicados (la condición `.eq('estado_pago', 'pendiente')` en la query es precisamente esa protección).

2. Las Edge Functions no tienen estado persistente que "apagar" — el runtime es tan ligero que el arranque en frío es de menos de 5ms. Stripe siempre recibe la respuesta en tiempo.

</details>

---

### Ejercicio 2 — Separación de servicios

En la implementación del apunte 07, el webhook vive en `/api/webhook` dentro de Next.js. Si haces un despliegue con un bug que rompe la app de Next.js, ¿qué le pasa al webhook?

¿Cómo cambia esto si el webhook es una Supabase Edge Function?

<details>
<summary>Ver respuesta</summary>

En la implementación actual: si Next.js falla, el webhook también falla. Cualquier pago que ocurra durante ese tiempo nunca se marcará como pagado (hasta que Stripe reintente y la app vuelva a funcionar).

Con Supabase Edge Functions: el webhook es completamente independiente de Next.js. Un despliegue roto en Vercel no afecta a las funciones en Supabase — siguen recibiendo y procesando los eventos de Stripe con normalidad.

</details>

---

### Ejercicio 3 — Runtime

El SDK oficial de Stripe (`import Stripe from 'stripe'`) no funciona en el Edge Runtime. ¿Por qué? ¿Cuál sería la alternativa?

<details>
<summary>Ver respuesta</summary>

El SDK de Stripe usa módulos internos de Node.js (`http`, `https`, `buffer`, `crypto` de Node) que no existen en el Edge Runtime, que solo implementa los estándares de la Web Platform.

Las alternativas son:
1. Usar la API REST de Stripe directamente con `fetch()` — Stripe tiene una API HTTP bien documentada.
2. Usar el paquete `stripe` con el import específico para Edge: `import Stripe from 'stripe/edge'`, que es una versión del SDK reescrita para funcionar con Web APIs.

</details>

---

### Ejercicio 4 — Cuándo migrar

Tienes el proyecto funcionando con la implementación del apunte 07 (rutas de Next.js). ¿En qué momento tendría sentido migrar el webhook a una Supabase Edge Function?

<details>
<summary>Ver respuesta</summary>

Algunos indicadores de que merece la pena migrar:

- El proyecto empieza a tener **tráfico real** y los cold starts empiezan a generar reintentos de Stripe visibles en el dashboard.
- El equipo hace **despliegues frecuentes** y el riesgo de que un deploy roto afecte a los pagos es inaceptable.
- El webhook crece en complejidad (notificaciones, emails, integraciones) y tiene sentido que sea un servicio independiente con su propio ciclo de despliegue.
- El proyecto tiene **múltiples frontends** (app web, app móvil) que comparten la misma lógica de pagos — una Edge Function centraliza eso sin duplicar código.

Para un proyecto pequeño o en fase de aprendizaje, la implementación de Next.js es suficiente.

</details>

---

## Navegación

[← 07 — Teoría: Stripe](./07-teoria-stripe.md) · [08 — Código: PWA y Entradas QR →](../09-pwa-y-entradas-qr.md)
