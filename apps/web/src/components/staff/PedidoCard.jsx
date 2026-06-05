'use client'

import { CheckCircle, Clock, ChefHat } from 'lucide-react'

const ESTADOS = {
  pendiente:  { label: 'Pendiente',  color: 'text-amber-400',   bg: 'bg-amber-500/20',   border: 'border-amber-500/30', icon: Clock       },
  preparando: { label: 'Preparando', color: 'text-blue-400',    bg: 'bg-blue-500/20',    border: 'border-blue-500/30',  icon: ChefHat     },
  completado: { label: 'Completado', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-zinc-800',     icon: CheckCircle },
}

const BOTONES = {
  pendiente:  { label: 'Preparar', clases: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30' },
  preparando: { label: 'Entregar', clases: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30' },
}

export default function PedidoCard({ pedido, onAvanzar }) {
  const estado = ESTADOS[pedido.estado]
  const IconEstado = estado.icon
  const boton = BOTONES[pedido.estado]

  return (
    <div className={`bg-zinc-900 border ${estado.border} rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
      <div className={`shrink-0 ${estado.color}`}>
        <IconEstado size={24} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-zinc-100 font-semibold">{pedido.mesa}</span>
          <span className="text-zinc-500 text-sm">·</span>
          <span className="text-zinc-400 text-sm">{pedido.cliente}</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${estado.bg} ${estado.color}`}>
            {estado.label}
          </span>
        </div>
        <p className="text-zinc-500 text-sm">
          {pedido.items.map(i => `${i.cantidad}× ${i.nombre}`).join(' · ')}
        </p>
        <p className="text-zinc-600 text-xs mt-1">{pedido.hora}</p>
      </div>

      {boton && (
        <button
          onClick={() => onAvanzar(pedido.id)}
          className={`shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${boton.clases}`}
        >
          {pedido.estado === 'pendiente'  && <ChefHat size={15} />}
          {pedido.estado === 'preparando' && <CheckCircle size={15} />}
          {boton.label}
        </button>
      )}
      {pedido.estado === 'completado' && (
        <span className="shrink-0 text-xs text-emerald-600 font-medium">Entregado</span>
      )}
    </div>
  )
}
