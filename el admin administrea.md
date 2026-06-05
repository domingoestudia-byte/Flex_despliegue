Para que el administrador pueda gestionar usuarios (editar rol, borrar de auth) desde la página `/admin`, necesitas tocar **3 capas**. Te explico cada una:

---

## 1. 🗄️ Backend — Server Actions (`src/lib/actions/usuarios.js`)

Las **server actions** son funciones asíncronas que se ejecutan en el servidor. Necesitas crear estas funciones:

```js
'use server'
import { createClient } from '@/lib/supabase/server'

// Obtener todos los usuarios con su perfil
export async function getUsuarios() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')          // tu tabla de perfiles con el campo 'rol'
    .select('*')
  if (error) throw new Error(error.message)
  return data
}

// Cambiar el rol de un usuario
export async function editarRol(usuarioId, nuevoRol) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('perfiles')
    .update({ rol: nuevoRol })
    .eq('id', usuarioId)
  if (error) throw new Error(error.message)
}

// Borrar usuario (de auth Y de perfiles)
export async function borrarUsuario(usuarioId) {
  const supabase = await createClient()
  
  // 1. Borrar de la tabla perfiles
  await supabase.from('perfiles').delete().eq('id', usuarioId)
  
  // 2. Borrar de auth (requiere service_role, ver nota abajo)
  // ⚠️ Esto NO funciona con la anon key, necesitas service_role
}
```

**⚠️ Importante:** Para borrar de `auth.users`, necesitas la **service_role key** (no la anon key). Tienes dos opciones:
- **Opción A:** Usar una Edge Function de Supabase que tenga la service_role key
- **Opción B:** Crear un usuario admin en Supabase y usar `supabase.auth.admin.deleteUser(usuarioId)` — esto requiere configurar la service_role key en el servidor

---

## 2. 🎨 Frontend — Componente `AdminUsuarios.jsx`

En tu componente de pestaña de usuarios, necesitas:

```jsx
// Para cada fila de usuario, agregar botones:
<button onClick={() => cambiarRol(usuario.id, 'admin')}>Admin</button>
<button onClick={() => cambiarRol(usuario.id, 'staff')}>Staff</button>
<button onClick={() => cambiarRol(usuario.id, 'cliente')}>Cliente</button>
<button onClick={() => confirmarBorrado(usuario.id)}>🗑️ Borrar</button>
```

El flujo del usuario sería:
1. **Cambiar rol** → llama a `editarRol()` → se actualiza en `perfiles` → la UI se refresca
2. **Borrar usuario** → muestra un `confirm()` de JavaScript → si confirma, llama a `borrarUsuario()` → se elimina de `perfiles` y `auth.users`

---

## 3. 🔐 Seguridad — RLS Policies

En tu migración de SQL, necesitas que **solo los admins** puedan hacer estas operaciones:

```sql
-- Solo admins pueden ver todos los perfiles
CREATE POLICY "admin: ver todos los perfiles"
  ON public.perfiles FOR SELECT
  USING ( public.mi_rol() = 'admin' );

-- Solo admins pueden modificar perfiles
CREATE POLICY "admin: editar perfiles"
  ON public.perfiles FOR UPDATE
  USING ( public.mi_rol() = 'admin' );

-- Solo admins pueden borrar perfiles
CREATE POLICY "admin: borrar perfiles"
  ON public.perfiles FOR DELETE
  USING ( public.mi_rol() = 'admin' );
```

---

## 📋 Resumen del flujo

```
Página /admin → Pestaña "Usuarios"
  ├── Carga la lista de usuarios (getUsuarios)
  ├── Botón "Rol" → dropdown con opciones → editarRol() → refresca lista
  └── Botón "Borrar" → confirm() → borrarUsuario() → refresca lista
```

¿Te gustaría que te ayude con alguna de estas partes en concreto, o prefieres intentarlo tú siguiendo estos pasos?


Implementación completa de la gestión de usuarios desde el admin. Archivos creados/modificados:

**Archivos nuevos:**
- `apps/web/src/lib/supabase/admin.js` — Cliente Supabase con service_role para operaciones admin
- `apps/web/src/lib/actions/usuarios.js` — Server actions: `getUsuarios()`, `editarRol()`, `borrarUsuario()`

**Archivos modificados:**
- `apps/web/.env.local` — Añadida `SUPABASE_SERVICE_ROLE_KEY`
- `apps/web/src/app/admin/page.jsx` — Carga usuarios reales desde auth + perfiles
- `apps/web/src/components/admin/AdminClient.jsx` — Recibe `usuariosIniciales` del servidor
- `apps/web/src/components/admin/TabUsuarios.jsx` — Reescrito con server actions reales

**Cómo funciona:**
1. **Listar usuarios** → `getUsuarios()` combina `auth.users` (email) con `perfiles` (nombre, rol) usando `service_role`
2. **Cambiar rol** → Click en el badge del rol → dropdown con opciones (cliente/staff/admin/portero) → `editarRol()` actualiza `perfiles.rol`
3. **Borrar usuario** → Botón 🗑️ → `confirm()` → `borrarUsuario()` elimina de `auth.users` (cascade borra `perfiles`)

**IMPORTANTE:** Reinicia el servidor de desarrollo (`npm run dev`) para que la nueva variable `SUPABASE_SERVICE_ROLE_KEY` se cargue correctamente.