import { createClient } from '@/lib/supabase/server'
import AdminClient from '@/components/admin/AdminClient'

export default async function PaginaAdmin() {
  const supabase = await createClient()

  const { data: productos, error } = await supabase
    .from('productos')
    .select('id, nombre, descripcion, precio, categoria, disponible')
    .order('categoria')

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="text-red-400 text-sm">Error al cargar los datos.</p>
      </div>
    )
  }

  return <AdminClient productosIniciales={productos} />
}
