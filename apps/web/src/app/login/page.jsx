'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FlexLogo from '@/components/FlexLogo'
import { createClient } from '@/lib/supabase/client'

const RUTA_POR_ROL = {
  cliente: '/',
  staff: '/staff',
  portero: '/porteros',
  admin: '/admin',
}

export default function PaginaLogin() {
  const router = useRouter()
  const [registroExitoso, setRegistroExitoso] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRegistroExitoso(params.get('registered') === '1')
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setCargando(false)
      setError('Email o contrasena incorrectos.')
      return
    }

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
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80"
          alt="Ambiente Flex"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-zinc-950/60 to-zinc-950/10" />
        <div className="absolute bottom-12 left-10 right-10">
          <p className="text-white/80 text-xl font-light italic leading-relaxed">
            &quot;La noche que siempre<br />quisiste vivir.&quot;
          </p>
        </div>
      </div>

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

          {registroExitoso && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-xl px-4 py-3 mb-4">
              Cuenta creada correctamente. Ahora inicia sesión.
            </div>
          )}
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
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs block mb-1.5">Contrasena</label>
              <input
                type="password"
                placeholder="Minimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500 transition-colors"
              />
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-xs text-gold-500 hover:text-gold-400">Olvidaste tu contrasena?</a>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl transition-colors mt-2"
            >
              {cargando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-8">
            No tienes cuenta?{' '}
            <Link href="/register" className="text-gold-400 hover:text-gold-300 font-medium">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
