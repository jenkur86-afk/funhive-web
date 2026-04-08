import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Client-side Supabase client (for use in browser/React components)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (for use in API routes and server components)
// Uses the service role key which bypasses RLS - never expose to client
export function createServerClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}
