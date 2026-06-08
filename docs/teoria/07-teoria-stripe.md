# 07 — Teoría: Cómo funciona Stripe

> Lee esto antes de tocar código. Si entiendes esto, el código del siguiente apunte tiene todo el sentido.

---

## ¿Qué es Stripe?

Stripe es una empresa que se encarga de procesar pagos. Tú le dices "cobra 10€ a este usuario" y Stripe lo hace. Nosotros nunca vemos ni guardamos los datos de la tarjeta — eso es problema de Stripe.

Esto es importante por dos razones:

1. **Seguridad** — si alguien hackea nuestra app, no consigue ningún dato bancario
2. **Legal** — gestionar tarjetas requiere cumplir normativas muy estrictas (PCI DSS). Al usar Stripe, ese problema desaparece

---

## El flujo de un pago

Imagina que el usuario quiere pagar una reserva de 20€. Esto es lo que pasa:

```
1. El usuario pulsa "Pagar" en nuestra app
        ↓
2. Nuestra app crea una "sesión de pago" en Stripe
   (le decimos: "prepara una página para cobrar 20€")
        ↓
3. Stripe nos devuelve una URL (una dirección web)
   Ejemplo: https://checkout.stripe.com/pay/cs_test_abc123
        ↓
4. Mandamos al usuario a esa URL
   (ya no está en nuestra app, está en la página de Stripe)
        ↓
5. El usuario introduce su tarjeta en la página de Stripe
        ↓
6. Stripe cobra al usuario
        ↓
7. Stripe nos avisa: "oye, el pago se ha completado"
   (esto se llama webhook — explicado más abajo)
        ↓
8. Nuestra app actualiza el estado en la base de datos
        ↓
9. Stripe manda al usuario de vuelta a nuestra app
```

### ¿Y la base de datos? ¿Dónde aparece?

Es fácil pensar que el pago es solo una conversación entre nuestra app, Stripe y el banco — pero la base de datos participa en **tres momentos clave**:

```
Tu app              Supabase (DB)         Stripe              Banco
  │                      │                   │                  │
  │── crear reserva ────▶│                   │                  │
  │   (estado_pago:      │                   │                  │
  │    'pendiente')      │                   │                  │
  │                      │                   │                  │
  │── leer/crear ───────▶│                   │                  │
  │   stripe_customer_id │                   │                  │
  │                      │                   │                  │
  │── crear Session ─────┼──────────────────▶│                  │
  │◀── { url, session_id } ──────────────────│                  │
  │                      │                   │                  │
  │── guardar ──────────▶│                   │                  │
  │   stripe_session     │                   │                  │
  │                      │                   │                  │
  │  (usuario va a la URL de Stripe)         │                  │
  │                      │                   │── autorizar ────▶│
  │                      │                   │◀── aprobado ─────│
  │                      │                   │                  │
  │                      │◀── webhook: marcar como 'pagado' ────│
  │                      │    + guardar stripe_payment          │
  │                      │    + generar qr_token                │
  │◀── redirect ─────────┼───────────────────│                  │
```

1. **Antes de hablar con Stripe** — creamos la reserva/pedido en estado `pendiente` y comprobamos si el usuario ya tiene un `stripe_customer_id` guardado (para reutilizar su tarjeta)
2. **Justo después de crear la sesión** — guardamos el `stripe_session` para poder relacionar luego el aviso de pago con nuestro registro
3. **Cuando llega el webhook** — actualizamos `estado_pago` a `'pagado'`, guardamos el `stripe_payment` y generamos el `qr_token`

La base de datos es la que recuerda en qué punto está cada pago — Stripe no guarda nada sobre nuestras reservas o pedidos, solo sabe de sus propias sesiones de pago.

---

## ¿Qué es una Checkout Session?

Es la "página de pago" que crea Stripe. Tú la configuras diciéndole:

- Cuánto cobrar
- Qué producto es (nombre y precio)
- A dónde redirigir al usuario cuando termine

Cada vez que alguien va a pagar, se crea una Checkout Session nueva. Caduca a los 30 minutos si el usuario no paga.

---

## ¿Qué es un webhook?

Es la forma que tiene Stripe de avisarnos cuando pasa algo.

El problema es este: cuando el usuario termina de pagar en la página de Stripe, **nosotros no nos enteramos automáticamente**. Stripe necesita una forma de decirnos "oye, este usuario ya pagó".

Lo hace enviando una petición HTTP a una URL nuestra. Esa URL es el webhook.

