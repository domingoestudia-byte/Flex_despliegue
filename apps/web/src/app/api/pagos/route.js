import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Cliente "a pelo" con la service_role key: esta ruta no tiene sesión de
// usuario (la llama nuestro propio servidor), así que saltamos las RLS.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  console.log('=== PAGOS API: POST recibido ===')
  
  try {
    const body = await req.json()
    console.log('Body recibido:', JSON.stringify(body, null, 2))
    
    const { tipo, id, items, clienteId, clienteEmail } = body

    // Validación de campos requeridos
    if (!tipo || !id || !items || !clienteId || !clienteEmail) {
      console.error('Faltan campos:', { tipo, id, itemsLength: items?.length, clienteId, clienteEmail })
      return NextResponse.json({ 
        error: 'Faltan campos requeridos' 
      }, { status: 400 })
    }

    // --- ¿El usuario ya tiene tarjeta guardada? ---
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('stripe_customer_id')
      .eq('id', clienteId)
      .single()

    if (perfilError) {
      console.error('Error al buscar perfil:', perfilError)
      return NextResponse.json({ error: perfilError.message }, { status: 500 })
    }

    let stripeCustomerId = perfil?.stripe_customer_id

    if (!stripeCustomerId) {
      // Primera vez: creamos el Customer en Stripe y guardamos su ID
      const customer = await stripe.customers.create({
        email: clienteEmail,
        metadata: { supabase_id: clienteId },
      })
      stripeCustomerId = customer.id

      const { error: updateError } = await supabase
        .from('perfiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', clienteId)

      if (updateError) {
        console.error('Error al guardar stripe_customer_id:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
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

    if (!baseUrl) {
      console.error('Falta NEXT_PUBLIC_APP_URL')
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 })
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      payment_intent_data: {
        setup_future_usage: 'on_session',
      },
      saved_payment_method_options: {
        payment_method_save: 'enabled',
        allow_redisplay_filters: ['always'],
      },
      success_url: tipo === 'reserva'
        ? `${baseUrl}/reserva/exito?reserva_id=${id}`
        : `${baseUrl}/pedido/exito?pedido_id=${id}`,
      cancel_url: `${baseUrl}/${tipo === 'reserva' ? 'vip' : ''}`,
      metadata: { tipo, id, cliente_id: clienteId },
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    })

    // Guardamos el ID de sesión en nuestra base de datos
    const tabla = tipo === 'reserva' ? 'reservas' : 'pedidos'
    const { error: updateError } = await supabase
      .from(tabla)
      .update({ stripe_session: session.id })
      .eq('id', id)

    if (updateError) {
      console.error('Error al guardar stripe_session:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('Error en checkout:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Captura GET para evitar HTML de error
export async function GET() {
  console.log('=== PAGOS API: GET recibido (no permitido) ===')
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}