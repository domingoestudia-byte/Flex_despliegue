'use server'

export async function testSupabaseConnection() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('=== TEST ENV ===')
  console.log('URL raw:', url)
  console.log('URL type:', typeof url)
  console.log('URL length:', url?.length)
  console.log('KEY raw first 20:', key?.substring(0, 20))
  console.log('KEY type:', typeof key)
  console.log('KEY length:', key?.length)
  
  // Verifica que la URL sea válida
  try {
    const parsed = new URL(url)
    console.log('URL parsed ok:', parsed.hostname)
  } catch (e) {
    console.error('URL parse failed:', e.message)
    return { ok: false, error: 'URL invalida: ' + e.message, url }
  }
  
  // Prueba fetch a Google primero (para saber si el problema es de red general)
  try {
    const googleRes = await fetch('https://www.google.com', { method: 'HEAD' })
    console.log('Google fetch status:', googleRes.status)
  } catch (e) {
    console.error('Google fetch failed:', e.message)
    return { ok: false, error: 'No hay conexion a internet: ' + e.message }
  }
  
  // Prueba fetch a Supabase
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: { 'apikey': key },
    })
    console.log('Supabase fetch status:', response.status)
    return { ok: true, status: response.status }
  } catch (err) {
    console.error('Supabase fetch failed:', err.message)
    return { ok: false, error: err.message, url: url?.substring(0, 30) }
  }
}