```
Stripe ──── POST https://nuestra-app.com/api/webhook ────▶ Nuestra app
                  { "type": "checkout.session.completed", ... }
```

Nuestra app recibe ese aviso y actualiza la base de datos.

> **Importante:** Siempre verificamos que el aviso viene realmente de Stripe (no de alguien haciéndose pasar por Stripe). Lo hacemos con una firma digital — Stripe firma cada aviso y nosotros comprobamos la firma.

---

## ¿Qué es un Customer de Stripe?

Aquí está la clave para que el usuario no tenga que meter la tarjeta más de una vez.

Stripe tiene un objeto llamado **Customer** (cliente). Es como una ficha del usuario dentro de Stripe. Cuando el usuario paga por primera vez, Stripe crea esa ficha y **guarda la tarjeta en ella**.

La próxima vez que ese usuario va a pagar, le decimos a Stripe "este pago es del Customer `cus_abc123`". Stripe ya sabe quién es, ya tiene su tarjeta guardada, y el formulario de pago aparece con la tarjeta preseleccionada. El usuario solo tiene que confirmar.

```
1ª vez:
  Usuario → introduce tarjeta → Stripe crea Customer → guarda tarjeta
  Nosotros guardamos el ID del Customer (cus_abc123) en perfiles.stripe_customer_id

2ª vez:
  Nosotros recuperamos el ID (cus_abc123) de la base de datos
  Usuario → ve su tarjeta ya guardada → solo pulsa "Pagar"
```

Para que esto funcione solo necesitamos una columna extra en nuestra tabla de perfiles: `stripe_customer_id`.

---

## ¿Qué es `setup_future_usage`?

Es una opción que le pasamos a Stripe al crear la sesión de pago. Le estamos diciendo: "cuando el usuario pague, guarda su tarjeta para que pueda usarla en futuros pagos".

- `'on_session'` → guarda la tarjeta para cuando el usuario esté presente (él confirma el pago)
- `'off_session'` → guarda la tarjeta para cobros automáticos sin que el usuario esté delante (suscripciones)

En nuestro caso usamos `'on_session'` porque el usuario siempre está presente cuando paga.

---

## Las claves de Stripe

Stripe te da dos claves:

| Clave | Dónde va | Para qué |
|---|---|---|
| `pk_test_...` (pública) | Puede estar en el navegador | Identificar tu cuenta de Stripe |
| `sk_test_...` (secreta) | Solo en el servidor | Crear sesiones, ver pagos, hacer reembolsos |

La clave secreta es como la contraseña de tu cuenta de Stripe. Si alguien la consigue, puede hacer reembolsos, ver todos los pagos, etc. **Nunca la pongas en código que llegue al navegador.**

Las claves `test` son para desarrollo — no hacen cargos reales. Cuando vayas a producción usarás las claves `live`.

---

## Tarjetas de prueba

En modo test, Stripe tiene tarjetas de prueba que puedes usar:

| Número | Resultado |
|---|---|
| `4242 4242 4242 4242` | Pago exitoso |
| `4000 0000 0000 9995` | Tarjeta declinada |
| `4000 0025 0000 3155` | Requiere autenticación (3D Secure) |

La fecha de caducidad puede ser cualquiera futura. El CVV cualquier número de 3 dígitos.

---

## Resumen en una frase

Stripe crea una página de pago segura → el usuario paga ahí → Stripe nos avisa por webhook → nosotros actualizamos nuestra base de datos. El Customer de Stripe es lo que permite recordar la tarjeta entre pagos.

---

## Ejercicios

Estos ejercicios son para asegurarte de que has entendido la teoría antes de escribir código.

---

### Ejercicio 1 — El flujo de pago

Ordena estos pasos en el orden correcto en el que ocurren cuando un usuario paga:

```
A. Stripe manda al usuario de vuelta a nuestra app
B. El usuario pulsa "Pagar"
C. Nuestra app actualiza el estado en la base de datos
D. Stripe nos avisa por webhook
E. El usuario introduce su tarjeta en la página de Stripe
F. Nuestra app crea una Checkout Session en Stripe
G. Mandamos al usuario a la URL de Stripe
```

<details>
<summary>Ver respuesta</summary>

**B → F → G → E → D → C → A**

1. El usuario pulsa "Pagar"
2. Nuestra app crea la Checkout Session
3. Mandamos al usuario a la URL de Stripe
4. El usuario introduce su tarjeta
5. Stripe nos avisa por webhook
6. Nuestra app actualiza la base de datos
7. Stripe manda al usuario de vuelta

