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

// items → [{ id, nombre, precio, cantidad, imagen_url }, ...] (formato del carritoStore)
async function crearPedido({ mesaId, items }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .insert({ mesa_id: mesaId, cliente_id: user.id, estado: 'pendiente', total })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const { error: itemsError } = await supabase.from('pedido_items').insert(
    items.map((i) => ({
      pedido_id:   pedido.id,
      producto_id: i.id,
      cantidad:    i.cantidad,
      precio_unit: i.precio,
    }))
  )

  if (itemsError) throw new Error(itemsError.message)
  return pedido
}

// Crea el pedido y, a continuación, la sesión de pago en Stripe
export async function iniciarPagoPedido({ mesaId, items }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const pedido = await crearPedido({ mesaId, items })

  return crearCheckout({
    tipo: 'pedido',
    id: pedido.id,
    items: items.map((i) => ({ nombre: i.nombre, precio: i.precio, cantidad: i.cantidad })),
    user,
  })
}
