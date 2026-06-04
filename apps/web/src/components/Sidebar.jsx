'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingCart, Crown, User,
  ShieldCheck, QrCode, LayoutDashboard, X,
  Camera, Lock, Bell, Shield, LogOut, CheckCircle, ChevronUp,
} from 'lucide-react'
import { useSesionStore } from '@/store/sesionStore'

const NAV_CLIENTE = [
  { icon: ShoppingCart, label: 'Pedir',     href: '/',        roles: ['cliente', 'admin'] },
  { icon: Crown,        label: 'Salas VIP', href: '/vip',     roles: ['cliente', 'admin'] },
  { icon: User,         label: 'Mi área',   href: '/mi-area', roles: ['cliente', 'admin'] },
]

const NAV_GENERAL = [
  { icon: User,         label: 'Perfil',    href: '/perfil',  roles: ['cliente', 'staff', 'portero', 'admin'] },
]

const NAV_GESTION = [
  { icon: ShieldCheck,     label: 'Panel Staff', href: '/staff',    roles: ['staff', 'admin'] },
  { icon: QrCode,          label: 'Porteros',    href: '/porteros', roles: ['portero', 'admin'] },
  { icon: LayoutDashboard, label: 'Admin',       href: '/admin',    roles: ['admin'] },
]

const TABS_PERFIL = [
  { id: 'personal',       label: 'Personal' },
  { id: 'seguridad',      label: 'Seguridad' },
  { id: 'notificaciones', label: 'Avisos' },
]

function NavGroup({ title, items, pathname, onClose }) {
  return (
    <div className="mb-2">
      <p className="px-3 mb-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider">{title}</p>
      {items.map(({ icon: Icon, label, href }) => {
        const activo = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activo
                ? 'bg-gold-500/20 text-gold-400'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        )
      })}
    </div>
  )
}

