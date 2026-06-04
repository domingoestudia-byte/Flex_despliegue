# 05 — Autenticación y control de acceso por rol

> **Proyecto Flex** · Stack: Next.js · Supabase · Zustand · Stripe  
> Nivel: Principiante-Intermedio

---

## ¿Qué vamos a construir?

| Qué | Dónde |
|-----|-------|
| Formulario de registro con Supabase Auth | `src/app/register/page.jsx` |
| Formulario de login con redirección | `src/app/login/page.jsx` |
| Botón de logout en el perfil | `src/app/perfil/page.jsx` |
| Store de sesión (usuario + rol) | `src/store/sesionStore.js` |
| Navegación filtrada por rol | `src/components/Shell.jsx` · `src/components/Sidebar.jsx` |

Al terminar, cada usuario verá únicamente las rutas que le corresponden según su rol.

---

## Instalación

```bash
cd apps/web
npm install @supabase/supabase-js @supabase/ssr
```

Variables de entorno necesarias (en `apps/web/.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 1. Clientes de Supabase

Necesitamos dos clientes distintos: uno para el navegador y otro para el servidor (Server Actions, Route Handlers).

### 1.1 Cliente browser

```js
// src/lib/supabase/client.js
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
```

### 1.2 Cliente servidor

```js
// src/lib/supabase/server.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll()          { return cookieStore.getAll() },
        setAll(toSet)     { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )
}
```

> **¿Por qué dos clientes?**  
> El cliente browser corre en el navegador y puede acceder a `localStorage`. El cliente servidor corre en Node.js y necesita leer/escribir cookies HTTP para mantener la sesión. `@supabase/ssr` gestiona esta dualidad por nosotros.

---

## 2. Store de sesión

Creamos un store de Zustand que guarda el usuario autenticado y su rol. Así cualquier componente puede leer el rol sin llamar a Supabase en cada render.

```js
// src/store/sesionStore.js
import { create } from 'zustand'

export const useSesionStore = create((set) => ({
  usuario: null,   // objeto user de Supabase Auth (id, email…)
  rol: null,       // 'cliente' | 'staff' | 'portero' | 'admin'
  cargando: true,  // true mientras comprobamos la sesión al arrancar

  setSesion(usuario, rol) {
    set({ usuario, rol, cargando: false })
  },

  limpiarSesion() {
    set({ usuario: null, rol: null, cargando: false })
  },
}))
```

### Cargar la sesión al arrancar

El layout raíz inicializa el store en cuanto la app monta:

```jsx
// src/app/layout.jsx  (añadir IniciarSesion)
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSesionStore } from '@/store/sesionStore'

export function IniciarSesion() {
  const { setSesion, limpiarSesion } = useSesionStore()

  useEffect(() => {
    const supabase = createClient()

    // Comprueba si ya hay sesión activa
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { limpiarSesion(); return }

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', session.user.id)
        .single()

      setSesion(session.user, perfil?.rol ?? 'cliente')
    })

    // Escucha cambios de sesión (login/logout en otra pestaña)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (evento, session) => {
        if (!session) { limpiarSesion(); return }

        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', session.user.id)
          .single()

        setSesion(session.user, perfil?.rol ?? 'cliente')
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return null  // componente sin UI
}
```

Añade `<IniciarSesion />` dentro del `<body>` del layout, antes del `<Shell>`:

```jsx
// src/app/layout.jsx
import './globals.css'
import Shell from '@/components/Shell'
import { IniciarSesion } from './IniciarSesion'   // o en el mismo archivo

export const metadata = { title: 'Flex — Live Sessions', description: 'Tu noche, tu ritmo' }

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <IniciarSesion />
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
```

> `IniciarSesion` es un Client Component (tiene `useEffect`) pero no tiene UI — actúa como un efecto global que mantiene el store sincronizado con la sesión de Supabase.

---

## 3. Registro (`/register`)

El flujo es:

```
1. Usuario rellena nombre, email, contraseña
2. supabase.auth.signUp()  →  crea fila en auth.users
3. El trigger on_auth_user_created (doc 01) crea la fila en public.perfiles con rol='cliente'
4. Redirige a '/'
```

```jsx
// src/app/register/page.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FlexLogo from '@/components/FlexLogo'
import { createClient } from '@/lib/supabase/client'

