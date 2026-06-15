'use server'

export async function testSupabaseConnection() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  console.log('=== URL DEBUG ===')
  console.log('URL:', url)
  console.log('Length:', url?.length)
  console.log('Last 20 chars:', url?.slice(-20))
  console.log('Char codes (last 10):', [...(url || '')].slice(-10).map(c => c.charCodeAt(0)))
  
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  console.log('Key length:', key?.length)
  
  // Prueba con URL hardcodeada para descartar problema de entorno
  const hardcodedUrl = 'https://zuzysqsiusjumcctcpzh.supabase.co'
  
  try {
    const response = await fetch(`${hardcodedUrl}/rest/v1/`, {
      headers: { 'apikey': key },
    })
    console.log('Hardcoded fetch status:', response.status)
    return { 
      ok: true, 
      status: response.status,
      envUrl: url,
      envUrlLength: url?.length,
      hardcodedWorks: true
    }
  } catch (err) {
    console.error('Hardcoded fetch failed:', err.message)
    return { 
      ok: false, 
      error: err.message,
      envUrl: url,
      envUrlLength: url?.length,
      hardcodedWorks: false
    }
  }
}