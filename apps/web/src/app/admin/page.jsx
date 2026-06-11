import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from '@/components/admin/AdminClient'

export default async function PaginaAdmin() {
  const supabase = await createClient()

  // Verificar que el usuario esté autenticado y sea admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin') redirect('/')

  const [
    { data: productos, error: errProductos },
    { data: perfiles, error: errPerfiles },
  ] = await Promise.all([
    supabase.from('productos').select('id, nombre, descripcion, precio, categoria, imagen_url, disponible').order('categoria'),
    supabase.from('perfiles').select('id, nombre, rol, avatar_url, activo').order('nombre'),
  ])

  if (errProductos || errPerfiles) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="text-red-400 text-sm">Error al cargar los datos.</p>
      </div>
    )
  }

  return <AdminClient productosIniciales={productos} perfilesIniciales={perfiles} />
}
