'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSesionStore } from '@/store/sesionStore'

async function obtenerRol(supabase, usuarioId) {
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', usuarioId)
    .single()

  return perfil?.rol ?? 'cliente'
}

export default function IniciarSesion() {
  const { setSesion, limpiarSesion } = useSesionStore()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        limpiarSesion()
        return
      }

      const rol = await obtenerRol(supabase, session.user.id)
      setSesion(session.user, rol)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_evento, session) => {
      if (!session) {
        limpiarSesion()
        return
      }

      const rol = await obtenerRol(supabase, session.user.id)
      setSesion(session.user, rol)
    })

    return () => subscription.unsubscribe()
  }, [limpiarSesion, setSesion])

  return null
}
