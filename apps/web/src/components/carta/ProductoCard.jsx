'use client'

import { useCarritoStore } from '@/store/carritoStore'
import { Plus, Minus } from 'lucide-react'
import Image from 'next/image'

export default function ProductoCard({ producto }) {
  const { items, agregarItem, quitarItem } = useCarritoStore()
  const enCarrito = items.find((i) => i.id === producto.id)

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-col gap-3">
      <div className="h-36 rounded-lg overflow-hidden bg-zinc-800">
        {producto.imagen_url ? (
          // <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-cover" />
          <Image src={producto.imagen_url} width={200} height={200} alt={producto.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Sin imagen</div>
        )}
      </div>
      <div>
        <p className="text-zinc-100 font-medium text-sm">{producto.nombre}</p>
        {producto.descripcion && <p className="text-xs text-zinc-500 mt-0.5">{producto.descripcion}</p>}
        <p className="text-xs text-zinc-600 mt-0.5 capitalize">{producto.categoria}</p>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-gold-400 font-semibold">{producto.precio.toFixed(2)} €</span>
        {enCarrito ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => quitarItem(producto.id)}
              className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center hover:bg-zinc-600 transition-colors"
            >
              <Minus size={13} />
            </button>
            <span className="text-zinc-100 text-sm w-5 text-center font-medium">{enCarrito.cantidad}</span>
            <button
              onClick={() => agregarItem(producto)}
              className="w-7 h-7 rounded-full bg-gold-500 flex items-center justify-center hover:bg-gold-600 transition-colors"
            >
              <Plus size={13} className="text-zinc-950" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => agregarItem(producto)}
            className="flex items-center gap-1 px-3 py-1 bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus size={12} /> Añadir
          </button>
        )}
      </div>
    </div>
  )
}
