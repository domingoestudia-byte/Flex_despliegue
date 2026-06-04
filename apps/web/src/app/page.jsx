'use client'

import { useState } from 'react'
import { useCarritoStore } from '@/store/carritoStore'
import { ShoppingCart, Plus, Minus, X } from 'lucide-react'

const PRODUCTOS = [
  { id: 1, nombre: 'Cerveza Artesana', categoria: 'Bebida', precio: 4.5, img: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&auto=format&fit=crop&q=80' },
  { id: 2, nombre: 'Gin Tonic Premium', categoria: 'Bebida', precio: 9.0, img: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&auto=format&fit=crop&q=80' },
  { id: 3, nombre: 'Agua mineral', categoria: 'Bebida', precio: 2.0, img: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&auto=format&fit=crop&q=80' },
  { id: 4, nombre: 'Mojito', categoria: 'Bebida', precio: 8.5, img: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&auto=format&fit=crop&q=80' },
  { id: 5, nombre: 'Coca-Cola', categoria: 'Bebida', precio: 3.0, img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80' },
  { id: 6, nombre: 'Vino tinto', categoria: 'Bebida', precio: 5.5, img: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=400&auto=format&fit=crop&q=80' },
  { id: 7, nombre: 'Nachos con guacamole', categoria: 'Comida', precio: 7.0, img: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&auto=format&fit=crop&q=80' },
  { id: 8, nombre: 'Tabla de quesos', categoria: 'Comida', precio: 12.0, img: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400&auto=format&fit=crop&q=80' },
  { id: 9, nombre: 'Alitas BBQ', categoria: 'Comida', precio: 9.5, img: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&auto=format&fit=crop&q=80' },
  { id: 10, nombre: 'Patatas bravas', categoria: 'Comida', precio: 5.0, img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop&q=80' },
  { id: 11, nombre: 'Hamburguesa Flex', categoria: 'Comida', precio: 11.0, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80' },
  { id: 12, nombre: 'Mini pizzas', categoria: 'Comida', precio: 8.0, img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80' },
]

const CATEGORIAS = ['Todo', 'Bebida', 'Comida']

export default function PaginaPedir() {
  const { items, mesaNumero, setMesaNumero, agregarItem, quitarItem, eliminarItem, vaciarCarrito } = useCarritoStore()

  const totalItems = useCarritoStore((s) => s.items.reduce((acc, i) => acc + i.cantidad, 0))
  const total = useCarritoStore((s) => s.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0))

  const [cat, setCat] = useState('Todo')
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [pedidoEnviado, setPedidoEnviado] = useState(false)
  const [modalMesa, setModalMesa] = useState(false)

  const productosFiltrados = cat === 'Todo' ? PRODUCTOS : PRODUCTOS.filter(p => p.categoria === cat)

  function handleConfirmarPedido(e) {
    e.preventDefault()
    if (!mesaNumero) return
    setModalMesa(false)
    setPedidoEnviado(true)
    vaciarCarrito()
    setTimeout(() => {
      setPedidoEnviado(false)
      setCarritoAbierto(false)
    }, 3000)
  }

  return (
    <div className="relative min-h-full">
      {/* Contenido principal */}
      <div className="p-4 sm:p-8">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Pedir a mesa</h1>
          <p className="text-zinc-500 text-sm mt-1">Mesa 7 · Sala Principal</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CATEGORIAS.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${cat === c
                ? 'bg-gold-500 text-zinc-950'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Grid productos — 1 col móvil, 2 tablet, 3 desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
          {productosFiltrados.map(p => {
            const enCarrito = items.find(i => i.id === p.id)
            return (
              <div key={p.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-col gap-3">
                <div className="h-36 rounded-lg overflow-hidden bg-zinc-800">
                  <img src={p.img} alt={p.nombre} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-zinc-100 font-medium text-sm">{p.nombre}</p>
                  <p className="text-xs text-zinc-500">{p.categoria}</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-gold-400 font-semibold">{p.precio.toFixed(2)} €</span>
                  {enCarrito ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => quitarItem(p.id)}
                        className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center hover:bg-zinc-600 transition-colors"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="text-zinc-100 text-sm w-5 text-center font-medium">{enCarrito.cantidad}</span>
                      <button
                        onClick={() => agregarItem(p)}
                        className="w-7 h-7 rounded-full bg-gold-500 flex items-center justify-center hover:bg-gold-600 transition-colors"
                      >
                        <Plus size={13} className="text-zinc-950" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => agregarItem(p)}
                      className="flex items-center gap-1 px-3 py-1 bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Plus size={12} /> Añadir
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Botón flotante carrito */}
      <button
        onClick={() => setCarritoAbierto(true)}
        className="fixed top-20 right-10 md:top-auto md:bottom-6 md:right-6 z-50 w-14 h-14 bg-gold-500 hover:bg-gold-600 text-zinc-950 rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        <ShoppingCart size={22} />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-950 text-gold-400 text-xs font-bold rounded-full flex items-center justify-center border border-gold-500">
            {totalItems}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {carritoAbierto && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setCarritoAbierto(false)}
        />
      )}

      {/* Drawer carrito */}
      <div
        className={`fixed inset-y-0 right-0 z-30 w-full sm:w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col transition-transform duration-300 ${carritoAbierto ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Cabecera drawer */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center gap-2">
          <ShoppingCart size={18} className="text-gold-400" />
          <h2 className="font-semibold text-zinc-100">Mi pedido</h2>
          {totalItems > 0 && (
            <span className="bg-gold-500 text-zinc-950 text-xs font-bold px-2 py-0.5 rounded-full">{totalItems}</span>
          )}
          <button
            onClick={() => setCarritoAbierto(false)}
            className="ml-auto text-zinc-500 hover:text-zinc-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {pedidoEnviado && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm rounded-lg px-4 py-3 mb-4">
              ¡Pedido enviado! Llega en 10–15 min.
            </div>
          )}
          {items.length === 0 && !pedidoEnviado ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <ShoppingCart size={40} className="text-zinc-700" />
              <p className="text-zinc-500 text-sm">Tu pedido está vacío</p>
              <p className="text-zinc-600 text-xs">Añade productos desde el catálogo</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map(item => (
                <li key={item.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-xl px-3 py-3">
                  <img src={item.img} alt={item.nombre} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-100 font-medium truncate">{item.nombre}</p>
                    <p className="text-xs text-zinc-500">{item.cantidad} × {item.precio.toFixed(2)} €</p>
                  </div>
                  <span className="text-sm text-gold-400 font-semibold shrink-0">
                    {(item.precio * item.cantidad).toFixed(2)} €
                  </span>
                  <button
                    onClick={() => eliminarItem(item.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer con total y botón */}
        {items.length > 0 && (
          <div className="px-4 py-4 border-t border-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <span className="text-zinc-400 text-sm">Total</span>
              <span className="text-zinc-100 font-bold text-xl">{total.toFixed(2)} €</span>
            </div>
            <button
              onClick={() => setModalMesa(true)}
              className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-zinc-950 font-bold rounded-xl transition-colors"
            >
              Enviar pedido
            </button>
          </div>
        )}
      </div>

      {/* Modal número de mesa */}
      {modalMesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalMesa(false)} />
          <form
            onSubmit={handleConfirmarPedido}
            className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-zinc-100 mb-1">¿En qué mesa estás?</h2>
            <p className="text-zinc-500 text-sm mb-6">Introduce el número que aparece en tu mesa.</p>
            <input
              type="number"
              min="1"
              placeholder="Ej. 7"
              value={mesaNumero ?? ''}
              onChange={e => setMesaNumero(Number(e.target.value))}
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-2xl text-center font-bold text-zinc-100 outline-none focus:border-gold-500 transition-colors mb-6"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalMesa(false)}
                className="flex-1 py-2.5 border border-zinc-700 text-zinc-400 hover:bg-zinc-800 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!mesaNumero}
                className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl text-sm transition-colors"
              >
                Confirmar pedido
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
