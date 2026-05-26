// src/store/carritoStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCarritoStore = create(
  persist(
    (set, get) => ({
      items: [],
      mesaNumero: null,   // número visible en la mesa (ej. 7), no el id de BD

      setMesaNumero(numero) {
        set({ mesaNumero: numero })
      },

      agregarItem(producto) {
        set((estado) => {
          const existente = estado.items.find((i) => i.id === producto.id)
          if (existente) {
            return {
              items: estado.items.map((i) =>
                i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
              ),
            }
          }
          return { items: [...estado.items, { ...producto, cantidad: 1 }] }
        })
      },

      quitarItem(productoId) {
        set((estado) => ({
          items: estado.items
            .map((i) => (i.id === productoId ? { ...i, cantidad: i.cantidad - 1 } : i))
            .filter((i) => i.cantidad > 0),
        }))
      },

      eliminarItem(productoId) {
        set((estado) => ({
          items: estado.items.filter((i) => i.id !== productoId),
        }))
      },

      vaciarCarrito() {
        set({ items: [], mesaNumero: null })
      },
    }),
    {
      name: 'flex-carrito',
      // solo persistimos items y mesaNumero; el resto es estado de UI efímero
      partialize: (estado) => ({ items: estado.items, mesaNumero: estado.mesaNumero }),
    }
  )
)