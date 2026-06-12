import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function PaginaExitoPedido({ searchParams }) {
  const { pedido_id: pedidoId } = await searchParams
  const supabase = await createClient()

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('*, mesas(numero, piso)')
    .eq('id', pedidoId)
    .single()

  if (!pedido || pedido.estado_pago !== 'pagado') {
    return (
      <div className="p-8 text-center text-zinc-400">
        <p>Pedido no encontrado o pago aún no confirmado.</p>
        <p className="text-zinc-600 text-sm mt-2">Si acabas de pagar, espera unos segundos y recarga la página.</p>
      </div>
    )
  }

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-full gap-6 text-center">
      <h1 className="text-2xl font-bold text-zinc-100">¡Pedido pagado!</h1>
      <div className="text-zinc-400 space-y-1">
        {pedido.mesas && <p>Mesa {pedido.mesas.numero} · Piso {pedido.mesas.piso}</p>}
        <p className="text-amber-400 font-bold text-xl">{pedido.total} € pagados</p>
      </div>
      <p className="text-zinc-500 text-sm">Tu pedido ya está en cocina. Llega en 10–15 min.</p>
      <Link href="/" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-sm">
        Volver a la carta
      </Link>
    </div>
  )
}
