'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import ModalUsuario from './ModalUsuario'

const USUARIOS_INIT = [
  { id: 1, nombre: 'Alex García',  email: 'alex@flex.es',   rol: 'Cliente',  activo: true  },
  { id: 2, nombre: 'Sara Martín',  email: 'sara@flex.es',   rol: 'Staff',    activo: true  },
  { id: 3, nombre: 'Carlos Ruiz',  email: 'carlos@flex.es', rol: 'Portero',  activo: true  },
  { id: 4, nombre: 'Laura Pérez',  email: 'laura@flex.es',  rol: 'Cliente',  activo: false },
]

const ROL_COLOR = {
  Cliente: 'bg-blue-500/20 text-blue-400',
  Staff:   'bg-amber-500/20 text-amber-400',
  Portero: 'bg-purple-500/20 text-purple-400',
  Admin:   'bg-red-500/20 text-red-400',
}

export default function TabUsuarios({ onUsuariosChange }) {
  const [usuarios, setUsuarios] = useState(USUARIOS_INIT)
  const [modal, setModal]       = useState(false)
  const [formU, setFormU]       = useState({ nombre: '', email: '', rol: 'Cliente' })

  function crear() {
    if (!formU.nombre || !formU.email) return
    const nuevos = [...usuarios, { id: Date.now(), ...formU, activo: true }]
    setUsuarios(nuevos)
    onUsuariosChange?.(nuevos)
    setFormU({ nombre: '', email: '', rol: 'Cliente' })
    setModal(false)
  }

  function eliminar(id) {
    const nuevos = usuarios.filter((u) => u.id !== id)
    setUsuarios(nuevos)
    onUsuariosChange?.(nuevos)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">Usuarios</h2>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-zinc-950 text-sm font-semibold rounded-lg"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-125">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase">
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="px-4 py-3 text-zinc-100 font-medium">{u.nombre}</td>
                <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_COLOR[u.rol] || 'bg-zinc-700 text-zinc-400'}`}>
                    {u.rol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-500'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => eliminar(u.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalUsuario
          formU={formU}
          setFormU={setFormU}
          onCreate={crear}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  )
}
