'use client'

import { useState } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import { editarRol, borrarUsuario, getUsuarios } from '@/lib/actions/usuarios'

const ROLES = ['cliente', 'staff', 'admin', 'portero']

const ROL_COLOR = {
  cliente: 'bg-blue-500/20 text-blue-400',
  staff:   'bg-amber-500/20 text-amber-400',
  admin:   'bg-red-500/20 text-red-400',
  portero: 'bg-purple-500/20 text-purple-400',
}

export default function TabUsuarios({ usuarios, onUsuariosChange }) {
  const [cargando, setCargando] = useState(null) // id del usuario en operación
  const [menuAbierto, setMenuAbierto] = useState(null) // id del usuario con dropdown abierto

  async function handleEditarRol(usuarioId, nuevoRol) {
    setMenuAbierto(null)
    setCargando(usuarioId)
    try {
      await editarRol(usuarioId, nuevoRol)
      // Actualizar estado local
      const actualizados = usuarios.map(u =>
        u.id === usuarioId ? { ...u, rol: nuevoRol } : u
      )
      onUsuariosChange?.(actualizados)
    } catch (e) {
      console.error('Error al cambiar rol:', e.message)
      alert('No se pudo cambiar el rol: ' + e.message)
    } finally {
      setCargando(null)
    }
  }

  async function handleBorrar(usuarioId, nombre) {
    if (!confirm(`¿Seguro que quieres borrar a "${nombre}"?\n\nEsto eliminará su cuenta de autenticación permanentemente.`)) return

    setCargando(usuarioId)
    try {
      await borrarUsuario(usuarioId)
      // Actualizar estado local
      const actualizados = usuarios.filter(u => u.id !== usuarioId)
      onUsuariosChange?.(actualizados)
    } catch (e) {
      console.error('Error al borrar:', e.message)
      alert('No se pudo borrar el usuario: ' + e.message)
    } finally {
      setCargando(null)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">Usuarios</h2>
        <button
          onClick={async () => {
            const nuevos = await getUsuarios()
            onUsuariosChange?.(nuevos)
          }}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
        >
          🔄 Refrescar
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
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-zinc-600 text-sm">
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${cargando === u.id ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 text-zinc-100 font-medium">{u.nombre}</td>
                <td className="px-4 py-3 text-zinc-400">{u.email}</td>

                {/* Dropdown de rol */}
                <td className="px-4 py-3 relative">
                  <button
                    onClick={() => setMenuAbierto(menuAbierto === u.id ? null : u.id)}
                    disabled={cargando === u.id}
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors ${ROL_COLOR[u.rol] || 'bg-zinc-700 text-zinc-400'}`}
                  >
                    {u.rol}
                    <ChevronDown size={12} />
                  </button>

                  {menuAbierto === u.id && (
                    <div className="absolute z-10 top-full left-4 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[120px]">
                      {ROLES.map((rol) => (
                        <button
                          key={rol}
                          onClick={() => handleEditarRol(u.id, rol)}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 transition-colors ${u.rol === rol ? 'text-gold-400 font-semibold' : 'text-zinc-300'}`}
                        >
                          {rol}
                        </button>
                      ))}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-500'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>

                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleBorrar(u.id, u.nombre)}
                    disabled={cargando === u.id}
                    className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-30"
                    title="Borrar usuario"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}