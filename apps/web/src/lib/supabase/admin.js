import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service_role para operaciones admin
 * que requieren permisos elevados (ej: borrar usuarios de auth).
 * SOLO usar en server actions / server components.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}