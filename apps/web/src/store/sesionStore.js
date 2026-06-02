import { create } from 'zustand'

export const useSesionStore = create((set) => ({
  usuario: null,
  rol: null,
  cargando: true,

  setSesion(usuario, rol) {
    set({ usuario, rol, cargando: false })
  },

  limpiarSesion() {
    set({ usuario: null, rol: null, cargando: false })
  },
}))
