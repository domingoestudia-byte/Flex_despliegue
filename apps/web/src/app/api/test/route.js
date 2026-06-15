import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    stripe: process.env.STRIPE_SECRET_KEY ? 'EXISTS' : 'MISSING',
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'EXISTS' : 'MISSING',
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    stripeKeyFirst10: process.env.STRIPE_SECRET_KEY?.substring(0, 10),
  })
}