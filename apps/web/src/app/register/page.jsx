'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FlexLogo from '@/components/FlexLogo'
import { createClient } from '@/lib/supabase/client'

export default function PaginaRegister() {
  const router = useRouter()
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmar: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmar) {
      setError('Las contrasenas no coinciden.')
      return
    }

    if (form.password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.')
      return
    }

    setCargando(true)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { nombre: form.nombre } },
    })

    setCargando(false)

    if (authError) {
      setError(authError.message)
      return
    }

    router.push('/login?registered=1')
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=1200&auto=format&fit=crop&q=80"
          alt="Flex Club"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-zinc-950/60 to-zinc-950/10" />
        <div className="absolute bottom-12 left-10 right-10">
          <p className="text-white/80 text-xl font-light italic leading-relaxed">
            &quot;Unete a la experiencia<br />mas exclusiva de la ciudad.&quot;
          </p>
        </div>
      </div>

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
                placeholder="Alex Garcia"
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
              <label className="text-zinc-500 text-xs block mb-1.5">Contrasena</label>
              <input
                type="password"
                placeholder="Minimo 8 caracteres"
                value={form.password}
                onChange={set('password')}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs block mb-1.5">Confirmar contrasena</label>
              <input
                type="password"
                placeholder="Minimo 8 caracteres"
                value={form.confirmar}
                onChange={set('confirmar')}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-gold-500 transition-colors"
              />
            </div>

            <p className="text-zinc-600 text-xs pt-1">
              Al registrarte aceptas los{' '}
              <a href="#" className="text-gold-500 hover:text-gold-400">Terminos y condiciones</a>
              {' '}y la{' '}
              <a href="#" className="text-gold-500 hover:text-gold-400">Politica de privacidad</a>.
            </p>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl transition-colors"
            >
              {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-8">
            Ya tienes cuenta?{' '}
            <Link href="/login" className="text-gold-400 hover:text-gold-300 font-medium">
              Inicia sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
