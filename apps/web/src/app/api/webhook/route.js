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
