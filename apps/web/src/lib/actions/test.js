// lib/actions/test.js
'use server'

export async function testSupabaseConnection() {
  console.log('=== TEST ENV ===')
  console.log('URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  console.log('URL starts with:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20))
  
  try {
    // Intenta un fetch simple a la URL de Supabase
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    })
    console.log('Fetch status:', response.status)
    return { ok: true, status: response.status }
  } catch (err) {
    console.error('Fetch failed:', err.message)
    return { ok: false, error: err.message }
  }
}