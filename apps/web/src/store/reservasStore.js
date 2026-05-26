// src/store/reservaStore.js
import { create } from 'zustand'

export const useReservaStore = create((set, get) => ({
  salaId: null,        // id entero de salas_vip en BD (null si no hay selección)
  fecha: '',           // string 'YYYY-MM-DD'
  hora: '',            // string 'HH:MM'  (ej. '22:00')
  duracion: '',        // string con número de horas (ej. '2 horas')

  setSala(salaId) {
    set({ salaId })
  },

  setFecha(fecha) {
    set({ fecha })
  },

  setHora(hora) {
    set({ hora })
  },

  setDuracion(duracion) {
    set({ duracion })
  },

  resetReserva() {
    set({ salaId: null, fecha: '', hora: '', duracion: '' })
  },

  // Devuelve los timestamps 'inicio' y 'fin' listos para insertar en BD.
  // Retorna null si faltan campos.
  getTimestamps() {
    const { fecha, hora, duracion } = get()
    if (!fecha || !hora || !duracion) return null
    const horas = parseInt(duracion)   // '2 horas' → 2
    const inicio = new Date(`${fecha}T${hora}:00`)
    const fin = new Date(inicio.getTime() + horas * 60 * 60 * 1000)
    return { inicio: inicio.toISOString(), fin: fin.toISOString() }
  },
}))