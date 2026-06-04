'use client'

import { useState } from 'react'
import { CheckCircle, Clock, ChefHat } from 'lucide-react'

const PEDIDOS_INIT = [
  {
    id: 1, mesa: 'Mesa 3', cliente: 'María López', hora: '23:14',
    estado: 'pendiente',
    items: [{ nombre: 'Gin Tonic Premium', cantidad: 2 }, { nombre: 'Nachos', cantidad: 1 }, { nombre: 'Patatas bravas', cantidad: 2 }],
  },
  {
    id: 2, mesa: 'Mesa 7', cliente: 'Alex García', hora: '23:21',
    estado: 'pendiente',
    items: [{ nombre: 'Cerveza Artesana', cantidad: 3 }, { nombre: 'Patatas bravas', cantidad: 2 }],
  },
  {
    id: 3, mesa: 'Sala Roja', cliente: 'Carlos Ruiz', hora: '23:05',
    estado: 'completado',
    items: [{ nombre: 'Vino tinto', cantidad: 1 }, { nombre: 'Tabla de quesos', cantidad: 1 }],
  },
  {
    id: 4, mesa: 'Mesa 1', cliente: 'Laura Sanz', hora: '23:30',
    estado: 'preparando',
    items: [{ nombre: 'Mojito', cantidad: 4 }],
  },
  {
    id: 5, mesa: 'Mesa 12', cliente: 'Pedro Gil', hora: '22:58',
    estado: 'completado',
    items: [{ nombre: 'Hamburguesa Flex', cantidad: 2 }, { nombre: 'Coca-Cola', cantidad: 2 }],
  },
]

const ESTADOS = {
  pendiente: { label: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: Clock },
  preparando: { label: 'Preparando', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', icon: ChefHat },
  completado: { label: 'Completado', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-zinc-800', icon: CheckCircle },
}

const SIGUIENTE = { pendiente: 'preparando', preparando: 'completado' }

const BOTONES = {
  pendiente: { label: 'Preparar', clases: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30' },
  preparando: { label: 'Entregar', clases: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30' },
}

const FILTROS = ['todos', 'pendiente', 'preparando', 'completado']

export default function PaginaStaff() {
  const [pedidos, setPedidos] = useState(PEDIDOS_INIT)
  const [filtro, setFiltro] = useState('todos')

  function avanzar(id) {
    setPedidos(prev => prev.map(p =>
      p.id === id && SIGUIENTE[p.estado]
        ? { ...p, estado: SIGUIENTE[p.estado] }
        : p
    ))
  }

  const pedidosFiltrados = filtro === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtro)
  const pendientes = pedidos.filter(p => p.estado === 'pendiente').length
  const preparando = pedidos.filter(p => p.estado === 'preparando').length
  const completados = pedidos.filter(p => p.estado === 'completado').length

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Panel de Staff</h1>
          <p className="text-zinc-500 text-sm mt-1">Gestión de pedidos en tiempo real</p>
        </div>
        {pendientes > 0 && (
          <div className="bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm px-4 py-2 rounded-xl self-start">
            {pendientes} nuevo{pendientes > 1 ? 's' : ''} pedido{pendientes > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs">Total</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{pedidos.length}</p>
        </div>
        <div className="bg-zinc-900 border border-amber-500/20 rounded-xl p-4">
          <p className="text-zinc-500 text-xs">Pendientes</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{pendientes}</p>
        </div>
        <div className="bg-zinc-900 border border-blue-500/20 rounded-xl p-4">
          <p className="text-zinc-500 text-xs">Preparando</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{preparando}</p>
        </div>
        <div className="bg-zinc-900 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-zinc-500 text-xs">Completados</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{completados}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${filtro === f ? 'bg-gold-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Lista pedidos */}
      <div className="space-y-3">
        {pedidosFiltrados.map(pedido => {
          const estado = ESTADOS[pedido.estado]
          const IconEstado = estado.icon
          const boton = BOTONES[pedido.estado]
          return (
            <div
              key={pedido.id}
              className={`bg-zinc-900 border ${estado.border} rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4`}
            >
              {/* Icono estado */}
              <div className={`shrink-0 ${estado.color}`}>
                <IconEstado size={24} />
              </div>

              {/* Info */}
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

              {/* Botón acción */}
              {boton && (
                <button
                  onClick={() => avanzar(pedido.id)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${boton.clases}`}
                >
                  {pedido.estado === 'pendiente' && <ChefHat size={15} />}
                  {pedido.estado === 'preparando' && <CheckCircle size={15} />}
                  {boton.label}
                </button>
              )}
              {pedido.estado === 'completado' && (
                <span className="shrink-0 text-xs text-emerald-600 font-medium">Entregado</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