export default function PaginaRegister() {
  const router = useRouter()
  const [form, setForm]   = useState({ nombre: '', email: '', password: '', confirmar: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setCargando(true)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options:  { data: { nombre: form.nombre } },  // metadatos para el trigger
    })

    setCargando(false)

    if (authError) { setError(authError.message); return }

    router.push('/')
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — foto */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=1200&auto=format&fit=crop&q=80"
          alt="Flex Club"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-zinc-950/60 to-zinc-950/10" />
        <div className="absolute bottom-12 left-10 right-10">
          <p className="text-white/80 text-xl font-light italic leading-relaxed">
            "Únete a la experiencia<br />más exclusiva de la ciudad."
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 bg-zinc-950">
        <div className="lg:hidden absolute inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&auto=format&fit=crop&q=80"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-10 flex justify-center">
            <FlexLogo className="h-12 w-auto" />
          </div>

          <h1 className="text-2xl font-bold text-zinc-100 mb-1">Crea tu cuenta</h1>
          <p className="text-zinc-500 text-sm mb-8">Empieza a disfrutar de Flex esta noche</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-zinc-500 text-xs block mb-1.5">Nombre completo</label>
              <input
                type="text"
                placeholder="Alex García"
                value={form.nombre}
                onChange={set('nombre')}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs block mb-1.5">Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={set('email')}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs block mb-1.5">Contraseña</label>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={set('password')}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs block mb-1.5">Confirmar contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirmar}
                onChange={set('confirmar')}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500 transition-colors"
              />
            </div>

            <p className="text-zinc-600 text-xs pt-1">
              Al registrarte aceptas los{' '}
              <a href="#" className="text-gold-500 hover:text-gold-400">Términos y condiciones</a>
              {' '}y la{' '}
              <a href="#" className="text-gold-500 hover:text-gold-400">Política de privacidad</a>.
            </p>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl transition-colors"
            >
              {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-8">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-gold-400 hover:text-gold-300 font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

## 4. Login (`/login`)

```
1. Usuario introduce email y contraseña
2. supabase.auth.signInWithPassword()
3. onAuthStateChange (del layout) actualiza el store con usuario + rol
4. Redirige según rol
```

```jsx
// src/app/login/page.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FlexLogo from '@/components/FlexLogo'
import { createClient } from '@/lib/supabase/client'

const RUTA_POR_ROL = {
  cliente: '/',
  staff:   '/staff',
  portero: '/porteros',
  admin:   '/admin',
}

export default function PaginaLogin() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setCargando(false)
      setError('Email o contraseña incorrectos.')
      return
    }

    // Obtener rol para redirigir a la ruta correcta
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    const rol = perfil?.rol ?? 'cliente'
    router.push(RUTA_POR_ROL[rol] ?? '/')
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — foto */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80"
          alt="Ambiente Flex"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-zinc-950/60 to-zinc-950/10" />
        <div className="absolute bottom-12 left-10 right-10">
          <p className="text-white/80 text-xl font-light italic leading-relaxed">
            "La noche que siempre<br />quisiste vivir."
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 bg-zinc-950">
        <div className="lg:hidden absolute inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-10 flex justify-center">
            <FlexLogo className="h-12 w-auto" />
          </div>

          <h1 className="text-2xl font-bold text-zinc-100 mb-1">Bienvenido de nuevo</h1>
          <p className="text-zinc-500 text-sm mb-8">Accede a tu cuenta Flex</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-zinc-500 text-xs block mb-1.5">Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs block mb-1.5">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500 transition-colors"
              />
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-xs text-gold-500 hover:text-gold-400">¿Olvidaste tu contraseña?</a>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl transition-colors mt-2"
            >
              {cargando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-8">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-gold-400 hover:text-gold-300 font-medium">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

## 5. Logout en `/perfil`

Añadimos un botón de cerrar sesión en la tab **Seguridad** de `src/app/perfil/page.jsx`. Al pulsar, llamamos a `supabase.auth.signOut()` y redirigimos a `/login`.

```jsx
// src/app/perfil/page.jsx  (fragmento — tab seguridad, zona de peligro)
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSesionStore } from '@/store/sesionStore'

// Dentro del componente PaginaPerfil:
const router = useRouter()
const { limpiarSesion } = useSesionStore()

async function handleLogout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  limpiarSesion()
  router.push('/login')
}

// En la zona de peligro (tab seguridad), sustituir el botón "Cerrar sesión" actual:
<button
  onClick={handleLogout}
  className="flex items-center gap-2 px-4 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl text-sm transition-colors"
>
  <LogOut size={15} />
  Cerrar sesión
