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
    let subscription

    try {
      const supabase = createClient()

      supabase.auth
        .getSession()
        .then(async ({ data: { session } }) => {
          if (!session) {
            limpiarSesion()
            return
          }

          const rol = await obtenerRol(supabase, session.user.id)
          setSesion(session.user, rol)
        })
        .catch(() => {
          // Si Supabase falla (p. ej. emulador local caído), desbloqueamos
          // el Shell para que pueda redirigir a /login en lugar de quedar
          // cargando eternamente.
          limpiarSesion()
        })

      const { data } = supabase.auth.onAuthStateChange(async (_evento, session) => {
        if (!session) {
          limpiarSesion()
          return
        }

        try {
          const rol = await obtenerRol(supabase, session.user.id)
          setSesion(session.user, rol)
        } catch {
          limpiarSesion()
        }
      })

      subscription = data.subscription
    } catch {
      // Si ni siquiera createClient() es capaz de inicializarse, salimos
      // de cargando para que el Shell redirija a /login.
      limpiarSesion()
    }

    return () => subscription?.unsubscribe()
  }, [limpiarSesion, setSesion])

  return null
}
