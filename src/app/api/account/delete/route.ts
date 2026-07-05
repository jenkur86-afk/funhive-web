import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// All of user_favorites, reviews, helpful_votes, and user_settings have
// ON DELETE CASCADE from auth.users (see database/schema.sql), so deleting
// the auth user is enough to remove every dependent row.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const accessToken = authHeader?.replace('Bearer ', '')
  if (!accessToken) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
  }

  // Verify the token identifies a real, currently-authenticated user before
  // deleting anything — using the anon client so an expired/forged token fails.
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: userData, error: userError } = await anonClient.auth.getUser(accessToken)
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { error } = await supabase.auth.admin.deleteUser(userData.user.id)
  if (error) {
    console.error('Account deletion error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