</button>
```

---

## 6. Guardia de autenticación

Cualquier ruta que no sea `/login` ni `/register` requiere sesión activa. La guardia vive en `Shell.jsx`, que envuelve toda la app.

```jsx
// src/components/Shell.jsx  (dentro de export default function Shell)
const { usuario, cargando } = useSesionStore()

useEffect(() => {
  if (!cargando && !usuario && !AUTH_ROUTES.includes(pathname)) {
    router.replace('/login')
  }
}, [cargando, usuario, pathname])

if (AUTH_ROUTES.includes(pathname)) return <>{children}</>

// Mientras resuelve la sesión o no hay usuario: no renderizar nada
if (cargando || !usuario) return null
```

**¿Por qué `return null` y no un spinner?**

Si renderizas el contenido protegido durante `cargando` y luego redirige, el usuario ve un flash de la pantalla privada. Con `null` no aparece nada hasta que se confirma la sesión.

**Flujo completo:**

```text
App monta → cargando: true → Shell devuelve null (pantalla en blanco)
                ↓
         IniciarSesion consulta Supabase
                ↓
      ┌─────────────────────────┐
      │ Hay sesión              │  Sin sesión
      ↓                         ↓
  setSesion()             limpiarSesion()
  cargando: false         cargando: false
  Shell renderiza         Shell detecta !usuario
  la app normal           → router.replace('/login')
```

> `AUTH_ROUTES = ['/login', '/register']` — estas dos rutas son las únicas que se renderizan sin comprobar la sesión.

---

## 7. Control de acceso por rol

### Tabla de visibilidad

| Ruta | cliente | staff | portero | admin |
|------|:-------:|:-----:|:-------:|:-----:|
| `/` (Pedir) | ✅ | ❌ | ❌ | ✅ |
| `/vip` | ✅ | ❌ | ❌ | ✅ |
| `/mi-area` | ✅ | ❌ | ❌ | ✅ |
| `/perfil` | ✅ | ✅ | ✅ | ✅ |
| `/staff` | ❌ | ✅ | ❌ | ✅ |
| `/porteros` | ❌ | ❌ | ✅ | ✅ |
| `/admin` | ❌ | ❌ | ❌ | ✅ |

### Función helper

Creamos una función pura que recibe el rol y devuelve qué grupos de navegación mostrar:

```js
// src/lib/navPorRol.js

export const NAV_CLIENTE = [
  { label: 'Pedir',     href: '/' },
  { label: 'Salas VIP', href: '/vip' },
  { label: 'Mi área',   href: '/mi-area' },
]

export const NAV_GESTION = [
  { label: 'Staff',    href: '/staff' },
  { label: 'Porteros', href: '/porteros' },
  { label: 'Admin',    href: '/admin' },
]

// Devuelve los items visibles para un rol concreto
export function navParaRol(rol) {
  if (rol === 'admin') {
    return { cliente: NAV_CLIENTE, gestion: NAV_GESTION }
  }
  if (rol === 'staff') {
    return { cliente: [], gestion: NAV_GESTION.filter(i => i.href === '/staff') }
  }
  if (rol === 'portero') {
    return { cliente: [], gestion: NAV_GESTION.filter(i => i.href === '/porteros') }
  }
  // cliente (default)
  return { cliente: NAV_CLIENTE, gestion: [] }
}
```

### Aplicar en `Shell.jsx`

`Shell.jsx` gestiona la barra inferior móvil. Leemos el rol del store y filtramos:

```jsx
// src/components/Shell.jsx  (fragmento relevante)
import { useSesionStore } from '@/store/sesionStore'
import { navParaRol } from '@/lib/navPorRol'
import {
  ShoppingCart, Crown, User, UserCircle,
  ShieldCheck, QrCode, LayoutDashboard, LayoutGrid, X,
} from 'lucide-react'

// Mapa href → icono (único lugar donde están los iconos)
const ICONOS = {
  '/':         ShoppingCart,
  '/vip':      Crown,
  '/mi-area':  User,
  '/perfil':   UserCircle,
  '/staff':    ShieldCheck,
  '/porteros': QrCode,
  '/admin':    LayoutDashboard,
}

