'use client'

import { X } from 'lucide-react'

export default function ModalUsuario({ formU, setFormU, onCreate, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-zinc-100">Nuevo usuario</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            placeholder="Nombre completo"
            value={formU.nombre}
            onChange={(e) => setFormU((p) => ({ ...p, nombre: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500"
          />
          <input
            placeholder="Email"
            value={formU.email}
            onChange={(e) => setFormU((p) => ({ ...p, email: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500"
          />
          <select
            value={formU.rol}
            onChange={(e) => setFormU((p) => ({ ...p, rol: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold-500"
          >
            {['Cliente', 'Staff', 'Portero', 'Admin'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800">
            Cancelar
          </button>
          <button onClick={onCreate} className="flex-1 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-zinc-950 text-sm font-semibold">
            Crear
          </button>
        </div>
      </div>
    </div>
  )
}
