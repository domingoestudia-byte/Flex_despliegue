import { createClient } from '@/lib/supabase/server'
import { getUsuarios } from '@/lib/actions/usuarios'
import AdminClient from '@/components/admin/AdminClient'

export default async function PaginaAdmin() {
  const supabase = await createClient()

  const { data: productos, error } = await supabase
    .from('productos')
    .select('id, nombre, descripcion, precio, categoria, disponible')
    .order('categoria')

  // Cargar usuarios reales desde auth + perfiles
  let usuarios = []
  try {
    usuarios = await getUsuarios()
  } catch (e) {
    console.error('Error cargando usuarios:', e.message)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="text-red-400 text-sm">Error al cargar los datos.</p>
      </div>
    )
  }

  return <AdminClient productosIniciales={productos} usuariosIniciales={usuarios} />
}