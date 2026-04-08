import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client for use in Server Components and API routes
// Uses service role key if available, otherwise falls back to anon key
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseKey)
}