function ModalPerfil({ onClose }) {
  const [tab, setTab]       = useState('personal')
  const [guardado, setGuardado] = useState(false)
  const [avatar, setAvatar] = useState(null)

  const [perfil, setPerfil] = useState({
    nombre: 'Alex García', email: 'alex@flex.es',
    telefono: '+34 612 345 678', fechaNac: '1995-08-14',
  })
  const [pass, setPass]   = useState({ actual: '', nueva: '', confirmar: '' })
  const [notifs, setNotifs] = useState({
    pedidos: true, entradas: true, ofertas: false, vip: true, newsletter: false,
  })

  function guardar(e) {
    e.preventDefault()
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gold-500/20 border-2 border-gold-500/40 overflow-hidden flex items-center justify-center">
                {avatar
                  ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold text-gold-400">A</span>
                }
              </div>
              <label className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gold-500 hover:bg-gold-600 rounded-full flex items-center justify-center cursor-pointer transition-colors">
                <Camera size={10} className="text-zinc-950" />
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) setAvatar(URL.createObjectURL(f))
                }} />
              </label>
            </div>
            <div>
              <p className="text-zinc-100 font-semibold text-sm">{perfil.nombre}</p>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Cliente</span>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 px-6 py-3 border-b border-zinc-800 shrink-0">
          {TABS_PERFIL.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tab === t.id ? 'bg-gold-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {guardado && (
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs rounded-xl px-4 py-2.5 mb-4">
              <CheckCircle size={14} /> Cambios guardados
            </div>
          )}

          {/* Personal */}
          {tab === 'personal' && (
            <form onSubmit={guardar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'nombre',    label: 'Nombre',    type: 'text' },
                  { key: 'telefono',  label: 'Teléfono',  type: 'text' },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="text-zinc-500 text-xs block mb-1">{label}</label>
                    <input type={type} value={perfil[key]}
                      onChange={e => setPerfil(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-zinc-500 text-xs block mb-1">Email</label>
                <input type="email" value={perfil.email}
                  onChange={e => setPerfil(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-zinc-500 text-xs block mb-1">Fecha de nacimiento</label>
                <input type="date" value={perfil.fechaNac}
                  onChange={e => setPerfil(p => ({ ...p, fechaNac: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold-500 transition-colors"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-zinc-950 font-bold rounded-xl text-sm transition-colors">
                Guardar cambios
              </button>
            </form>
          )}

          {/* Seguridad */}
          {tab === 'seguridad' && (
            <div className="space-y-4">
              <form onSubmit={guardar} className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={14} className="text-gold-400" />
                  <p className="text-zinc-100 text-sm font-semibold">Cambiar contraseña</p>
                </div>
                {[
                  { key: 'actual',    label: 'Contraseña actual' },
                  { key: 'nueva',     label: 'Nueva contraseña' },
                  { key: 'confirmar', label: 'Confirmar nueva' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-zinc-500 text-xs block mb-1">{label}</label>
                    <input type="password" placeholder="••••••••" value={pass[key]}
                      onChange={e => setPass(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold-500 transition-colors"
                    />
                  </div>
                ))}
                <button type="submit" className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-zinc-950 font-bold rounded-xl text-sm transition-colors">
                  Actualizar contraseña
                </button>
              </form>

              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-gold-400" />
                  <p className="text-zinc-100 text-sm font-semibold">Sesiones activas</p>
                </div>
                {[
                  { dispositivo: 'Chrome · Windows', lugar: 'Madrid, España', activo: true },
                  { dispositivo: 'Safari · iPhone',  lugar: 'Madrid, España', activo: false },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-t border-zinc-800/60 first:border-t-0">
                    <div>
                      <p className="text-zinc-200 text-xs font-medium">{s.dispositivo}</p>
                      <p className="text-zinc-500 text-xs">{s.lugar}</p>
                    </div>
                    {s.activo
                      ? <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Actual</span>
                      : <button className="text-xs text-red-400 hover:text-red-300">Cerrar</button>
                    }
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <LogOut size={14} className="text-red-400" />
                  <p className="text-zinc-100 text-sm font-semibold">Zona de peligro</p>
                </div>
                <button className="w-full py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl text-sm transition-colors">
                  Eliminar cuenta
                </button>
              </div>
            </div>
          )}

          {/* Notificaciones */}
          {tab === 'notificaciones' && (
            <form onSubmit={guardar} className="space-y-0">
              <div className="flex items-center gap-2 mb-4">
                <Bell size={14} className="text-gold-400" />
                <p className="text-zinc-100 text-sm font-semibold">Preferencias de avisos</p>
              </div>
              <div className="divide-y divide-zinc-800">
                {[
                  { key: 'pedidos',    label: 'Estado de pedidos',   desc: 'Cuando tu pedido esté listo' },
                  { key: 'entradas',   label: 'Entradas y reservas', desc: 'Confirmaciones y recordatorios' },
                  { key: 'vip',        label: 'Salas VIP',           desc: 'Disponibilidad y ofertas' },
                  { key: 'ofertas',    label: 'Promociones',         desc: 'Descuentos y eventos' },
                  { key: 'newsletter', label: 'Newsletter',          desc: 'Novedades mensuales' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3.5">
                    <div>
                      <p className="text-zinc-100 text-sm">{label}</p>
                      <p className="text-zinc-500 text-xs">{desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-4 ${notifs[key] ? 'bg-gold-500' : 'bg-zinc-700'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${notifs[key] ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="submit" className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-zinc-950 font-bold rounded-xl text-sm transition-colors mt-4">
                Guardar preferencias
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ onClose }) {
  const pathname = usePathname()
  const { rol } = useSesionStore()
  const clienteItems = NAV_CLIENTE.filter(i => i.roles.includes(rol ?? 'cliente'))
  const gestionItems = NAV_GESTION.filter(i => i.roles.includes(rol ?? 'cliente'))
  const generalItems = NAV_GENERAL.filter(i => i.roles.includes(rol ?? 'cliente'))

  return (
    <aside className="w-64 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="px-6 py-6 border-b border-zinc-800 flex items-center justify-between">
          <FlexLogo className="h-10 w-auto" />
          {onClose && (
            <button onClick={onClose} className="lg:hidden text-zinc-500 hover:text-zinc-100 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
          {clienteItems.length > 0 && (
            <NavGroup title="Cliente" items={clienteItems} pathname={pathname} onClose={onClose} />
          )}
          {gestionItems.length > 0 && (
            <NavGroup title="Gestión" items={gestionItems} pathname={pathname} onClose={onClose} />
          )}
          {generalItems.length > 0 && (
            <NavGroup title="Cuenta" items={generalItems} pathname={pathname} onClose={onClose} />
          )}
        </nav>

        {/* Avatar — navega a perfil */}
        <Link
          href="/perfil"
          onClick={onClose}
          className="px-4 py-4 border-t border-zinc-800 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors w-full text-left group"
        >
          <div className="w-8 h-8 rounded-full bg-gold-500/30 flex items-center justify-center text-gold-400 text-sm font-bold shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">Alex García</p>
            <p className="text-xs text-zinc-500">Cliente</p>
          </div>
          <ChevronUp size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </Link>
    </aside>
  )
}

function FlexLogo({ className = '' }) {
  return (
    <svg viewBox="0 0 160 60" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="FLEX Live Sessions">
      <defs>
        <linearGradient id="sg1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#f0c040" />
          <stop offset="100%" stopColor="#a87010" />
        </linearGradient>
      </defs>
      <text x="2" y="42" fontFamily="Georgia, serif" fontSize="44" fontWeight="bold" fontStyle="italic" fill="url(#sg1)" letterSpacing="1">FLEX</text>
      <line x1="2" y1="48" x2="158" y2="48" stroke="#a87010" strokeWidth="0.7" opacity="0.7" />
      <text x="2" y="58" fontFamily="Georgia, serif" fontSize="9" letterSpacing="4" fill="#c8960c" opacity="0.9">LIVE SESSIONS</text>
    </svg>
  )
}
