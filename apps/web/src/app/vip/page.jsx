import { createClient } from '@/lib/supabase/server'
import VipClient from '@/components/vip/VipClient'

export default async function PaginaVIP() {
  const supabase = await createClient()

  const { data: salas, error } = await supabase
    .from('salas_vip')
    .select('id, nombre, descripcion, capacidad, precio_hora, imagen_url, activa')
    .order('precio_hora')

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="text-red-400 text-sm">Error al cargar las salas.</p>
      </div>
    )
  }

  return <VipClient salas={salas} />
}