</details>

---

### Ejercicio 2 — Las claves

Tienes estas dos variables de entorno:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_abc123
STRIPE_SECRET_KEY=sk_test_xyz789
```

Responde:

1. ¿Cuál de las dos puede ver el usuario si abre las herramientas de desarrollador del navegador?
2. ¿Por qué una empieza por `NEXT_PUBLIC_` y la otra no?
3. ¿Qué pasaría si alguien consiguiera la clave secreta?

<details>
<summary>Ver respuesta</summary>

1. La que empieza por `NEXT_PUBLIC_` — Next.js la incluye en el código que se manda al navegador
2. `NEXT_PUBLIC_` es la convención de Next.js para marcar variables que pueden ser públicas. Las que no la tienen solo existen en el servidor
3. Podría crear cobros falsos, ver todos los pagos, hacer reembolsos, o acceder a los datos de los clientes en Stripe

</details>

---

### Ejercicio 3 — El webhook

Explica con tus palabras por qué necesitamos el webhook. ¿Qué pasaría si no lo tuviéramos?

<details>
<summary>Ver respuesta</summary>

Sin webhook, nuestra app no se enteraría de que el pago se ha completado. El usuario podría pagar en la página de Stripe pero su reserva seguiría en estado `pendiente` para siempre. Necesitamos el webhook porque Stripe opera en sus servidores — no hay otra forma de que nos avise.

</details>

---

### Ejercicio 4 — El Customer

Un usuario paga por primera vez. La semana siguiente vuelve a reservar otra sala.

1. ¿Cuántos Customers se crean en Stripe?
2. ¿Qué guardamos en nuestra base de datos la primera vez?
3. ¿Qué hacemos la segunda vez en vez de crear un Customer nuevo?

<details>
<summary>Ver respuesta</summary>

1. Solo uno — el Customer se crea la primera vez y se reutiliza siempre
2. Guardamos el `stripe_customer_id` (algo como `cus_abc123`) en la columna `stripe_customer_id` de la tabla `perfiles`
3. Leemos el `stripe_customer_id` de la base de datos y se lo pasamos a Stripe al crear la Checkout Session

</details>

---

### Ejercicio 5 — Los estados

En nuestro proyecto la tabla `pedidos` tiene dos campos de estado:

- `estado` → `pendiente | en_barra | listo | entregado | cancelado`
- `estado_pago` → `pendiente | pagado | cancelado`

Responde:

1. ¿Quién actualiza `estado`? ¿El webhook de Stripe o el staff del local?
2. ¿Quién actualiza `estado_pago`?
3. ¿Es posible que un pedido tenga `estado = 'listo'` y `estado_pago = 'pendiente'`? ¿Tiene sentido?

<details>
<summary>Ver respuesta</summary>

1. `estado` lo actualiza el staff del local — cuando el barman lo pone a preparar, cuando está listo, cuando lo entrega
2. `estado_pago` lo actualiza el webhook de Stripe — cuando confirma que el pago se ha completado
3. Técnicamente es posible, pero no debería ocurrir en un flujo normal. Significaría que el pedido está listo pero no se ha cobrado — un error en el proceso de pago

</details>

---

### Ejercicio 6 — Diseño

Ahora mismo, si el webhook falla (por ejemplo, Stripe intenta avisarnos pero nuestra app está caída), el pedido o la reserva nunca se marcaría como pagado aunque el usuario sí haya pagado.

¿Cómo resolverías este problema? Piensa en al menos dos opciones.

<details>
<summary>Ver respuesta</summary>

Algunas opciones:

1. **Stripe reintenta automáticamente** — Stripe ya reintenta el webhook varias veces si no recibe respuesta. Por eso siempre devolvemos `200` aunque no hagamos nada con el evento.
2. **Consultar Stripe directamente** — en la página de éxito, antes de mostrar la confirmación, podemos preguntarle a Stripe si la sesión realmente se pagó (en vez de fiarnos solo de nuestra base de datos).
3. **Panel de administración** — tener una vista en el admin donde se puedan ver reservas y pedidos con `estado_pago = 'pendiente'` que ya tienen `stripe_session` asignado, para detectar casos sospechosos y resolverlos manualmente.

</details>

---

## Navegación

[← 06 — Productos](./06-teoria-productos.md) · [07 — Código: Pagos con Stripe →](../07-stripe-y-edge-functions.md)
