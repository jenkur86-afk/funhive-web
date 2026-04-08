import { createClient } from '@supabase/supabase-js'

// Server-side only Supabase client for use in Server Components and API routes
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
