'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Obtiene todos los usuarios con su perfil.
 * Combina auth.users (email) con perfiles (nombre, rol).
 */
export async function getUsuarios() {
  const admin = createAdminClient()

  // 1. Obtener todos los usuarios de auth
  const { data: { users }, error: authError } = await admin.auth.admin.listUsers()
  if (authError) throw new Error(authError.message)

  // 2. Obtener todos los perfiles
  const { data: perfiles, error: perfilesError } = await admin
    .from('perfiles')
    .select('id, nombre, rol, avatar_url')
  if (perfilesError) throw new Error(perfilesError.message)

  // 3. Cruzar auth.users con perfiles
  const perfilMap = new Map(perfiles.map(p => [p.id, p]))

  return users.map(u => {
    const perfil = perfilMap.get(u.id)
    return {
      id: u.id,
      email: u.email,
      nombre: perfil?.nombre || u.user_metadata?.nombre || u.user_metadata?.full_name || 'Sin nombre',
      rol: perfil?.rol || 'cliente',
      activo: !u.banned_until,
      creado_en: u.created_at,
    }
  })
}

/**
 * Cambia el rol de un usuario en la tabla perfiles.
 */
export async function editarRol(usuarioId, nuevoRol) {
  const admin = createAdminClient()

  const { error } = await admin
    .from('perfiles')
    .update({ rol: nuevoRol })
    .eq('id', usuarioId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

/**
 * Borrar usuario: elimina de auth.users (cascada borra perfiles).
 */
export async function borrarUsuario(usuarioId) {
  const admin = createAdminClient()

  const { error } = await admin.auth.admin.deleteUser(usuarioId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}