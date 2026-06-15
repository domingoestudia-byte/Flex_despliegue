// Llama a /api/pagos y devuelve la URL de la página de pago de Stripe
export async function crearCheckout({ tipo, id, items, user }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  
  if (!appUrl) {
    throw new Error('Falta NEXT_PUBLIC_APP_URL')
  }

  const resp = await fetch(`${appUrl}/api/pagos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo,
      id,
      items,
      clienteId:    user.id,
      clienteEmail: user.email,
    }),
  })

  const contentType = resp.headers.get('content-type')

  if (!resp.ok) {
    if (!contentType?.includes('application/json')) {
      const text = await resp.text()
      console.error('Error HTML del servidor:', text.substring(0, 500))
      throw new Error(`Error del servidor (${resp.status}): ${text.substring(0, 200)}`)
    }
    
    const err = await resp.json()
    throw new Error(err.error ?? 'Error al crear el checkout')
  }

  if (!contentType?.includes('application/json')) {
    const text = await resp.text()
    console.error('Respuesta inesperada:', text.substring(0, 500))
    throw new Error('El servidor devolvió HTML en lugar de JSON')
  }

  const { url } = await resp.json()
  return url
}