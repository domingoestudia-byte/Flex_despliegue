'use client'

import { useState } from 'react'
import { QrCode, CheckCircle, XCircle, Search } from 'lucide-react'

const ENTRADAS_VALIDADAS = [
  { id: 1, codigo: 'FLEX-2C7B', nombre: 'Alex García', tipo: 'Pista Principal', hora: '23:01', ok: true },
  { id: 2, codigo: 'FLEX-9A3F', nombre: 'María López', tipo: 'Zona VIP', hora: '23:04', ok: true },
  { id: 3, codigo: 'FLEX-4D8X', nombre: 'Pedro Gil', tipo: 'Pista Principal', hora: '23:09', ok: false },
  { id: 4, codigo: 'FLEX-7E2Q', nombre: 'Sara Martín', tipo: 'Pista Principal', hora: '23:15', ok: true },
]

export default function PaginaPorteros() {
  const [codigo, setCodigo] = useState('')
  const [resultado, setResultado] = useState(null)
  const [historial, setHistorial] = useState(ENTRADAS_VALIDADAS)

  function escanear() {
    if (!codigo.trim()) return
    const valido = codigo.startsWith('FLEX-') && codigo.length === 9
    const entrada = {
      id: Date.now(),
      codigo: codigo.toUpperCase(),
      nombre: valido ? 'Cliente verificado' : 'Desconocido',
      tipo: valido ? 'Pista Principal' : '—',
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      ok: valido,
    }
    setResultado(entrada)
    setHistorial(prev => [entrada, ...prev])
    setTimeout(() => setResultado(null), 4000)
    setCodigo('')
  }


  // solo enseñale esto al que tenga rol = 'portero' y si no, lo devuelves a la pagina principal route.push('/')
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Panel de Porteros</h1>
        <p className="text-zinc-500 text-sm mt-1">Validación de entradas en puerta</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scanner */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center gap-6">
            <div className="w-48 h-48 bg-zinc-800 rounded-2xl flex items-center justify-center border-2 border-dashed border-zinc-700">
              <QrCode size={80} className="text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm text-center">
              Apunta la cámara al código QR<br />de la entrada del cliente
            </p>
            <div className="w-full flex gap-2">
              <input
                placeholder="Código manual (ej. FLEX-2C7B)"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && escanear()}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500"
              />
              <button
                onClick={escanear}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-zinc-950 text-sm font-semibold rounded-lg"
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className={`rounded-2xl border p-6 flex items-center gap-4 ${resultado.ok
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-red-500/10 border-red-500/40'
              }`}>
              {resultado.ok
                ? <CheckCircle size={40} className="text-emerald-400 shrink-0" />
                : <XCircle size={40} className="text-red-400 shrink-0" />
              }
              <div>
                <p className={`text-xl font-bold ${resultado.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                  {resultado.ok ? 'ENTRADA VÁLIDA' : 'ENTRADA INVÁLIDA'}
                </p>
                <p className="text-zinc-300 text-sm mt-0.5">{resultado.nombre}</p>
                <p className="text-zinc-500 text-xs">{resultado.tipo} · {resultado.codigo}</p>
              </div>
            </div>
          )}
        </div>

        {/* Historial */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Últimas validaciones</h2>
          <div className="space-y-2">
            {historial.map(e => (
              <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-4">
                {e.ok
                  ? <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                  : <XCircle size={18} className="text-red-400 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-100 text-sm font-medium truncate">{e.nombre}</p>
                  <p className="text-zinc-500 text-xs">{e.tipo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-zinc-500 text-xs font-mono">{e.codigo}</p>
                  <p className="text-zinc-600 text-xs">{e.hora}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