function BottomNav() {
  const pathname = usePathname()
  const [gestionAbierta, setGestionAbierta] = useState(false)
  const rol = useSesionStore((s) => s.rol) ?? 'cliente'
  const { cliente: navCliente, gestion: navGestion } = navParaRol(rol)

  // Añadir iconos a los items
  const itemsCliente  = navCliente.map(i => ({ ...i, icon: ICONOS[i.href] }))
  const itemsGestion  = navGestion.map(i => ({ ...i, icon: ICONOS[i.href] }))
  const hayGestion    = itemsGestion.length > 0
  const gestionActiva = itemsGestion.some(i => i.href === pathname)

  return (
    <>
      {/* Panel gestión — solo si el rol tiene items de gestión */}
      {hayGestion && gestionAbierta && (
        <>
          <div className="lg:hidden fixed inset-0 z-30" onClick={() => setGestionAbierta(false)} />
          <div className="lg:hidden fixed bottom-20 inset-x-4 z-40 bg-zinc-900 border border-zinc-700 rounded-2xl p-2 shadow-2xl">
            <p className="text-zinc-600 text-xs font-semibold uppercase tracking-wider px-3 py-2">Gestión</p>
            <div className="grid grid-cols-3 gap-1">
              {itemsGestion.map(({ icon: Icon, label, href }) => {
                const activo = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setGestionAbierta(false)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${
                      activo ? 'bg-gold-500/20 text-gold-400' : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-[11px] font-medium">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 flex items-end">
        {/* Items de cliente */}
        {itemsCliente.map(({ icon: Icon, label, href }) => {
          const activo = pathname === href
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center py-3 gap-1">
              <Icon size={21} className={activo ? 'text-gold-400' : 'text-zinc-600'} />
              <span className={`text-[10px] font-medium ${activo ? 'text-gold-400' : 'text-zinc-600'}`}>{label}</span>
            </Link>
          )
        })}

        {/* Botón de perfil — siempre visible */}
        <Link href="/perfil" className="flex-1 flex flex-col items-center py-3 gap-1">
          <UserCircle size={21} className={pathname === '/perfil' ? 'text-gold-400' : 'text-zinc-600'} />
          <span className={`text-[10px] font-medium ${pathname === '/perfil' ? 'text-gold-400' : 'text-zinc-600'}`}>Perfil</span>
        </Link>

        {/* Botón gestión — solo si el rol tiene acceso */}
        {hayGestion && (
          <button
            onClick={() => setGestionAbierta(v => !v)}
            className="flex-1 flex flex-col items-center -translate-y-3 gap-1"
          >
            <span className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              gestionActiva || gestionAbierta ? 'bg-gold-500' : 'bg-zinc-800 hover:bg-zinc-700'
            }`}>
              {gestionAbierta
                ? <X size={22} className={gestionActiva || gestionAbierta ? 'text-zinc-950' : 'text-zinc-300'} />
                : <LayoutGrid size={22} className={gestionActiva || gestionAbierta ? 'text-zinc-950' : 'text-zinc-300'} />
              }
            </span>
            <span className={`text-[10px] font-medium ${gestionActiva || gestionAbierta ? 'text-gold-400' : 'text-zinc-600'}`}>
              Gestión
            </span>
          </button>
        )}
      </nav>
    </>
  )
}
```

### Aplicar en `Sidebar.jsx`

El sidebar desktop sigue el mismo patrón:

```jsx
// src/components/Sidebar.jsx  (fragmento — dentro del componente Sidebar)
import { useSesionStore } from '@/store/sesionStore'
import { navParaRol } from '@/lib/navPorRol'
import { ShoppingCart, Crown, User, ShieldCheck, QrCode, LayoutDashboard } from 'lucide-react'

const ICONOS = {
  '/':         ShoppingCart,
  '/vip':      Crown,
  '/mi-area':  User,
  '/staff':    ShieldCheck,
  '/porteros': QrCode,
  '/admin':    LayoutDashboard,
}

// Dentro de export default function Sidebar():
const rol = useSesionStore((s) => s.rol) ?? 'cliente'
const { cliente: navCliente, gestion: navGestion } = navParaRol(rol)

const itemsCliente = navCliente.map(i => ({ ...i, icon: ICONOS[i.href] }))
const itemsGestion = navGestion.map(i => ({ ...i, icon: ICONOS[i.href] }))

// En el JSX:
<nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
  {itemsCliente.length > 0 && (
    <NavGroup title="Cliente" items={itemsCliente} pathname={pathname} />
  )}
  {itemsGestion.length > 0 && (
    <NavGroup title="Gestión" items={itemsGestion} pathname={pathname} />
  )}
</nav>
```

---

## 7. Diagrama de flujo completo

```
Usuario abre la app
       │
       ▼
IniciarSesion (layout)
  ├── Sin sesión → store: { usuario: null, rol: null }
  │     └── Shell redirige a /login si la ruta requiere auth
  └── Con sesión → consulta perfiles.rol → store: { usuario, rol }
        │
        ├── rol = 'cliente'  → ve Pedir + VIP + Mi área + Perfil
        ├── rol = 'staff'    → ve Staff + Perfil
        ├── rol = 'portero'  → ve Porteros + Perfil
        └── rol = 'admin'    → ve todo
```

### Implementación actual del diagrama

- `src/app/IniciarSesion.jsx`
  - crea el cliente con `createBrowserClient`
  - llama `supabase.auth.getSession()`
  - si hay sesión, carga `rol` desde `perfiles` y actualiza el store
  - escucha cambios de sesión con `supabase.auth.onAuthStateChange`

- `src/components/Shell.jsx`
  - si la ruta es `/login` o `/register`: renderiza el contenido público
  - si `cargando || !usuario`: devuelve `null` para evitar flashes
  - si el usuario no está logueado y la ruta es privada: redirige a `/login`
  - si el usuario está logueado y visita una ruta no permitida por su rol: redirige a la ruta por rol

- `src/components/Sidebar.jsx`
  - lee `rol` desde `useSesionStore()`
  - filtra los items de navegación por `roles` permitidos
  - muestra solo los enlaces que puede ver el usuario actual

- `src/app/login/page.jsx`
  - tras login obtiene el rol desde `perfiles`
  - redirige según `RUTA_POR_ROL[rol]`

- `src/app/register/page.jsx`
  - tras registro redirige a `/login?registered=1`
  - el login muestra un aviso de cuenta creada

### Rutas permitidas por rol en la implementación actual

- cliente: `/`, `/vip`, `/mi-area`, `/perfil`
- staff: `/staff`, `/perfil`
- portero: `/porteros`, `/perfil`
- admin: todas las rutas

---

## 8. Proteger rutas en el servidor (opcional pero recomendado)

Para evitar que alguien acceda a `/admin` tecleando la URL directamente, añade la comprobación en el componente de servidor de cada ruta restringida:

```jsx
// src/app/admin/page.jsx  (cabecera del archivo)
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PaginaAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin') redirect('/')

  // ... resto del componente
}
```

Aplica el mismo patrón en `/staff` (permite `staff` y `admin`), `/porteros` (permite `portero` y `admin`).

> **¿Por qué también en el servidor?** El control de navegación en `Shell` y `Sidebar` oculta los enlaces, pero no bloquea las URLs. Un usuario malintencionado puede escribir `/admin` directamente. La comprobación en el servidor es la defensa real; la del cliente es solo UX.

---

## Resumen de archivos nuevos/modificados

| Archivo | Estado | Qué hace |
|---------|--------|----------|
| `src/lib/supabase/client.js` | **Nuevo** | Cliente Supabase para el navegador |
| `src/lib/supabase/server.js` | **Nuevo** | Cliente Supabase para Server Actions |
| `src/lib/navPorRol.js` | **Nuevo** | Devuelve los items de nav según el rol |
| `src/store/sesionStore.js` | **Nuevo** | Store Zustand con usuario + rol |
| `src/app/layout.jsx` | **Modificar** | Añadir `<IniciarSesion />` |
| `src/app/register/page.jsx` | **Modificar** | Conectar con `supabase.auth.signUp` |
| `src/app/login/page.jsx` | **Modificar** | Conectar con `supabase.auth.signInWithPassword` |
| `src/app/perfil/page.jsx` | **Modificar** | Añadir botón de logout |
| `src/components/Shell.jsx` | **Modificar** | Filtrar nav por rol desde el store |
| `src/components/Sidebar.jsx` | **Modificar** | Filtrar nav por rol desde el store |

---

## Reto Flex 🎸

1. Añade una **pantalla de carga** (`cargando === true` en el store) que muestre un spinner centrado mientras `IniciarSesion` resuelve la sesión inicial, en lugar de renderizar el contenido sin saber si el usuario está autenticado.

2. Implementa la redirección automática en `Shell`: si `usuario === null` y la ruta no es `/login` ni `/register`, redirige a `/login` usando `useRouter`.

3. Modifica la política RLS de `perfiles` para que el trigger `on_auth_user_created` tome el nombre del campo `raw_user_meta_data->>'nombre'` y lo inserte automáticamente en `perfiles.nombre`.

---

## Navegación

[← 04 — Estado con Zustand](./04-estado-con-zustand.md) · [06 — PWA y entradas QR →](./06-pwa-y-entradas-qr.md)
