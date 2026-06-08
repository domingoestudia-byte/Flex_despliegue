// Llama a /api/pagos y devuelve la URL de la página de pago de Stripe
export async function crearCheckout({ tipo, id, items, user }) {
  const resp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/pagos`, {
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

  if (!resp.ok) {
    const err = await resp.json()
    throw new Error(err.error ?? 'Error al crear el checkout')
  }

  const { url } = await resp.json()
  return url
}
